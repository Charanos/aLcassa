import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { invitations, tenantMembers, tenants, type MemberRole } from '@/db/schema';
import { AUDIT_ACTIONS, audited } from '@/lib/audit';
import { withTenantContext, type Transaction } from '@/lib/db';
import type { ResolvedContext } from '@/lib/db/context';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { assertEntitlement, incrementUsage, invalidateEntitlements } from '@/modules/entitlements';
import { invitationEmail, sendEmail } from '@/modules/email';

/**
 * 06 §5 · 07 §5. MEMBERSHIP, INVITATIONS AND THE OWNER INVARIANT.
 *
 * ⚠ THE INVARIANT THIS MODULE EXISTS TO HOLD:
 *   A TENANT HAS EXACTLY ONE OWNER. NEVER ZERO. NEVER TWO.
 *
 * Zero owners is unrecoverable without us: no one can invite, no one can
 * transfer, and every owner-gated control is dead. Two owners is a governance
 * problem that surfaces as a support conversation months later. Both are
 * reachable through perfectly reasonable-looking individual operations —
 * demote the only owner, remove the only owner, promote a second — which is
 * why the checks live HERE, in the one module every path goes through, rather
 * than in each route.
 *
 * Transfer is the only operation that changes who the owner is, and it does
 * both halves in one transaction. There is no "promote then demote" sequence
 * that could be interrupted between the two.
 */

/** 02 §9. 32 bytes from a CSPRNG, hashed at rest, single use, 7 day expiry. */
const INVITATION_TTL_DAYS = 7;

export type InviteInput = { email: string; role: MemberRole };

/**
 * The token is returned ONCE, in plaintext, to be put in an email — and only
 * its hash is stored. Same reasoning as the credential store: a token we can
 * read back is a token an attacker with database access can use, and there is
 * no operational need to read it after it is sent.
 */
export type InviteResult = {
  id: string;
  email: string;
  role: MemberRole;
  token: string;
  expiresAt: Date;
  /**
   * ⚠ WHETHER THE EMAIL ACTUALLY LEFT, REPORTED RATHER THAN ASSUMED.
   *
   * The invitation exists either way — it is a committed row — so this is
   * not a success flag for the operation. It is what lets the interface say
   * "we have emailed them" when that is true and "send them this link" when
   * it is not, instead of claiming the first and being wrong.
   */
  delivery: { sent: boolean; reason?: string };
};

function hashToken(token: string): string {
  // SHA-256 rather than argon2id, and the difference from the credential
  // store is deliberate: this token is 256 bits of CSPRNG output with a
  // seven-day life, so it has no guessable structure to slow an attacker
  // down over. Argon2 protects secrets a human chose; this is not one.
  return createHash('sha256').update(token).digest('hex');
}

