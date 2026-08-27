import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { invitations } from '@/db/schema';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { withTenantContext } from '@/lib/db';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { inviteMember } from '@/modules/membership';

/** 07 §5 · `GET /v1/invitations`. Owner and admin. */
export const GET = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner', 'admin'],
  handle: async ({ ctx, requestId }) => {
    const rows = await withTenantContext(ctx, async (tx) =>
      tx
        .select({
          id: invitations.id,
          email: invitations.email,
          role: invitations.role,
          expiresAt: invitations.expiresAt,
          createdAt: invitations.createdAt,
        })
        .from(invitations)
        .where(
          and(
            eq(invitations.tenantId, ctx.tenantId),
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
          ),
        )
        .orderBy(desc(invitations.createdAt)),
    );

    return jsonOk(
      rows.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
        expiresAt: row.expiresAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
        // Sheet 12: an expired invitation is not an error, it is a state with
        // a remedy. The list shows it and offers to send a fresh one rather
        // than hiding it and leaving the owner wondering why nobody joined.
        expired: row.expiresAt.getTime() <= Date.now(),
      })),
      { requestId, meta: { total: rows.length } },
    );
  },
});

/**
 * 07 §5 · `POST /v1/invitations`. Owner and admin.
 * "Passes through the entitlement guard on `seats`."
 *
 * ⚠ THE GUARD IS DECLARED HERE AND ALSO CALLED IN THE SERVICE, AND THAT IS
 *   NOT REDUNDANT.
 *
 * The pipeline's stage 4 refuses before the handler runs, so an over-limit
 * request never reaches the database — which is what makes the refusal cheap
 * and the error message consistent across both doors. `inviteMember` calls it
 * again because it is also reachable from the console's provisioning path,
 * which does not come through this route. A guard that only exists at the
 * edge is a guard with a back door.
 */
export const POST = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner', 'admin'],
  entitlement: { key: 'seats', delta: 1 },
  bodySchema: z.object({
    email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
    role: z.enum(['admin', 'agent']),
  }),
  handle: async ({ ctx, body, requestId }) => {
    const invitation = await inviteMember(ctx, { email: body.email, role: body.role });

    /**
     * ⚠ THE TOKEN IS RETURNED IN THE RESPONSE, AND THAT IS TEMPORARY.
     *
     * There is no mail transport wired yet, so the only way an invitation can
     * reach anybody is for the interface to show the link and let the owner
     * send it themselves. This is stated rather than hidden because it has a
     * real consequence: the token appears in a response body, so it is in
     * whatever logs that response. When transactional mail lands (M5), this
     * field goes and the token never leaves the server.
     */
    return jsonOk(
      {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
        acceptUrl: `/invite/${invitation.token}`,
        deliveryPending: true,
      },
      { status: 201, requestId },
    );
  },
});
