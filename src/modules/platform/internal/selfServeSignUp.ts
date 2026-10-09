import 'server-only';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService } from '@/lib/db/serviceClient';
import { createSupabaseAdminClient } from '@/lib/auth/supabase/admin';
import { tenantMembers, tenantSettings, tenants, userProfiles, usageCounters } from '@/db/schema';
import { RESERVED_SLUGS } from '../types';

/**
 * 02 §3 · IA §3. SELF-SERVE REGISTRATION — "creates tenant, membership and
 * owner in one transaction."
 *
 * ⚠ WHY THIS IS A SIBLING OF `provisionTenant` RATHER THAN A CALL INTO IT.
 *
 * They look like the same operation and they are not, on the one axis that
 * matters: WHO CHOOSES THE PASSWORD.
 *
 * `provisionTenant` is a platform admin opening a workspace for a customer.
 * It calls `inviteUserByEmail` precisely so that this system never holds a
 * credential it has no business knowing — the owner sets their own password
 * from the invitation, and the admin who created them cannot sign in as them.
 * That property is the reason the function is written the way it is.
 *
 * Self-serve registration is the owner themselves, at the keyboard, choosing
 * their own password in the form. There is nobody to protect them from. So
 * this uses `createUser` with the password they typed, and the two functions
 * stay separate rather than one growing an `optional password` parameter that
 * would quietly weaken the admin path for the convenience of this one.
 *
 * The three things it copies deliberately, because they were right there:
 *   1. Auth user FIRST, outside the transaction — Postgres cannot enrol it.
 *   2. Every Postgres write in ONE transaction.
 *   3. On failure, DELETE the auth user. An orphaned auth user with no
 *      membership is a person who can sign in and reach "your account is not
 *      attached to a workspace" forever with no route out that does not
 *      involve us.
 *
 * ⚠ THE TENANT IS BORN `trial`, NEVER `active`. 01 D-13 is explicit that
 * there is no free plan. A trial is not a free plan — it expires — but an
 * `active` tenant created by an anonymous form post would be exactly the free
 * plan that decision rules out. Billing promotes it; this function cannot.
 */

export const selfServeSignUpSchema = z.object({
  fullName: z.string().trim().min(1, 'Enter your name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  companyName: z.string().trim().min(1, 'Enter your company name.').max(120),
  /* 02 §9. Length over composition rules, matching the reset and invitation
     flows. `PasswordQualityMeter` mirrors this number; if it moves, move it
     there too. */
  password: z.string().min(12, 'Use at least 12 characters.'),
});

export type SelfServeSignUpInput = z.infer<typeof selfServeSignUpSchema>;

export type SelfServeSignUpResult =
  | { ok: true; tenantId: string; slug: string; ownerUserId: string; email: string }
  | {
      ok: false;
      code: 'email_taken' | 'validation_failed' | 'registration_failed';
      message: string;
      details?: Array<{ field: string; message: string }>;
    };

/**
 * Company name → candidate slug.
 *
 * ⚠ IT MUST NOT THROW ON A NAME THAT CANNOT BE SLUGGED. `WorkspaceSlugPreview`
 * shows the reader a slug as they type, but a company written entirely in
 * non-latin characters slugs to the empty string, and "Ltd." slugs to
 * something under the three-character minimum. Refusing to register those
 * businesses would be absurd, so an unusable stem falls back to `workspace`
 * and the disambiguating suffix below makes it unique.
 */
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

/**
 * ⚠ A COLLIDING NAME IS SUFFIXED, NOT REFUSED. This is the single biggest
 * behavioural difference from `provisionTenant`, and it is a conversion
 * decision rather than a technical one.
 *
 * An admin provisioning a workspace who hits a taken slug should be told so —
 * they are naming someone else's business and probably typed it wrong.
 * A member of the public registering "Acme Logistics" has no idea another
 * Acme exists, cannot be expected to invent a distinguishing name on the
 * spot, and will simply leave. Two real companies genuinely do share a name.
 *
 * So the stem gains `-2`, `-3`, … until it is free. The loop is bounded and
 * falls back to a short random suffix, because an unbounded "try until it
 * works" inside a transaction is a way to hold a lock forever.
 */
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

export async function selfServeSignUp(
  input: SelfServeSignUpInput,
  context: { requestId: string; ipAddress?: string | null },
): Promise<SelfServeSignUpResult> {
  const parsed = selfServeSignUpSchema.safeParse(input);
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

  const { fullName, email, companyName, password } = parsed.data;
  const admin = createSupabaseAdminClient();

  // ── 1 · The auth user, before the transaction ───────────────────────────
  //
  // `email_confirm: false` leaves the address unverified. The route sends the
  // confirmation link straight afterwards and the reader lands on
  // `/sign-up/verify`. They are a real owner of a real workspace before they
  // click it — confirming the address is not what creates the account, it is
  // what proves they can receive mail at it.
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { full_name: fullName },
  });

  if (created.error || !created.data.user) {
    const message = created.error?.message?.toLowerCase() ?? '';
    const alreadyRegistered =
      message.includes('already') || message.includes('registered') || message.includes('exists');

    return {
      ok: false,
      code: alreadyRegistered ? 'email_taken' : 'registration_failed',
      message: alreadyRegistered
        ? `${email} already has an account.`
        : `The account could not be created: ${created.error?.message ?? 'unknown error'}`,
    };
  }

  const ownerUserId = created.data.user.id;

  // ── 2 · Every Postgres write, in one transaction ────────────────────────
  try {
    const claimed = await asService(
      {
        action: AUDIT_ACTIONS.TENANT_SELF_REGISTERED,
        /* The actor IS the new owner. There is no platform admin in this
           story, and putting one there would make the trail say a person
           did something they did not do. */
        actorUserId: ownerUserId,
        actorLabel: `${fullName} <${email}>`,
        entityType: 'tenant',
        reason: `Self-registered workspace for ${companyName}`,
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
            // See the header note: trial, never active.
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

        /*
         * ⚠ `active` AND `joinedAt` NOW, WHERE `provisionTenant` WRITES
         * `invited` AND NULL. That function's owner has not arrived — they
         * still have to accept an invitation. This one is arriving right now,
         * in this request, and will hold a session before the response is
         * written. Marking them `invited` would put the person who just
         * created the workspace into the pending state on their own team
         * page, and every seat count that reads `status` would be wrong.
         */
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

        return { tenantId: tenant.id, slug };
      },
    );

    return { ok: true, ...claimed, ownerUserId, email };
  } catch {
    // ── 3 · Compensate. Same reasoning as `provisionTenant`. ──────────────
    const removed = await admin.auth.admin.deleteUser(ownerUserId).then(
      (r) => !r.error,
      () => false,
    );

    return {
      ok: false,
      code: 'registration_failed',
      message: removed
        ? 'The workspace could not be created. Nothing was saved — try again.'
        : `The workspace could not be created, and the account for ${email} could not be removed afterwards. It needs deleting by hand.`,
    };
  }
}
