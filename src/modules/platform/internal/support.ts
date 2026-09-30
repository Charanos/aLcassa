import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';
import {
  auditLog,
  platformAuditLog,
  sessions,
  tenantMembers,
  tenants,
  userProfiles,
  type SupportContext,
} from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { withActorContext, type Transaction } from '@/lib/db';
import { asService } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { breakGlassState } from './breakGlass';
import { closeLapsedSupportSessions, closeSessions } from './supportEnding';
import { requireCapability } from './capabilities';
import type { PlatformActor } from './subscriptions';

/**
 * 09 §3 · 09 §4 · 09 §7 · 04 §6. SUPPORT SESSIONS. Rebuilt for doc 24.
 *
 * ⚠ A SUPPORT SESSION IS AN ORDINARY ROW IN `sessions`, AND THAT IS THE
 *   WHOLE SECURITY ARGUMENT. `kind = 'support'`, `effective_role = 'support'`:
 *   RLS reads the tenant and the role from it exactly as it does for the
 *   customer's own staff, so the ceiling — and the three permanent carve-outs
 *   — apply to the platform by construction, not by convention.
 *
 * ⚠ THE COOKIE CARRIES A ROW ID AND NOTHING ELSE. Authority rests in the row,
 *   re-read on every request; a revoked or lapsed row resolves to nothing.
 *
 * ⚠ EVERY VISIT HAS A BEGINNING AND AN END IN BOTH LOGS. Doc 24 found the
 *   customer's log telling half the story: a visit that ran to the cap, one
 *   replaced by a new session, and one closed by break glass all ended with
 *   nothing written, and ending twice wrote two exits. Now every ending goes
 *   through `closeSessions` (or, for the timer and the customer, a definer
 *   function in 02_identity.sql that does the same), writes the reason on the
 *   row as `end_reason`, and writes exactly one row per ending — because the
 *   write is conditional on the update having changed something.
 *
 * ⚠ READS NO LONGER WRITE AUDIT ROWS. `readSupportSession` ran through the
 *   service role, and the console layout and the page each called it, so every
 *   navigation inside a session wrote two rows flagged as bypassing RLS. It is
 *   an operator reading their own row now (doc 24 · D1).
 */

/** 09 §3. Thirty minutes from entry — an absolute cap, not an idle timer. */
export const SUPPORT_SESSION_DURATION_MS = 30 * 60 * 1000;
/** Doc 24 · D2. Extending is offered only in the last five minutes… */
export const SUPPORT_EXTENSION_WINDOW_MS = 5 * 60 * 1000;
/** …and at most twice. Beyond ninety minutes, a new session with a new reason. */
export const SUPPORT_MAX_EXTENSIONS = 2;
/** Reasons the customer reads, so they get a floor and a ceiling. */
const REASON_MIN = 8;
const REASON_MAX = 500;

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
  extensions: number;
};

/** The owners to tell, returned so the caller can send after the commit. */
export type StartedSupportSession = SupportSessionRecord & { notify: string[] };

/**
 * Open a support session.
 *
 * ⚠ THE REASON IS REQUIRED — 01 D-13 made support read-and-write, which was
 * the condition 09 §3's argument for requiring it was contingent on.
 *
 * ⚠ A REFUSED ATTEMPT IS RECORDED. Doc 24 · S0.8. The refusals that matter —
 * break glass, a missing capability — are thrown inside `asService`, whose
 * audit row shares the transaction and so rolled back with them. The comment
 * that used to sit here claimed the attempt was "itself worth recording" and
 * that the row survived; it did not. A refusal now writes
 * `support.entry_refused` in its own transaction, as the operator, to the
 * platform log only — nothing happened to the customer's workspace.
 */