export async function inviteMember(
  ctx: ResolvedContext,
  input: InviteInput,
): Promise<InviteResult> {
  /**
   * 07 §5. "Inviting counts against `seats` at invitation time, not at
   * acceptance. Otherwise a tenant on a 5-seat plan can send fifty
   * invitations and blow through the limit the moment they are accepted."
   *
   * The remedy at that point would be removing people who have already
   * joined, which is a conversation nobody should have to have.
   */
  await assertEntitlement(ctx, 'seats', 1);

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const email = input.email.trim().toLowerCase();

  const { created, tenantName } = await withTenantContext(ctx, async (tx) => {
    // The workspace name for the email. Read inside the transaction because
    // it is the same tenant the invitation is being written against, and a
    // second read outside could resolve differently under a rename.
    const [tenant] = await tx
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    // No pre-flight "is this address already invited" check, deliberately:
    // `invitations_pending_unique` answers it in the database, where a
    // second request cannot slip between the check and the insert. The
    // catch below turns that constraint into the 409 it deserves.
    const row = await audited(
      tx,
      ctx,
      (result: { id: string }) => ({
        action: AUDIT_ACTIONS.MEMBER_INVITED,
        entityType: 'invitation',
        entityId: result.id,
        // The address IS recorded here, unlike in the logs: an audit trail
        // whose entry reads "invited someone" is not a trail. 05 §9 governs
        // this table; 05 I-16 governs logs. They differ on purpose.
        after: { email, role: input.role, expiresAt: expiresAt.toISOString() },
      }),
      async () => {
        try {
          const [inserted] = await tx
            .insert(invitations)
            .values({
              tenantId: ctx.tenantId,
              email,
              role: input.role,
              tokenHash: hashToken(token),
              invitedBy: ctx.actorId,
              expiresAt,
            })
            .returning({ id: invitations.id });
          if (!inserted) throw new Error('invitation insert returned nothing');
          return inserted;
        } catch (error) {
          /**
           * `invitations_pending_unique` is a PARTIAL index: one live
           * invitation per address per tenant, but a fresh one is allowed
           * after the previous was revoked. Hitting it means a live one
           * already exists, which is a 409 and not a 500.
           */
          if (isUniqueViolation(error)) {
            throw new AppError(ERROR_CODES.MEMBER_ALREADY_EXISTS, {
              message: 'That address already has a pending invitation to this workspace.',
              details: [
                {
                  field: 'email',
                  code: ERROR_CODES.MEMBER_ALREADY_EXISTS,
                  message: 'An invitation is already outstanding.',
                },
              ],
            });
          }
          throw error;
        }
      },
    );

    // Counted at invitation time. See the note above.
    await incrementUsage(tx, ctx.tenantId, 'seats', 1);
    await invalidateEntitlements(ctx.tenantId);

    return {
      created: { id: row.id, email, role: input.role, token, expiresAt },
      tenantName: tenant?.name ?? 'your workspace',
    };
  });

  /**
   * ⚠ THE EMAIL GOES AFTER THE TRANSACTION COMMITS, NOT INSIDE IT.
   *
   * Two failure modes, and only one of them is survivable:
   *
   *   send inside the transaction   a slow provider holds a database
   *                                 transaction open for its whole timeout,
   *                                 and a rollback after a successful send
   *                                 mails a link to an invitation that no
   *                                 longer exists
   *   send after it commits         a failed send leaves a real invitation
   *                                 whose link the owner can still pass on
   *
   * The second is a nuisance the interface can explain. The first is an
   * invitation that cannot be accepted and cannot be withdrawn, because
   * nobody has a row for it.
   *
   * It does not throw: `sendEmail` reports rather than raises, precisely so
   * this cannot roll back work that already succeeded.
   */
  const delivery = await sendEmail({
    to: created.email,
    template: invitationEmail({
      inviterName: ctx.actorLabel,
      companyName: tenantName,
      role: created.role,
      acceptUrl: acceptUrlFor(created.token),
      expiresAt: created.expiresAt,
    }),
    requestId: ctx.requestId,
  });

  return {
    ...created,
    delivery: delivery.delivered ? { sent: true } : { sent: false, reason: delivery.reason },
  };
}

/**
 * The absolute URL an invitation link points at.
 *
 * ⚠ FROM CONFIGURATION, NEVER FROM THE REQUEST.
 *
 * Building it from a `Host` header would let anyone who can reach this
 * endpoint have us mail a link to a domain they chose — the recipient sees a
 * genuine aLcassa invitation pointing at an attacker's copy of the accept
 * screen, and types their new password into it. Host header injection is
 * exactly this attack, and password-reset and invitation mails are its
 * classic targets.
 */
function acceptUrlFor(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
  return `${base}/invite/${token}`;
}

