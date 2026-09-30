import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { auditLog, sessions, tenants } from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { breakGlassState } from './breakGlass';
import { asService } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { PlatformActor } from './subscriptions';
import { requireCapability } from './capabilities';

/**
 * 09 §3 · 09 §4 · 04 §6. SUPPORT SESSIONS.
 *
 * ⚠ A SUPPORT SESSION IS AN ORDINARY ROW IN `sessions`, AND THAT IS THE
 *   WHOLE SECURITY ARGUMENT.
 *
 * `05 §4` puts it plainly: "A support session is an ordinary row here with
 * `kind = 'support'`, which is exactly what makes its ceiling genuine: RLS
 * reads `tenant_id` and `role` from it the same way it does for any tenant
 * user."
 *
 * The alternative — a flag on the platform admin, or a claim in a token —
 * would put the platform outside the policy system while it is inside a
 * customer's workspace, which is the one moment it most needs to be inside it.
 * As a row, the ceiling is the same machinery that scopes every tenant user,
 * and `06 §5`'s carve-outs apply to it automatically.
 *
 * ⚠ THE COOKIE CARRIES A ROW ID AND NOTHING ELSE.
 *
 * `lib/console/session.ts` previously held the tenant, the reason and the
 * expiry in the cookie itself, and said in its own comment that this was
 * provisional until the table landed. It has landed. A cookie that carries
 * the grant is a grant the holder can edit; a cookie that carries a pointer
 * to a row is a pointer that resolves to nothing once the row is revoked.
 *
 * ⚠ THREE WRITES, ONE TRANSACTION.
 *
 * The session row, the platform audit entry and the TENANT's audit entry all
 * land together or not at all. 09 §4 requires the customer's own log to carry
 * it — that is the transparency claim, and a claim that can be half-written
 * is not one. `asService` writes the platform row before the operation for
 * the same reason (05 I-06), so a crash mid-mint still leaves a record that
 * entry was attempted.
 */

/** 09 §3. Thirty minutes of inactivity, per the brief. */
export const SUPPORT_SESSION_DURATION_MS = 30 * 60 * 1000;

export type SupportSessionRecord = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  platformAdminId: string;
  platformAdminName: string;
  reason: string;
  /** Absolute, ISO 8601. The client derives its countdown from this. */
  expiresAt: string;
  startedAt: string;
};

/**
 * Mint a support session and return it.
 *
 * The caller sets the cookie, because only the caller has a response.
 *
 * ⚠ THE REASON IS REQUIRED HERE EVEN THOUGH 09 §3 CALLS IT OPTIONAL.
 *
 * That section says: "The reason field is optional in Phase 1 and I would
 * argue for making it mandatory, more so now than when this was read-only: a
 * support session that can change data and cannot explain why six months
 * later is a materially worse position than a read-only one in the same
 * spot. Raise it with Brian; it costs a required field."
 *
 * 01 D-13 confirmed read-and-write on 24 Aug 2026, which is the condition
 * that argument was contingent on. It is required. If Brian wants it optional
 * he can say so and this is one line — but the default should be the safe one
 * while the question is open, not the other way round.
 */