export async function startSupportSession(
  input: { tenantId: string; reason: string },
  actor: PlatformActor,
): Promise<StartedSupportSession> {
  const reason = input.reason.trim().replace(/\s+/g, ' ');

  if (reason.length < REASON_MIN || reason.length > REASON_MAX) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message:
        reason.length < REASON_MIN
          ? 'A reason is required, and the customer reads it — so write it for them rather than for us.'
          : `Keep the reason under ${REASON_MAX} characters. The customer reads it in a line, not a letter.`,
      details: [
        { field: 'reason', code: ERROR_CODES.VALIDATION_FAILED, message: 'Give a reason.' },
      ],
    });
  }

  const expiresAt = new Date(Date.now() + SUPPORT_SESSION_DURATION_MS);

  try {
    return await asService(
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
        await requireCapability(tx, actor.userId, 'enter_support_mode');

        /* Break glass is enforced where sessions are minted, and only here:
           a session is the one thing the lock withholds. breakGlass.ts. */
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

        /* The record first: anything that lapsed is closed at its own expiry,
           so the "one open session per workspace" rule below sees the truth. */
        await closeLapsedSupportSessions(tx);

        /**
         * One live support session per workspace. The customer's frame names
         * ONE person and their reason; a second concurrent session would act
         * on their data invisibly. The first is closed, and — unlike before —
         * the closing is written to both logs.
         */
        const open = await tx
          .select({ id: sessions.id })
          .from(sessions)
          .where(
            and(
              eq(sessions.tenantId, tenant.id),
              eq(sessions.kind, 'support'),
              isNull(sessions.revokedAt),
            ),
          );
        await closeSessions(
          tx,
          open.map((o) => o.id),
          {
            endReason: 'superseded',
            endedBy: actor.userId,
            endedByLabel: actor.label,
            requestId: actor.requestId,
            ipAddress: actor.ipAddress,
          },
        );

        const context: SupportContext = {
          platformAdminId: actor.userId,
          platformAdminName: actor.label,
          reason,
          enteredAt: new Date().toISOString(),
          extensions: 0,
        };

        const [row] = await tx
          .insert(sessions)
          .values({
            userId: actor.userId,
            kind: 'support',
            tenantId: tenant.id,
            // 06 §5. The role RLS will read, and what the carve-outs key on.
            effectiveRole: 'support',
            supportContext: context,
            ipAddress: actor.ipAddress ?? null,
            lastActivityAt: new Date(),
            expiresAt,
          })
          .returning({ id: sessions.id, createdAt: sessions.createdAt });
        if (!row) throw new Error('the support session row could not be created');

        /* 09 §4 · §7. The customer's own log — the row that makes the
           transparency claim true. */
        await tx.insert(auditLog).values({
          tenantId: tenant.id,
          actorUserId: actor.userId,
          actorType: 'platform_admin',
          actorLabel: actor.label,
          supportMode: true,
          action: AUDIT_ACTIONS.SUPPORT_ENTERED,
          entityType: 'support_session',
          entityId: row.id,
          after: { reason, expiresAt: expiresAt.toISOString(), platformAdminName: actor.label },
          ipAddress: actor.ipAddress ?? null,
          requestId: actor.requestId,
        });

        /* Doc 24 · D3. Who to tell. Read here, sent by the caller after the
           commit — an email is not something a rollback can take back. */
        const owners = await tx
          .select({ email: userProfiles.email })
          .from(tenantMembers)
          .innerJoin(userProfiles, eq(userProfiles.id, tenantMembers.userId))
          .where(
            and(
              eq(tenantMembers.tenantId, tenant.id),
              eq(tenantMembers.role, 'owner'),
              eq(tenantMembers.status, 'active'),
              isNull(tenantMembers.deletedAt),
            ),
          );

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
          extensions: 0,
          notify: owners.flatMap((o) => (o.email ? [o.email] : [])),
        };
      },
    );
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === ERROR_CODES.SUPPORT_NOT_PERMITTED ||
        error.code === ERROR_CODES.PLATFORM_CAPABILITY_MISSING)
    ) {
      await recordRefusal(input.tenantId, reason, error.message, actor);
    }
    throw error;
  }
}