/**
 * 07 §5 · `POST /v1/invitations/:id/resend`. "Rate limited per invitation."
 *
 * ⚠ IT MINTS A NEW TOKEN AND RETIRES THE OLD ONE.
 *
 * The tempting implementation re-sends the existing link, and it is wrong in
 * both directions. A token that has been sitting in an inbox for six days
 * expires in one, so resending it delivers a link that dies almost
 * immediately — which is precisely the situation the owner is trying to fix.
 * And a token that has been mailed twice now exists in two inboxes, two mail
 * servers and two sets of logs, for twice as long.
 *
 * So the row keeps its identity, its address and its role — it is the same
 * invitation, and the seat it reserved is not counted again — while the
 * credential inside it is replaced and the clock restarts. The previous link
 * stops working the moment this returns.
 *
 * ⚠ THE RATE LIMIT IS THE EXPIRY WINDOW, NOT A COUNTER.
 *
 * 07 §5 asks for rate limiting per invitation. A counter in Redis would be a
 * fifth cache use, and `04` ADR-006 scopes that to four. The cheaper control
 * is already in the row: resending is refused while the existing link still
 * has most of its life left, because there is no legitimate reason to reissue
 * a token the recipient received an hour ago — and an owner clicking twice by
 * accident is the common case, not an attack.
 */
export async function resendInvitation(
  ctx: ResolvedContext,
  invitationId: string,
): Promise<InviteResult> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { updated, tenantName } = await withTenantContext(ctx, async (tx) => {
    const [tenant] = await tx
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    const [existing] = await tx
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new AppError(ERROR_CODES.NOT_FOUND, {
        message: 'That invitation no longer exists, or it has already been accepted.',
      });
    }

    // More than a day of life left means the recipient has a working link
    // and a second one helps nobody. The window is generous on purpose: it
    // catches a double click and an impatient owner, not a determined one.
    const hoursLeft = (existing.expiresAt.getTime() - Date.now()) / 3_600_000;
    if (hoursLeft > (INVITATION_TTL_DAYS - 1) * 24) {
      throw new AppError(ERROR_CODES.RATE_LIMIT_EXCEEDED, {
        message:
          'That invitation was sent moments ago and its link still works. Wait a day before sending another, or withdraw it and start again.',
        internal: { invitationId, hoursLeft },
      });
    }

    await audited(
      tx,
      ctx,
      {
        action: AUDIT_ACTIONS.INVITATION_RESENT,
        entityType: 'invitation',
        entityId: existing.id,
        before: { expiresAt: existing.expiresAt.toISOString() },
        after: { expiresAt: expiresAt.toISOString(), tokenReissued: true },
      },
      async () => {
        await tx
          .update(invitations)
          .set({ tokenHash: hashToken(token), expiresAt, updatedAt: new Date() })
          .where(eq(invitations.id, existing.id));
      },
    );

    return {
      updated: { id: existing.id, email: existing.email, role: existing.role, token, expiresAt },
      tenantName: tenant?.name ?? 'your workspace',
    };
  });

  // After the commit, for the reasons on `inviteMember`.
  const delivery = await sendEmail({
    to: updated.email,
    template: invitationEmail({
      inviterName: ctx.actorLabel,
      companyName: tenantName,
      role: updated.role,
      acceptUrl: acceptUrlFor(updated.token),
      expiresAt: updated.expiresAt,
    }),
    requestId: ctx.requestId,
  });

  return {
    ...updated,
    delivery: delivery.delivered ? { sent: true } : { sent: false, reason: delivery.reason },
  };
}

export async function revokeInvitation(ctx: ResolvedContext, invitationId: string): Promise<void> {
  await withTenantContext(ctx, async (tx) => {
    const [row] = await tx
      .select({ id: invitations.id, email: invitations.email, role: invitations.role })
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new AppError(ERROR_CODES.NOT_FOUND, {
        message: 'That invitation no longer exists, or it has already been accepted.',
      });
    }

    await audited(
      tx,
      ctx,
      {
        action: AUDIT_ACTIONS.INVITATION_REVOKED,
        entityType: 'invitation',
        entityId: row.id,
        before: { email: row.email, role: row.role },
        after: { revoked: true },
      },
      async () => {
        await tx
          .update(invitations)
          .set({ revokedAt: new Date() })
          .where(eq(invitations.id, invitationId));
      },
    );

    // The seat goes back. Counting it at invitation time is only fair if
    // withdrawing the invitation returns it.
    await incrementUsage(tx, ctx.tenantId, 'seats', -1);
    await invalidateEntitlements(ctx.tenantId);
  });
}