export async function startSupportSession(
  input: { tenantId: string; reason: string },
  actor: PlatformActor,
): Promise<SupportSessionRecord> {
  const reason = input.reason.trim();

  if (reason.length < 8) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message:
        'A reason is required, and the customer reads it — so write it for them rather than for us.',
      details: [
        { field: 'reason', code: ERROR_CODES.VALIDATION_FAILED, message: 'Give a reason.' },
      ],
    });
  }

  const expiresAt = new Date(Date.now() + SUPPORT_SESSION_DURATION_MS);

  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.SUPPORT_ENTERED,
      targetTenantId: input.tenantId,
      entityType: 'support_session',
      reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      // Doc 23: the capability column is enforced here, before anything is written.
      await requireCapability(tx, actor.userId, 'enter_support_mode');
      /**
       * ⚠ BREAK GLASS IS ENFORCED HERE, AND THIS IS THE ONLY PLACE IT NEEDS TO
       *   BE. `internal/breakGlass.ts` has the full argument; the short version
       *   is that a support session is the only thing the lock withholds, and a
       *   session has to be minted before it can be used. Refuse the mint and
       *   there is nothing for `withTenantContext` to widen, so the expensive
       *   per-request check the obvious design would have added is unnecessary.
       *
       * It is inside the transaction, after the audit row: an attempt made
       * while locked is itself worth recording, and `asService` has already
       * written that this operator tried. The throw rolls the session insert
       * back, not the record of the attempt's intent.
       */
      const glass = await breakGlassState(tx);
      if (glass.locked) {
        throw new AppError(ERROR_CODES.SUPPORT_NOT_PERMITTED, {
          message: glass.reason
            ? `Support access is locked platform-wide: "${glass.reason}" — locked by ${glass.by ?? 'a platform admin'}. Release it in Settings before entering a workspace.`
            : 'Support access is locked platform-wide. Release it in Settings before entering a workspace.',
          internal: { stage: 'break-glass', lockedBy: glass.by, lockedAt: glass.at },
        });
      }

      const [tenant] = await tx
        .select({ id: tenants.id, slug: tenants.slug, name: tenants.name })
        .from(tenants)
        .where(and(eq(tenants.id, input.tenantId), isNull(tenants.deletedAt)))
        .limit(1);

      if (!tenant) {
        throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, {
          message: 'That workspace does not exist.',
        });
      }

      /**
       * One live support session per workspace.
       *
       * Two operators inside the same customer at once is not obviously
       * wrong, but the tenant's boundary frame names ONE person and their
       * reason — so a second concurrent session would be invisible to the
       * customer while it acted on their data, which defeats 09 §7. Revoking
       * the first is the honest resolution and it is recorded.
       */
      await tx
        .update(sessions)
        .set({ revokedAt: new Date(), revokedReason: 'superseded by a new support session' })
        .where(
          and(
            eq(sessions.tenantId, tenant.id),
            eq(sessions.kind, 'support'),
            isNull(sessions.revokedAt),
          ),
        );

      const [row] = await tx
        .insert(sessions)
        .values({
          userId: actor.userId,
          kind: 'support',
          tenantId: tenant.id,
          // 06 §5. The role RLS will read. Not 'owner', not the admin's own
          // role — 'support', which is what the policy carve-outs key on.
          effectiveRole: 'support',
          supportContext: {
            platformAdminId: actor.userId,
            reason,
            enteredAt: new Date().toISOString(),
          },
          ipAddress: actor.ipAddress ?? null,
          lastActivityAt: new Date(),
          expiresAt,
        })
        .returning({ id: sessions.id, createdAt: sessions.createdAt });

      if (!row) throw new Error('the support session row could not be created');

      /**
       * 09 §4 · 09 §7. THE CUSTOMER'S OWN LOG.
       *
       * "A tenant can see every time the platform entered their workspace,
       * who it was, why, and anything they changed while they were in there."
       * The platform's log is ours; this row is theirs, and it is the one
       * that makes the claim true. `supportMode: true` is what lets them
       * filter their log to exactly these events.
       */
      await tx.insert(auditLog).values({
        tenantId: tenant.id,
        actorUserId: actor.userId,
        actorType: 'platform_admin',
        actorLabel: actor.label,
        supportMode: true,
        action: AUDIT_ACTIONS.SUPPORT_ENTERED,
        entityType: 'support_session',
        entityId: row.id,
        after: { reason, expiresAt: expiresAt.toISOString() },
        ipAddress: actor.ipAddress ?? null,
        requestId: actor.requestId,
      });

      return {
        id: row.id,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
        platformAdminId: actor.userId,
        platformAdminName: actor.label,
        reason,
        expiresAt: expiresAt.toISOString(),
        startedAt: row.createdAt.toISOString(),
      };
    },
  );
}

/**
 * 09 §3. Explicit exit. Revokes the row and writes both audit entries.
 *
 * ⚠ CLOSING THE TAB IS NOT AN EXIT, AND THAT IS DELIBERATE.
 *
 * "Closing the tab does not exit; the session expires on its own timer. That
 * is deliberate, because a browser close is not a signal we can trust." A
 * beacon on unload fires unreliably, is trivially suppressed, and would make
 * the audit trail claim an exit that may not have happened.
 *
 * It resolves the session from the row rather than taking a tenant id, so an
 * exit cannot be pointed at somebody else's session.
 */
export async function endSupportSession(
  sessionId: string,
  actor: PlatformActor,
): Promise<{ tenantId: string } | null> {
  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.SUPPORT_EXITED,
      entityType: 'support_session',
      reason: 'support session ended',
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      const [row] = await tx
        .select({ id: sessions.id, tenantId: sessions.tenantId, userId: sessions.userId })
        .from(sessions)
        .where(and(eq(sessions.id, sessionId), eq(sessions.kind, 'support')))
        .limit(1);

      // Already gone, or never existed. Exiting is idempotent on purpose:
      // 09 §4 wants a one-click exit that is always available, and an exit
      // that can fail is one that traps somebody inside a session they are
      // trying to leave.
      if (!row?.tenantId) return null;

      await tx
        .update(sessions)
        .set({ revokedAt: new Date(), revokedReason: 'exited by the operator' })
        .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));

      await tx.insert(auditLog).values({
        tenantId: row.tenantId,
        actorUserId: actor.userId,
        actorType: 'platform_admin',
        actorLabel: actor.label,
        supportMode: true,
        action: AUDIT_ACTIONS.SUPPORT_EXITED,
        entityType: 'support_session',
        entityId: row.id,
        ipAddress: actor.ipAddress ?? null,
        requestId: actor.requestId,
      });

      return { tenantId: row.tenantId };
    },
  );
}