async function recordRefusal(
  tenantId: string,
  statedReason: string,
  refusal: string,
  actor: PlatformActor,
): Promise<void> {
  try {
    await withActorContext(actor.userId, actor.requestId, (tx) =>
      tx.insert(platformAuditLog).values({
        actorUserId: actor.userId,
        actorLabel: actor.label,
        action: AUDIT_ACTIONS.SUPPORT_ENTRY_REFUSED,
        targetTenantId: tenantId,
        entityType: 'support_session',
        usedServiceRole: false,
        reason: `${refusal} Stated reason: "${statedReason}"`,
        ipAddress: actor.ipAddress ?? null,
        requestId: actor.requestId,
      }),
    );
  } catch (error) {
    /* The refusal stands either way; failing to record it must not turn a
       clear "no" into a confusing error. It is logged for the operator. */
    logger.error('support entry refusal could not be recorded', { error, tenantId });
  }
}

type SessionRow = {
  id: string;
  userId: string;
  tenantId: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  supportContext: SupportContext | null;
  tenantSlug: string;
  tenantName: string;
};

async function readRow(tx: Transaction, sessionId: string): Promise<SessionRow | null> {
  const [row] = await tx
    .select({
      id: sessions.id,
      userId: sessions.userId,
      tenantId: sessions.tenantId,
      expiresAt: sessions.expiresAt,
      revokedAt: sessions.revokedAt,
      createdAt: sessions.createdAt,
      supportContext: sessions.supportContext,
      tenantSlug: tenants.slug,
      tenantName: tenants.name,
    })
    .from(sessions)
    .innerJoin(tenants, eq(tenants.id, sessions.tenantId))
    .where(and(eq(sessions.id, sessionId), eq(sessions.kind, 'support')))
    .limit(1);
  return row ?? null;
}

function isLive(row: SessionRow): boolean {
  return !row.revokedAt && row.expiresAt.getTime() > Date.now();
}

/**
 * End a support session from the console. Doc 24 · D5.
 *
 * The operator who opened it ends it as `operator`; any other operator may end
 * it too, as `colleague`, and both logs say so. Ending is not capability-gated:
 * an exit that can be refused traps somebody inside a workspace.
 *
 * Idempotent: a session already over returns null and writes nothing.
 */
export async function endSupportSession(
  sessionId: string,
  actor: PlatformActor,
): Promise<{ tenantId: string; endReason: 'operator' | 'colleague' } | null> {
  const row = await withActorContext(actor.userId, actor.requestId, (tx) => readRow(tx, sessionId));
  if (!row?.tenantId || !isLive(row)) return null;

  const endReason = row.userId === actor.userId ? 'operator' : 'colleague';
  const owner = row.supportContext?.platformAdminName ?? 'another operator';

  try {
    return await asService(
      {
        actorUserId: actor.userId,
        actorLabel: actor.label,
        action: AUDIT_ACTIONS.SUPPORT_EXITED,
        targetTenantId: row.tenantId,
        entityType: 'support_session',
        entityId: row.id,
        reason:
          endReason === 'operator' ? 'support session ended' : `ended ${owner}'s support session`,
        requestId: actor.requestId,
        ipAddress: actor.ipAddress ?? null,
      },
      async (tx) => {
        const closed = await closeSessions(tx, [row.id], {
          endReason,
          endedBy: actor.userId,
          endedByLabel: actor.label,
          requestId: actor.requestId,
          ipAddress: actor.ipAddress,
        });
        /* Lost a race with another ending: undo the platform row too. */
        if (closed.length === 0) throw new AlreadyEnded();
        return { tenantId: row.tenantId as string, endReason };
      },
    );
  } catch (error) {
    if (error instanceof AlreadyEnded) return null;
    throw error;
  }
}

class AlreadyEnded extends Error {}

/**
 * The operator's own live support session, re-read and re-checked.
 *
 * ⚠ AUTHORITY RESTS HERE, NOT IN THE COOKIE. Revoked, lapsed, or belonging to
 * another operator all resolve to null — a copied cookie enters nobody's
 * grant. Read as the operator (their own row), so it writes no audit row.
 */
