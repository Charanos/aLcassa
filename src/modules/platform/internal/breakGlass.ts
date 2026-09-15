import 'server-only';
import { and, desc, eq, gt, inArray, isNull } from 'drizzle-orm';
import { platformAuditLog, sessions } from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { Transaction } from '@/lib/db/client';
import type { PlatformActor } from './subscriptions';

/**
 * 09 §8. BREAK GLASS: suspend all support access to customer workspaces.
 *
 * ⚠ THE LOCK HAS NO COLUMN. THE MOST RECENT AUDIT EVENT *IS* THE LOCK.
 *
 * This control sat inert for a phase because the obvious implementation needed
 * somewhere to put a boolean, and neither candidate was any good:
 * `platform_admins.can_enter_support_mode` is per-admin, so using it as the
 * global switch would destroy each admin's own setting on release; and a
 * `platform_settings` table is a migration, a policy, a reader and a writer for
 * one bit.
 *
 * Both of those are answers to the wrong question. A flag answers "is it
 * locked" and nothing else — while every question actually asked of a
 * break-glass control is historical: who locked it, when, why, how long were we
 * dark, and was that the incident we think it was. A flag answers those by
 * pointing at an audit table that somebody has to keep in step with it by hand,
 * and the first time the two disagree the flag is worthless.
 *
 * So the state and its record are the same row. `platform_audit_log` is
 * append-only, indexed on `occurred_at`, and already written before every
 * service-role operation; the latest `support.lock_engaged` or
 * `support.lock_released` is the current state, by definition. Nothing can
 * drift, the history is free, and it needed no migration.
 *
 * ⚠ WHERE THE LOCK IS ENFORCED, AND WHY NOT IN `withTenantContext`.
 *
 * The obvious place looks like the RLS context function, which is also the
 * expensive place: it runs on every request. The lock does not need to be
 * checked there, because a support session is the only thing it withholds and
 * sessions are MINTED, not resumed from nothing. Refuse the mint and no session
 * exists; `withTenantContext` reads `ctx.supportMode` off a resolved session,
 * so with no session there is no support mode to widen anything.
 *
 * Sessions already open when the lock engages are revoked by the same call —
 * a lock that let existing sessions run to their ceiling would leave the
 * platform inside customer workspaces for up to thirty more minutes, during an
 * incident somebody just declared.
 */

export type BreakGlassState = {
  locked: boolean;
  /** Who moved it last, and when. Null on a platform that has never used it. */
  by: string | null;
  at: Date | null;
  reason: string | null;
};

const LOCK_ACTIONS = [
  AUDIT_ACTIONS.SUPPORT_LOCK_ENGAGED,
  AUDIT_ACTIONS.SUPPORT_LOCK_RELEASED,
] as const;

/**
 * The current state, read from the last event.
 *
 * ⚠ IT IS NOT `asService`, DELIBERATELY. This is a READ that any console screen
 * may make, several times a page, and `asService` writes an audit row before
 * every call — so routing it there would fill the platform log with rows
 * recording that somebody looked at whether the lock was on. `support.session_read`
 * exists for a read worth recording; this one is not, and a log full of reads is
 * a log nobody filters.
 */
export async function breakGlassState(tx: Transaction): Promise<BreakGlassState> {
  const rows = await tx
    .select({
      action: platformAuditLog.action,
      actorLabel: platformAuditLog.actorLabel,
      reason: platformAuditLog.reason,
      occurredAt: platformAuditLog.occurredAt,
    })
    .from(platformAuditLog)
    .where(inArray(platformAuditLog.action, [...LOCK_ACTIONS]))
    .orderBy(desc(platformAuditLog.occurredAt))
    .limit(1);

  const last = rows[0];
  if (!last) return { locked: false, by: null, at: null, reason: null };

  return {
    locked: last.action === AUDIT_ACTIONS.SUPPORT_LOCK_ENGAGED,
    by: last.actorLabel,
    at: last.occurredAt,
    reason: last.reason,
  };
}

export type BreakGlassResult = {
  locked: boolean;
  /** Support sessions revoked by engaging the lock. Zero when releasing. */
  revoked: number;
};

/**
 * Engage or release the lock.
 *
 * ⚠ THE REASON IS REQUIRED IN BOTH DIRECTIONS. Engaging is obvious — an
 * incident has a name. Releasing matters as much and is the one people skip:
 * "we locked support at 14:02" with no matching account of why it was safe to
 * reopen at 15:40 is half a story, and the half that is missing is the half a
 * security review asks about.
 */
export async function setBreakGlass(
  input: { lock: boolean; reason: string },
  actor: PlatformActor,
): Promise<BreakGlassResult> {
  const reason = input.reason.trim();
  if (reason.length < 8) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: input.lock
        ? 'Say what happened. This is the entry an incident review starts from.'
        : 'Say why it is safe to reopen. A lock with no account of its release is half a record.',
    });
  }

  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: input.lock ? AUDIT_ACTIONS.SUPPORT_LOCK_ENGAGED : AUDIT_ACTIONS.SUPPORT_LOCK_RELEASED,
      entityType: 'platform',
      reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      /* `asService` has already written the event that IS the new state, before
         this body runs. Nothing further is needed to change the lock — which is
         the whole point of the design and the reason this function is short. */

      if (!input.lock) return { locked: false, revoked: 0 };

      /**
       * ⚠ OPEN SESSIONS ARE CLOSED, NOT LEFT TO EXPIRE.
       *
       * A support session runs for thirty minutes. A lock that only refused NEW
       * sessions would leave colleagues inside customer workspaces for up to
       * half an hour after an incident was declared — which is the window the
       * control exists to close. They are revoked in the same transaction as
       * the event that locked it, so there is no moment where the platform is
       * locked on paper and still inside somebody's data.
       */
      const revoked = await tx
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(sessions.kind, 'support'),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date()),
          ),
        )
        .returning({ id: sessions.id });

      return {
        locked: true,
        revoked: revoked.length,
      };
    },
  );
}
