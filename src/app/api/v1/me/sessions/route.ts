import { resolveSessionDoor } from '@/lib/auth/resolve';
import { listActiveSessions, revokeAllSessions } from '@/lib/auth/session';
import { AUDIT_ACTIONS, writeAudit } from '@/lib/audit';
import { withTenantContext } from '@/lib/db';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/**
 * 07 §3 · `GET /v1/me/sessions` and `DELETE /v1/me/sessions`.
 *
 * Requirement 3 asks for session management a user can act on, and the thing
 * that makes it actionable is not the list — it is that every row carries
 * enough for a person to recognise it. A row reading "session 9f2a-…" tells
 * nobody whether to revoke it. Device, place and last activity do.
 */

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

/**
 * "Revoke all except the current." The exception is not a convenience.
 *
 * Signing someone out of the tab they are using to sign out their other
 * devices is a hostile way to confirm the action worked: the confirmation
 * they get is a login screen, which is indistinguishable from an error. So
 * this session survives, and the count returned names how many did not.
 */
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