export async function readSupportSession(
  sessionId: string,
  actor: PlatformActor,
): Promise<SupportSessionRecord | null> {
  const row = await withActorContext(actor.userId, actor.requestId, (tx) => readRow(tx, sessionId));
  if (!row?.tenantId || !isLive(row) || row.userId !== actor.userId) return null;
  return toRecord(row, actor.label);
}

function toRecord(row: SessionRow, fallbackName: string): SupportSessionRecord {
  return {
    id: row.id,
    tenantId: row.tenantId as string,
    tenantSlug: row.tenantSlug,
    tenantName: row.tenantName,
    platformAdminId: row.userId,
    platformAdminName: row.supportContext?.platformAdminName ?? fallbackName,
    reason: row.supportContext?.reason ?? '',
    expiresAt: row.expiresAt.toISOString(),
    startedAt: row.createdAt.toISOString(),
    extensions: row.supportContext?.extensions ?? 0,
  };
}

/**
 * Extend a session that is about to lapse. Doc 24 · D2.
 *
 * ⚠ IT COULD REVIVE A DEAD SESSION. The old version checked only that the row
 * was not revoked, so a session that had lapsed — but not yet been closed —
 * could be given a fresh thirty minutes after the customer's frame had told
 * them it was over. It must be live now.
 *
 * ⚠ AND IT HAD NO CEILING. Thirty minutes at a time, for ever, turned a cap
 * into a formality. Extending opens in the last five minutes, at most twice;
 * after ninety minutes the operator opens a new session and writes a new
 * reason, which the customer reads again. Each extension is in the
 * customer's log, numbered.
 */
export async function extendSupportSession(
  sessionId: string,
  actor: PlatformActor,
): Promise<{ expiresAt: string; extensions: number }> {
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
      await requireCapability(tx, actor.userId, 'enter_support_mode');

      const [row] = await tx
        .select({
          id: sessions.id,
          tenantId: sessions.tenantId,
          userId: sessions.userId,
          expiresAt: sessions.expiresAt,
          supportContext: sessions.supportContext,
        })
        .from(sessions)
        .where(
          and(
            eq(sessions.id, sessionId),
            eq(sessions.kind, 'support'),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date()),
          ),
        )
        .for('update')
        .limit(1);

      if (!row?.tenantId || row.userId !== actor.userId) {
        throw new AppError(ERROR_CODES.SUPPORT_SESSION_EXPIRED, {
          message: 'That session has already ended. Open a new one to continue.',
        });
      }

      const left = row.expiresAt.getTime() - Date.now();
      if (left > SUPPORT_EXTENSION_WINDOW_MS) {
        throw new AppError(ERROR_CODES.SUPPORT_NOT_PERMITTED, {
          message: `Extending opens in the last five minutes. ${Math.ceil(left / 60_000)} minutes are left.`,
        });
      }

      const used = row.supportContext?.extensions ?? 0;
      if (used >= SUPPORT_MAX_EXTENSIONS) {
        throw new AppError(ERROR_CODES.SUPPORT_NOT_PERMITTED, {
          message:
            'This visit has been extended twice. Open a new session with a new reason — the customer reads it.',
        });
      }

      const extensions = used + 1;
      await tx
        .update(sessions)
        .set({
          expiresAt,
          lastActivityAt: new Date(),
          supportContext: {
            ...(row.supportContext ?? { platformAdminId: actor.userId, enteredAt: '' }),
            extensions,
          },
          updatedAt: new Date(),
        })
        .where(eq(sessions.id, row.id));

      await tx.insert(auditLog).values({
        tenantId: row.tenantId,
        actorUserId: actor.userId,
        actorType: 'platform_admin',
        actorLabel: actor.label,
        supportMode: true,
        action: AUDIT_ACTIONS.SUPPORT_EXTENDED,
        entityType: 'support_session',
        entityId: row.id,
        after: {
          extendedTo: expiresAt.toISOString(),
          extension: extensions,
          of: SUPPORT_MAX_EXTENSIONS,
        },
        ipAddress: actor.ipAddress ?? null,
        requestId: actor.requestId,
      });

      return { expiresAt: expiresAt.toISOString(), extensions };
    },
  );
}
