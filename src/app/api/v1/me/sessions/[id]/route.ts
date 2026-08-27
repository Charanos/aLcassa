import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { listActiveSessions, revokeSession } from '@/lib/auth/session';
import { AUDIT_ACTIONS, writeAudit } from '@/lib/audit';
import { withTenantContext } from '@/lib/db';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/**
 * 07 §3 · `DELETE /v1/me/sessions/:id`. Revoke one session.
 *
 * ⚠ THE 404 FOR SOMEBODY ELSE'S SESSION IS THE CORRECT ANSWER, NOT A 403.
 *
 * 07 §1: "404 not found OR NOT VISIBLE". `listActiveSessions` reads through
 * `sessions_select`, which scopes to the actor, so another user's session is
 * not in the list and the id is simply not found. Answering 403 would confirm
 * that the id names a real session belonging to someone — which is exactly
 * the fact the policy exists to withhold.
 *
 * Revoking the CURRENT session is permitted and behaves as a sign-out: the
 * row goes, and the next request through the door is refused. The client is
 * told which it revoked so it can redirect rather than sit on a dead session.
 */
export const DELETE = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  paramsSchema: z.object({ id: z.string().uuid() }),
  handle: async ({ ctx, params, requestId }) => {
    // Read it through the policy first, so "not mine" and "does not exist"
    // reach the same branch without this handler having to tell them apart.
    const mine = await listActiveSessions(ctx.actorId, requestId);
    const target = mine.find((row) => row.id === params.id);

    if (!target) {
      throw new AppError(ERROR_CODES.NOT_FOUND, {
        message: 'That session is not one of yours, or it has already ended.',
        internal: { sessionId: params.id, actorId: ctx.actorId },
      });
    }

    await revokeSession(target.id, ctx.actorId, requestId, 'revoked by the account holder');

    await withTenantContext(ctx, async (tx) => {
      await writeAudit(tx, ctx, {
        action: AUDIT_ACTIONS.SESSION_REVOKED,
        entityType: 'session',
        entityId: target.id,
        before: {
          kind: target.kind,
          userAgent: target.userAgent,
          lastActivityAt: target.lastActivityAt.toISOString(),
        },
        after: { revoked: true },
      });
    });

    return jsonOk({ revoked: target.id, wasCurrent: target.id === ctx.sessionId }, { requestId });
  },
});
