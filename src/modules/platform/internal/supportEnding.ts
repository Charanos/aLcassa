import 'server-only';
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { auditLog, sessions, type SupportEndReason } from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import type { Transaction } from '@/lib/db';
import type { ServiceTransaction } from '@/lib/db/serviceClient';

/**
 * How support sessions END. Doc 24 · Stage 2.
 *
 * Its own file because two callers close sessions — `support.ts` (exit,
 * replacement) and `breakGlass.ts` (the lock) — and `support.ts` already
 * imports break glass. Every ending in the platform module goes through
 * `closeSessions`; the two that cannot (the timer, and the customer ending a
 * visit from their own workspace) are definer functions in 02_identity.sql
 * that write the same rows.
 */

const REVOKED_REASON: Record<SupportEndReason, string> = {
  operator: 'exited by the operator',
  colleague: 'ended by another operator',
  customer: 'ended by the customer',
  expired: 'reached the thirty-minute limit',
  superseded: 'superseded by a new support session',
  break_glass: 'support access locked platform-wide',
};

/**
 * End the given support sessions, once each, with both kinds of record.
 *
 * Exported for break glass, which closes every open session in its own
 * transaction. The customer's row is written only for sessions this call
 * actually closed — the update's `returning` is the list — so a session
 * already over produces nothing, not a second ending.
 */
export async function closeSessions(
  tx: ServiceTransaction,
  sessionIds: string[],
  ending: {
    endReason: Exclude<SupportEndReason, 'expired' | 'customer'>;
    endedBy: string;
    endedByLabel: string;
    requestId: string;
    ipAddress?: string | null;
  },
): Promise<Array<{ id: string; tenantId: string }>> {
  if (sessionIds.length === 0) return [];

  const closed = await tx
    .update(sessions)
    .set({
      revokedAt: new Date(),
      revokedReason: REVOKED_REASON[ending.endReason],
      endReason: ending.endReason,
      endedBy: ending.endedBy,
      updatedAt: new Date(),
    })
    .where(
      and(
        inArray(sessions.id, sessionIds),
        eq(sessions.kind, 'support'),
        isNull(sessions.revokedAt),
      ),
    )
    .returning({ id: sessions.id, tenantId: sessions.tenantId, context: sessions.supportContext });

  for (const row of closed) {
    if (!row.tenantId) continue;
    await tx.insert(auditLog).values({
      tenantId: row.tenantId,
      actorUserId: ending.endedBy,
      actorType: 'platform_admin',
      actorLabel: ending.endedByLabel,
      supportMode: true,
      action: AUDIT_ACTIONS.SUPPORT_EXITED,
      entityType: 'support_session',
      entityId: row.id,
      after: {
        endReason: ending.endReason,
        platformAdminName: row.context?.platformAdminName ?? null,
      },
      ipAddress: ending.ipAddress ?? null,
      requestId: ending.requestId,
    });
  }

  return closed.flatMap((r) => (r.tenantId ? [{ id: r.id, tenantId: r.tenantId }] : []));
}

/**
 * Close every lapsed support session, writing each ending at its expiry.
 * Returns how many it closed. Cheap, idempotent, and silent when there is
 * nothing to do — see `app.close_lapsed_support_sessions` for why it is a
 * definer function rather than a service-role call.
 */
export async function closeLapsedSupportSessions(tx: Transaction): Promise<number> {
  const rows = await tx.execute<{ n: number }>(
    sql`select app.close_lapsed_support_sessions() as n`,
  );
  const first = (rows as unknown as Array<{ n: number }>)[0];
  return Number(first?.n ?? 0);
}
