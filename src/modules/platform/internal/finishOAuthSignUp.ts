import 'server-only';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService } from '@/lib/db/serviceClient';
import { withActorContext } from '@/lib/db';
import { tenantMembers, tenantSettings, tenants, userProfiles, usageCounters } from '@/db/schema';
import { RESERVED_SLUGS } from '../types';

export const finishOAuthSignUpSchema = z.object({
  companyName: z.string().trim().min(1, 'Enter your company name.').max(120),
});

export type FinishOAuthSignUpInput = z.infer<typeof finishOAuthSignUpSchema>;

export type FinishOAuthSignUpResult =
  | {
      ok: true;
      tenantId: string;
      slug: string;
      role: 'owner' | 'admin' | 'agent';
      created: boolean;
    }
  | {
      ok: false;
      code: 'validation_failed' | 'registration_failed' | 'membership_unavailable';
      message: string;
      details?: Array<{ field: string; message: string }>;
    };

function slugStem(companyName: string): string {
  const stem = companyName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');

  if (stem.length < 3 || RESERVED_SLUGS.has(stem)) return 'workspace';
  return stem;
}

async function claimSlug(
  tx: Parameters<Parameters<typeof asService>[1]>[0],
  stem: string,
): Promise<string> {
  for (let attempt = 1; attempt <= 25; attempt += 1) {
    const candidate = attempt === 1 ? stem : `${stem}-${attempt}`;
    const existing = await tx
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, candidate))
      .limit(1);

    if (existing.length === 0) return candidate;
  }

  const random = Math.random().toString(36).slice(2, 8);
  return `${stem}-${random}`;
}

export async function finishOAuthSignUp(
  input: FinishOAuthSignUpInput,
  context: {
    userId: string;
    email: string;
    fullName: string;
    requestId: string;
    ipAddress?: string | null;
  },
): Promise<FinishOAuthSignUpResult> {
  const parsed = finishOAuthSignUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'validation_failed',
      message: 'Some of what was sent is not valid.',
      details: parsed.error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    };
  }

  const { companyName } = parsed.data;
  const { userId: ownerUserId, email, fullName } = context;

  try {
    const claimed = await withActorContext(ownerUserId, context.requestId, async (actorTx) => {
      // Serialize first-time setup and retries for this authenticated identity.
      await actorTx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`oauth-setup:${ownerUserId}`}, 0))`,
      );
      const memberships = await actorTx
        .select({
          tenantId: tenantMembers.tenantId,
          slug: tenants.slug,
          role: tenantMembers.role,
          status: tenantMembers.status,
        })
        .from(tenantMembers)
        .innerJoin(tenants, eq(tenants.id, tenantMembers.tenantId))
        .where(and(eq(tenantMembers.userId, ownerUserId), isNull(tenantMembers.deletedAt)));
      const active = memberships.find((member) => member.status === 'active');
      if (active)
        return {
          tenantId: active.tenantId,
          slug: active.slug,
          role: active.role,
          created: false,
        };
      if (memberships.length) throw new ExistingMembershipError();

      return asService(
        {
          action: AUDIT_ACTIONS.TENANT_SELF_REGISTERED,
          actorUserId: ownerUserId,
          actorLabel: `${fullName} <${email}>`,
          entityType: 'tenant',
          reason: `Self-registered workspace for ${companyName} via OAuth`,
          requestId: context.requestId,
          ipAddress: context.ipAddress ?? null,
        },
        async (tx) => {
          const slug = await claimSlug(tx, slugStem(companyName));

          const [tenant] = await tx
            .insert(tenants)
            .values({
              slug,
              name: companyName,
              status: 'trial',
              provisionedAt: new Date(),
            })
            .returning({ id: tenants.id });

          if (!tenant) throw new Error('The tenant row was not returned after insert.');

          await tx.insert(tenantSettings).values({
            tenantId: tenant.id,
            displayName: companyName,
          });

          await tx
            .insert(userProfiles)
            .values({ id: ownerUserId, fullName, email })
            .onConflictDoNothing();

          await tx.insert(tenantMembers).values({
            tenantId: tenant.id,
            userId: ownerUserId,
            role: 'owner',
            status: 'active',
            joinedAt: sql`now()`,
          });
          await tx
            .insert(usageCounters)
            .values({ tenantId: tenant.id, key: 'seats', currentValue: 1, peakValue: 1 });

          return { tenantId: tenant.id, slug, role: 'owner' as const, created: true };
        },
      );
    });

    return { ok: true, ...claimed };
  } catch (error) {
    if (error instanceof ExistingMembershipError)
      return {
        ok: false,
        code: 'membership_unavailable',
        message: 'Use your existing workspace invitation or contact its owner to restore access.',
      };
    return {
      ok: false,
      code: 'registration_failed',
      message: 'The workspace could not be created. Please try again.',
    };
  }
}

class ExistingMembershipError extends Error {}