/**
 * 07 §5 · `PATCH /v1/members/:id/role`. Owner only. "Rejects
 * `member.last_owner`."
 *
 * ⚠ BOTH DIRECTIONS ARE GUARDED, AND THE SECOND IS THE ONE THAT GETS MISSED.
 *
 *   Demoting the last owner  → zero owners. Obvious, usually checked.
 *   Promoting a second owner → two owners. Less obvious, equally forbidden by
 *                              06 §5, and it is how "who can suspend this
 *                              workspace" becomes ambiguous.
 *
 * Promotion to owner therefore is not available here at all: it is
 * `transferOwnership`, which demotes the incumbent in the same transaction.
 */
export async function changeMemberRole(
  ctx: ResolvedContext,
  memberId: string,
  role: MemberRole,
): Promise<void> {
  if (role === 'owner') {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message:
        'Use ownership transfer to make someone the owner. A workspace has exactly one owner, so promoting a second is not something this can do.',
      details: [
        { field: 'role', code: ERROR_CODES.VALIDATION_FAILED, message: 'Use transfer-ownership.' },
      ],
    });
  }

  await withTenantContext(ctx, async (tx) => {
    const member = await loadMember(tx, ctx.tenantId, memberId);

    if (member.role === 'owner') {
      throw new AppError(ERROR_CODES.MEMBER_LAST_OWNER, {
        message:
          'This is the workspace owner. Transfer ownership to someone else first, which demotes them to admin in the same step.',
      });
    }

    await audited(
      tx,
      ctx,
      {
        action: AUDIT_ACTIONS.MEMBER_ROLE_CHANGED,
        entityType: 'tenant_member',
        entityId: memberId,
        before: { role: member.role },
        after: { role },
      },
      async () => {
        await tx
          .update(tenantMembers)
          .set({ role, updatedAt: new Date() })
          .where(eq(tenantMembers.id, memberId));
      },
    );
  });
}

export async function removeMember(ctx: ResolvedContext, memberId: string): Promise<void> {
  await withTenantContext(ctx, async (tx) => {
    const member = await loadMember(tx, ctx.tenantId, memberId);

    if (member.role === 'owner') {
      throw new AppError(ERROR_CODES.MEMBER_LAST_OWNER, {
        message:
          'The workspace owner cannot be removed. Transfer ownership first, then remove them.',
      });
    }

    // 07 §5: "owner, admin (agents only)". An admin removing another admin is
    // a lateral action nobody authorised; the owner decides that.
    if (member.role === 'admin' && ctx.role !== 'owner') {
      throw new AppError(ERROR_CODES.SUPPORT_NOT_PERMITTED, {
        message: 'Only the owner can remove an admin.',
      });
    }

    await audited(
      tx,
      ctx,
      {
        action: AUDIT_ACTIONS.MEMBER_REMOVED,
        entityType: 'tenant_member',
        entityId: memberId,
        before: { role: member.role, userId: member.userId },
        after: null,
      },
      async () => {
        // Soft delete: 05 §9 wants the audit trail to keep pointing at a real
        // row, and a hard delete would leave every historical entry naming an
        // identifier that resolves to nothing.
        await tx
          .update(tenantMembers)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(tenantMembers.id, memberId));
      },
    );

    await incrementUsage(tx, ctx.tenantId, 'seats', -1);
    await invalidateEntitlements(ctx.tenantId);
  });
}

/**
 * 07 §4 · `POST /v1/tenant/transfer-ownership`. "Owner. Atomic, requires
 * password confirmation."
 *
 * ⚠ ATOMIC IS THE WHOLE SPECIFICATION. Promote and demote in ONE transaction.
 *
 * Two statements from a route handler would leave a window — however brief,
 * and a network hiccup makes it arbitrarily long — in which the workspace has
 * two owners or none. Neither state has a screen, because neither is supposed
 * to exist.
 *
 * The password confirmation is enforced by the ROUTE, before this is called:
 * re-authentication is an auth concern and this module has no business
 * holding a password. What this guarantees is that once called, the outcome
 * is one owner or an unchanged workspace.
 */