/**
 * The live support session for a given row id, re-read and re-checked.
 *
 * ⚠ AUTHORITY RESTS HERE, NOT IN THE COOKIE. Revoked, expired, or belonging
 * to a different operator all resolve to null. This is what `lib/console/
 * session.ts` promised would exist "once M4 lands the support_sessions
 * table" — it landed as `sessions` with `kind = 'support'` rather than as a
 * table of its own, for the reason at the top of this file.
 */
export async function readSupportSession(
  sessionId: string,
  actor: PlatformActor,
): Promise<SupportSessionRecord | null> {
  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.SUPPORT_SESSION_READ,
      entityType: 'support_session',
      entityId: sessionId,
      reason: 'support session read',
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      const [row] = await tx
        .select({
          id: sessions.id,
          userId: sessions.userId,
          tenantId: sessions.tenantId,
          expiresAt: sessions.expiresAt,
          createdAt: sessions.createdAt,
          supportContext: sessions.supportContext,
          tenantSlug: tenants.slug,
          tenantName: tenants.name,
        })
        .from(sessions)
        .innerJoin(tenants, eq(tenants.id, sessions.tenantId))
        .where(
          and(
            eq(sessions.id, sessionId),
            eq(sessions.kind, 'support'),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date()),
          ),
        )
        .limit(1);

      if (!row?.tenantId) return null;

      // A session id belonging to a different operator resolves to nothing,
      // so a copied cookie does not enter somebody else's grant.
      if (row.userId !== actor.userId) return null;

      return {
        id: row.id,
        tenantId: row.tenantId,
        tenantSlug: row.tenantSlug,
        tenantName: row.tenantName,
        platformAdminId: row.userId,
        platformAdminName: actor.label,
        reason: row.supportContext?.reason ?? '',
        expiresAt: row.expiresAt.toISOString(),
        startedAt: row.createdAt.toISOString(),
      };
    },
  );
}

/**
 * 09 §3. Extend a session that is about to lapse.
 *
 * "At two minutes remaining a warning appears with an extend action;
 * extending is a fresh confirmation, not a silent renewal."
 *
 * ⚠ IT ISSUES A NEW THIRTY MINUTES FROM NOW, AND IT IS AUDITED LIKE AN ENTRY.
 *
 * A renewal that the customer cannot see would let a thirty-minute ceiling
 * become an eight-hour one with nothing in their log to show for it. So the
 * extension writes to the tenant's audit trail too: the ceiling is real
 * because exceeding it is visible, not because the number is small.
 */
export async function extendSupportSession(
  sessionId: string,
  actor: PlatformActor,
): Promise<{ expiresAt: string } | null> {
  const expiresAt = new Date(Date.now() + SUPPORT_SESSION_DURATION_MS);

  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.SUPPORT_EXTENDED,
      entityType: 'support_session',
      entityId: sessionId,
      reason: 'support session extended',
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      // Doc 23: the capability column is enforced here, before anything is written.
      await requireCapability(tx, actor.userId, 'enter_support_mode');
      const [row] = await tx
        .select({ id: sessions.id, tenantId: sessions.tenantId, userId: sessions.userId })
        .from(sessions)
        .where(
          and(eq(sessions.id, sessionId), eq(sessions.kind, 'support'), isNull(sessions.revokedAt)),
        )
        .limit(1);

      if (!row?.tenantId || row.userId !== actor.userId) return null;

      await tx
        .update(sessions)
        .set({ expiresAt, lastActivityAt: new Date() })
        .where(eq(sessions.id, sessionId));

      await tx.insert(auditLog).values({
        tenantId: row.tenantId,
        actorUserId: actor.userId,
        actorType: 'platform_admin',
        actorLabel: actor.label,
        supportMode: true,
        action: AUDIT_ACTIONS.SUPPORT_EXTENDED,
        entityType: 'support_session',
        entityId: row.id,
        after: { extendedTo: expiresAt.toISOString() },
        ipAddress: actor.ipAddress ?? null,
        requestId: actor.requestId,
      });

      return { expiresAt: expiresAt.toISOString() };
    },
  );
}
