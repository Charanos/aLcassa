import { resolveSessionDoor } from '@/lib/auth/resolve';
import { listActiveSessions } from '@/lib/auth/session';
import { endOwnSessions } from '@/modules/identity';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/** Include device, location and activity metadata so users can recognize their sessions. */

export const GET = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  handle: async ({ ctx, requestId }) => {
    const rows = await listActiveSessions(ctx.actorId, requestId);

    return jsonOk(
      rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        userAgent: row.userAgent,
        ipAddress: row.ipAddress,
        lastActivityAt: row.lastActivityAt.toISOString(),
        expiresAt: row.expiresAt.toISOString(),
        // Design sheet 09: the current session is marked rather than hidden.
        // Hiding it makes the list look wrong — a person knows they are
        // signed in on this device and its absence reads as a bug.
        current: row.id === ctx.sessionId,
      })),
      { requestId, meta: { total: rows.length } },
    );
  },
});

/** Keep the current session active when revoking other devices. */
export const DELETE = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  handle: async ({ ctx, requestId }) => {
    const { count } = await endOwnSessions(ctx, 'all');
    return jsonOk({ revoked: count }, { requestId });
  },
});
