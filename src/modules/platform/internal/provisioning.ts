import 'server-only';
import { eq } from 'drizzle-orm';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService } from '@/lib/db/serviceClient';
import { createSupabaseAdminClient } from '@/lib/auth/supabase/admin';
import { tenantMembers, tenantSettings, tenants, userProfiles } from '@/db/schema';
import {
  provisionTenantSchema,
  type ProvisionTenantInput,
  type ProvisionTenantResult,
} from '../types';

/**
 * 02 §3 · 05 §3 · 06 §5 · 11 §6. PROVISION A TENANT.
 *
 * "Creates tenant, membership and owner in one transaction" — 02 §3. That
 * sentence is the entire specification and every awkward part of this file
 * exists to honour it.
 *
 * ⚠ WHY THIS IS ONE OF THE FOUR LEGITIMATE SERVICE-ROLE OPERATIONS.
 * `serviceClient.ts` lists it first and gives the reason: "the tenant does
 * not exist yet, so no context can resolve to it." There is no session to
 * run as and no tenant to scope to. Every OTHER read of tenant data goes
 * through `withTenantContext` and answers to RLS; this one cannot, which is
 * exactly why it is audited before it runs rather than after.
 *
 * ⚠ THE ONE THING THAT IS NOT TRANSACTIONAL, STATED PLAINLY.
 *
 * The auth user lives in Supabase's `auth.users`, reachable only over HTTP.
 * A Postgres transaction cannot enrol it, so a true single-transaction
 * provision across both is not available to us. What this does instead:
 *
 *   1. Create the auth user FIRST, outside the transaction.
 *   2. Do every Postgres write inside ONE transaction.
 *   3. If the transaction fails, DELETE the auth user.
 *
 * Step 3 is the part that is easy to skip and expensive to have skipped. An
 * orphaned auth user with no membership is a person who can sign in and
 * reach the "your account is not attached to a workspace" state (02 §11)
 * forever, with no route out that does not involve us. The compensation is
 * best-effort by nature — if it fails too, the error says so explicitly and
 * names the address, because a human then has to remove it.
 *
 * The alternative, creating the tenant first and the user second, is worse:
 * a tenant with no owner is invisible to every policy in `06`, so nobody can
 * see it in order to fix it.
 */
export async function provisionTenant(
  input: ProvisionTenantInput,
  actor: { userId: string; label: string; requestId: string; ipAddress?: string | null },
): Promise<ProvisionTenantResult> {
  const parsed = provisionTenantSchema.safeParse(input);
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

  const { name, slug, ownerEmail, ownerName, initialStatus } = parsed.data;
  const admin = createSupabaseAdminClient();

  // ── 1 · The auth user, before the transaction ──────────────────────────
  //
  // `inviteUserByEmail` rather than `createUser`: 02 §3 says the owner
  // "receives an invitation and sets their own password". Creating a user
  // with a password we generated would mean this system knew a credential
  // it has no business knowing, which is the same principle the credential
  // reveal screen is built on.
  const invited = await admin.auth.admin.inviteUserByEmail(ownerEmail, {
    data: { full_name: ownerName },
  });

  if (invited.error || !invited.data.user) {
    const alreadyRegistered = invited.error?.message?.toLowerCase().includes('already') ?? false;
    return {
      ok: false,
      code: alreadyRegistered ? 'owner_exists' : 'provisioning_failed',
      message: alreadyRegistered
        ? `${ownerEmail} already has an account. Invite them to this workspace instead of provisioning a new one.`
        : `The owner account could not be created: ${invited.error?.message ?? 'unknown error'}`,
    };
  }

  const ownerUserId = invited.data.user.id;

  // ── 2 · Every Postgres write, in one transaction ───────────────────────
  try {
    const tenantId = await asService(
      {
        action: AUDIT_ACTIONS.TENANT_PROVISIONED,
        actorUserId: actor.userId,
        actorLabel: actor.label,
        entityType: 'tenant',
        reason: `Provisioned ${slug} with owner ${ownerEmail}`,
        requestId: actor.requestId,
        ipAddress: actor.ipAddress ?? null,
      },
      async (tx) => {
        // Slug uniqueness is enforced by the index; this read turns the
        // resulting constraint violation into a message naming the field,
        // which is what `07 §1`'s error envelope needs.
        const existing = await tx
          .select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.slug, slug))
          .limit(1);

        if (existing.length > 0) throw new SlugTakenError(slug);

        const [tenant] = await tx
          .insert(tenants)
          .values({
            slug,
            name,
            status: initialStatus,
            provisionedAt: new Date(),
          })
          .returning({ id: tenants.id });

        if (!tenant) throw new Error('The tenant row was not returned after insert.');

        await tx.insert(tenantSettings).values({
          tenantId: tenant.id,
          displayName: name,
        });

        // The profile projection over `auth.users`. 05 §4.
        await tx
          .insert(userProfiles)
          .values({ id: ownerUserId, fullName: ownerName, email: ownerEmail })
          .onConflictDoNothing();

        // 06 §5: "A tenant always has exactly one owner." This is the row
        // that makes that true from the first instant the tenant exists.
        // `joinedAt` stays null until the invitation is accepted — they are
        // the owner, they have simply not arrived yet.
        await tx.insert(tenantMembers).values({
          tenantId: tenant.id,
          userId: ownerUserId,
          role: 'owner',
          status: 'invited',
          invitedBy: actor.userId,
        });

        return tenant.id;
      },
    );

    return { ok: true, tenantId, slug, ownerUserId };
  } catch (error) {
    // ── 3 · Compensate. See the note at the top on why this matters. ─────
    const removed = await admin.auth.admin.deleteUser(ownerUserId).then(
      (r) => !r.error,
      () => false,
    );

    if (error instanceof SlugTakenError) {
      return {
        ok: false,
        code: 'slug_taken',
        message: `The name ${error.slug} is already in use.`,
        details: [{ field: 'slug', message: 'Already in use.' }],
      };
    }

    return {
      ok: false,
      code: 'provisioning_failed',
      message: removed
        ? 'Provisioning failed and nothing was created. Try again.'
        : `Provisioning failed, and the part-created account for ${ownerEmail} could not be removed automatically. It must be deleted by hand before retrying.`,
    };
  }
}

/** Thrown inside the transaction so the rollback happens, and caught outside
 *  so the caller gets a message naming the field rather than a constraint
 *  name. */
class SlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`slug_taken:${slug}`);
    this.name = 'SlugTakenError';
  }
}
