import 'server-only';
import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import { z } from 'zod';
import { sessions } from '@/db/schema';
import { withTenantContext, type ResolvedContext } from '@/lib/db';
import { AUDIT_ACTIONS, writeAudit } from '@/lib/audit';
import { AppError, ERROR_CODES } from '@/lib/errors';

/** End owned active sessions and record the outcome in the same transaction. */
export async function endOwnSessions(ctx: ResolvedContext, selection: string) {
  if (selection !== 'all' && !z.string().uuid().safeParse(selection).success) {
    throw new AppError(ERROR_CODES.NOT_FOUND, {
      message: 'That session is unavailable or has already ended.',
    });
  }
  if (selection === 'all' && !ctx.sessionId) {
    throw new AppError(ERROR_CODES.NOT_FOUND, {
      message: 'Sign in again before ending other sessions.',
    });
  }
  return withTenantContext(ctx, async (tx) => {
    const ended = await tx
      .update(sessions)
      .set({
        revokedAt: new Date(),
        revokedReason: 'revoked by the account holder',
      })
      .where(
        and(
          eq(sessions.userId, ctx.actorId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
          ne(sessions.kind, 'recovery'),
          selection === 'all' ? ne(sessions.id, ctx.sessionId!) : eq(sessions.id, selection),
        ),
      )
      .returning({
        id: sessions.id,
        kind: sessions.kind,
        userAgent: sessions.userAgent,
        lastActivityAt: sessions.lastActivityAt,
      });
    if (selection !== 'all' && !ended.length) {
      throw new AppError(ERROR_CODES.NOT_FOUND, {
        message: 'That session is unavailable or has already ended.',
      });
    }
    const target = ended[0];
    if (ended.length)
      await writeAudit(tx, ctx, {
        action: AUDIT_ACTIONS.SESSION_REVOKED,
        entityType: 'session',
        entityId: selection === 'all' ? null : target!.id,
        ...(selection === 'all'
          ? { after: { revokedCount: ended.length, scope: 'all-except-current' } }
          : {
              before: {
                kind: target!.kind,
                userAgent: target!.userAgent,
                lastActivityAt: target!.lastActivityAt.toISOString(),
              },
              after: { revoked: true },
            }),
      });
    return { count: ended.length, wasCurrent: ended.some((row) => row.id === ctx.sessionId) };
  });
}
