import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  invitations,
  tenantMembers,
  tenants,
  userProfiles,
  usageCounters,
  subscriptions,
  planEntitlements,
  subscriptionOverrides,
  type MemberRole,
} from '@/db/schema';
import { AUDIT_ACTIONS, audited } from '@/lib/audit';
import { withTenantContext, type Transaction } from '@/lib/db';
import type { ResolvedContext } from '@/lib/db/context';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { incrementUsage, invalidateEntitlements } from '@/modules/entitlements';
import { invitationEmail, sendEmail } from '@/modules/email';

/** 02 §9. 32 bytes from a CSPRNG, hashed at rest, single use, 7 day expiry. */
const INVITATION_TTL_DAYS = 7;

export type InviteInput = { email: string; role: Exclude<MemberRole, 'owner'> };

const inviteInput = z
  .object({
    email: z.string().trim().toLowerCase().email().max(254),
    role: z.enum(['admin', 'agent']),
  })
  .strict();

/** Serialize every team mutation, including the SQL invitation-acceptance path. */
async function manage(tx: Transaction, ctx: ResolvedContext, ownerOnly = false) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`membership:${ctx.tenantId}`}, 0))`,
  );
  const [tenant] = await tx
    .select({ status: tenants.status })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId));
  if (!tenant) throw new AppError(ERROR_CODES.TENANT_NOT_FOUND);
  if (!['active', 'trial'].includes(tenant.status))
    throw new AppError(ERROR_CODES.TENANT_SUSPENDED);
  if (ctx.supportMode || ctx.role === 'support') {
    if (ownerOnly || !ctx.supportMode || ctx.role !== 'support')
      throw new AppError(ERROR_CODES.SUPPORT_WRITE_DENIED);
  } else {
    if (
      ctx.actorType !== 'user' ||
      !['owner', 'admin'].includes(ctx.role) ||
      (ownerOnly && ctx.role !== 'owner')
    )
      throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);
    const [actor] = await tx
      .select({ role: tenantMembers.role, status: tenantMembers.status })
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, ctx.tenantId),
          eq(tenantMembers.userId, ctx.actorId),
          isNull(tenantMembers.deletedAt),
        ),
      )
      .limit(1)
      .for('update');
    if (!actor || actor.status !== 'active' || actor.role !== ctx.role)
      throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);
  }
}

/** Counter locking also coordinates with the console's reviewed plan changes. */
async function lockSeats(tx: Transaction, tenantId: string) {
  const [source] = await tx.execute<{ n: number }>(sql`select (
    (select count(*) from tenant_members where tenant_id = ${tenantId} and status = 'active' and deleted_at is null)
    + (select count(*) from invitations where tenant_id = ${tenantId} and accepted_at is null and revoked_at is null)
  )::int as n`);
  const initial = source?.n ?? 0;
  await tx
    .insert(usageCounters)
    .values({ tenantId, key: 'seats', currentValue: initial, peakValue: initial })
    .onConflictDoNothing();
  const [counter] = await tx
    .select({ current: usageCounters.currentValue })
    .from(usageCounters)
    .where(and(eq(usageCounters.tenantId, tenantId), eq(usageCounters.key, 'seats')))
    .for('update');
  if (!counter || counter.current !== initial)
    throw new AppError(ERROR_CODES.INTERNAL, {
      message:
        'Seat usage could not be verified. Ask support to review this workspace before changing the team.',
    });
  return counter.current;
}

async function availableSeat(tx: Transaction, ctx: ResolvedContext) {
  const current = await lockSeats(tx, ctx.tenantId);
  const [subscription] = await tx
    .select({ planId: subscriptions.planId, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, ctx.tenantId));
  if (!subscription || !['active', 'trialing'].includes(subscription.status))
    throw new AppError(ERROR_CODES.SUBSCRIPTION_NOT_ACTIVE);
  const [allowance] = await tx
    .select()
    .from(planEntitlements)
    .where(
      and(eq(planEntitlements.planId, subscription.planId), eq(planEntitlements.key, 'seats')),
    );
  const [override] = await tx
    .select()
    .from(subscriptionOverrides)
    .where(
      and(
        eq(subscriptionOverrides.tenantId, ctx.tenantId),
        eq(subscriptionOverrides.key, 'seats'),
        sql`(${subscriptionOverrides.expiresAt} is null or ${subscriptionOverrides.expiresAt} > now())`,
      ),
    );
  if (override ? override.featureEnabled !== null : !allowance || allowance.kind !== 'limit')
    throw new AppError(ERROR_CODES.ENTITLEMENT_FEATURE_UNAVAILABLE);
  const limit = override ? override.limitValue : allowance!.limitValue;
  if (limit !== null && current + 1 > limit)
    throw new AppError(ERROR_CODES.ENTITLEMENT_LIMIT_REACHED, {
      message:
        'All seats are in use. Withdraw an invitation or review your plan before inviting someone else.',
    });
}

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
  const parsed = inviteInput.safeParse(input);
  if (!parsed.success)
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Enter a valid email address and choose Administrator or Agent.',
    });
  input = parsed.data;

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const email = input.email.trim().toLowerCase();

  const { created, tenantName } = await withTenantContext(ctx, async (tx) => {
    await manage(tx, ctx);
    await availableSeat(tx, ctx);
    const [member] = await tx
      .select({ id: tenantMembers.id })
      .from(tenantMembers)
      .innerJoin(userProfiles, eq(tenantMembers.userId, userProfiles.id))
      .where(
        and(
          eq(tenantMembers.tenantId, ctx.tenantId),
          isNull(tenantMembers.deletedAt),
          sql`lower(${userProfiles.email}) = ${email}`,
        ),
      )
      .limit(1);
    if (member)
      throw new AppError(ERROR_CODES.MEMBER_ALREADY_EXISTS, {
        message: 'This person already belongs to the workspace.',
      });
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

    return {
      created: { id: row.id, email, role: input.role, token, expiresAt },
      tenantName: tenant?.name ?? 'your workspace',
    };
  });
  await invalidateEntitlements(ctx.tenantId);

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

function acceptUrlFor(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
  return `${base}/invite/${token}`;
}

export async function resendInvitation(
  ctx: ResolvedContext,
  invitationId: string,
): Promise<InviteResult> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { updated, tenantName } = await withTenantContext(ctx, async (tx) => {
    await manage(tx, ctx);
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
          eq(invitations.tenantId, ctx.tenantId),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      )
      .limit(1)
      .for('update');

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
    await manage(tx, ctx);
    await lockSeats(tx, ctx.tenantId);
    const [row] = await tx
      .select({ id: invitations.id, email: invitations.email, role: invitations.role })
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.tenantId, ctx.tenantId),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt),
        ),
      )
      .limit(1)
      .for('update');

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
  });
  await invalidateEntitlements(ctx.tenantId);
}

export async function changeMemberRole(
  ctx: ResolvedContext,
  memberId: string,
  role: MemberRole,
): Promise<void> {
  if (!['owner', 'admin', 'agent'].includes(role))
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Choose Administrator or Agent.',
    });
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
    await manage(tx, ctx, true);
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
    await manage(tx, ctx);
    await lockSeats(tx, ctx.tenantId);
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

    if (member.status === 'active') await incrementUsage(tx, ctx.tenantId, 'seats', -1);
  });
  await invalidateEntitlements(ctx.tenantId);
}

export async function transferOwnership(
  ctx: ResolvedContext,
  newOwnerMemberId: string,
): Promise<{ previousOwnerId: string; newOwnerId: string }> {
  return withTenantContext(ctx, async (tx) => {
    await manage(tx, ctx, true);
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
      .limit(1)
      .for('update');

    if (!outgoing || outgoing.userId !== ctx.actorId) {
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
    .limit(1)
    .for('update');

  if (!row) {
    // RLS already returned nothing for another tenant's member, so this is
    // "not found or not visible" and 07 §1 says both are 404.
    throw new AppError(ERROR_CODES.NOT_FOUND, { message: 'That team member was not found.' });
  }

  return row;
}

function isUniqueViolation(error: unknown): boolean {
  for (let depth = 0; depth < 5 && typeof error === 'object' && error !== null; depth++) {
    if ('code' in error && error.code === '23505') return true;
    error = 'cause' in error ? error.cause : null;
  }
  return false;
}
