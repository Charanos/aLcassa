import { resolveSessionDoor } from '@/lib/auth/resolve';
import { listActiveSessions, revokeAllSessions } from '@/lib/auth/session';
import { AUDIT_ACTIONS, writeAudit } from '@/lib/audit';
import { withTenantContext } from '@/lib/db';
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
    const revoked = await revokeAllSessions(
      ctx.actorId,
      requestId,
      'revoked by the account holder',
      ctx.sessionId ?? undefined,
    );

    // 05 §9. Revocation is a security event and belongs in the tenant's own
    // trail: it is one of the things an owner reviewing an incident looks for.
    await withTenantContext(ctx, async (tx) => {
      await writeAudit(tx, ctx, {
        action: AUDIT_ACTIONS.SESSION_REVOKED,
        entityType: 'session',
        entityId: null,
        after: { revokedCount: revoked, scope: 'all-except-current' },
      });
    });

    return jsonOk({ revoked }, { requestId });
  },
});