export async function transferOwnership(
  ctx: ResolvedContext,
  newOwnerMemberId: string,
): Promise<{ previousOwnerId: string; newOwnerId: string }> {
  return withTenantContext(ctx, async (tx) => {
    const incoming = await loadMember(tx, ctx.tenantId, newOwnerMemberId);

    if (incoming.userId === ctx.actorId) {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        message: 'You already own this workspace.',
      });
    }
    if (incoming.status !== 'active') {
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        message: 'Ownership can only be transferred to an active member.',
      });
    }

    const [outgoing] = await tx
      .select({ id: tenantMembers.id, userId: tenantMembers.userId })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, ctx.tenantId),
          eq(tenantMembers.role, 'owner'),
          isNull(tenantMembers.deletedAt),
        ),
      )
      .limit(1);

    if (!outgoing) {
      // Unreachable if the invariant has held. Loud rather than silent,
      // because reaching it means it did not.
      throw new AppError(ERROR_CODES.INTERNAL, {
        message: 'This workspace has no owner on record. Get in touch and we will repair it.',
        internal: { tenantId: ctx.tenantId, invariant: 'exactly-one-owner' },
      });
    }

    await audited(
      tx,
      ctx,
      {
        action: AUDIT_ACTIONS.TENANT_OWNERSHIP_TRANSFERRED,
        entityType: 'tenant',
        entityId: ctx.tenantId,
        before: { ownerUserId: outgoing.userId },
        after: { ownerUserId: incoming.userId },
      },
      async () => {
        // Demote first. If the promote failed after a promote-first ordering,
        // the transaction would roll back either way — but ordering it this
        // way means that at no point inside the transaction do two rows carry
        // `owner`, which keeps any future partial-index constraint on that
        // column satisfiable.
        await tx
          .update(tenantMembers)
          .set({ role: 'admin', updatedAt: new Date() })
          .where(eq(tenantMembers.id, outgoing.id));

        await tx
          .update(tenantMembers)
          .set({ role: 'owner', updatedAt: new Date() })
          .where(eq(tenantMembers.id, newOwnerMemberId));
      },
    );

    return { previousOwnerId: outgoing.userId, newOwnerId: incoming.userId };
  });
}

/**
 * ⚠ `acceptInvitation` USED TO LIVE HERE AND IT COULD NEVER HAVE WORKED.
 *
 * It wrote to `invitations` and `tenant_members` through Drizzle under a
 * context with no tenant — which is the only context available before the
 * membership it creates exists. Every policy on both tables compares against
 * a null tenant, so the writes matched nothing and the acceptance silently
 * did nothing at all. The isolation probe caught it; a user would have
 * reported "the link says it worked and I am not in the workspace".
 *
 * It now lives in `./invitationAccess.ts`, over the SECURITY DEFINER
 * functions in `02_identity.sql` — which is what that file's comment said
 * the design was from the beginning.
 */

async function loadMember(
  tx: Transaction,
  tenantId: string,
  memberId: string,
): Promise<{ id: string; userId: string; role: MemberRole; status: string }> {
  const [row] = await tx
    .select({
      id: tenantMembers.id,
      userId: tenantMembers.userId,
      role: tenantMembers.role,
      status: tenantMembers.status,
    })
    .from(tenantMembers)
    .where(
      and(
        eq(tenantMembers.id, memberId),
        eq(tenantMembers.tenantId, tenantId),
        isNull(tenantMembers.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    // RLS already returned nothing for another tenant's member, so this is
    // "not found or not visible" and 07 §1 says both are 404.
    throw new AppError(ERROR_CODES.NOT_FOUND, { message: 'That team member was not found.' });
  }

  return row;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}
