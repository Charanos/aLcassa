import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService } from '@/lib/db/serviceClient';
import { tenantMembers, tenantSettings, tenants, userProfiles } from '@/db/schema';
import { RESERVED_SLUGS } from '../types';

export const finishOAuthSignUpSchema = z.object({
  companyName: z.string().trim().min(1, 'Enter your company name.').max(120),
});

export type FinishOAuthSignUpInput = z.infer<typeof finishOAuthSignUpSchema>;

export type FinishOAuthSignUpResult =
  | { ok: true; tenantId: string; slug: string }
  | {
      ok: false;
      code: 'validation_failed' | 'registration_failed';
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
    const claimed = await asService(
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

        return { tenantId: tenant.id, slug };
      },
    );

    return { ok: true, ...claimed };
  } catch {
    return {
      ok: false,
      code: 'registration_failed',
      message: 'The workspace could not be created. Please try again.',
    };
  }
}
