import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { listActiveSessions, revokeSession } from '@/lib/auth/session';
import { AUDIT_ACTIONS, writeAudit } from '@/lib/audit';
import { withTenantContext } from '@/lib/db';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/** Return 404 for another user's session. Revoking the current session signs the caller out. */
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
