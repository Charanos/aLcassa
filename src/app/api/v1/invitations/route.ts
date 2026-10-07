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

/** Check seats before the handler and again in the service so direct callers cannot bypass enforcement. */
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

    /** Return the bearer invitation link only when mail delivery fails and the owner needs to share it. */
    return jsonOk(
      {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
        acceptUrl: invitation.delivery.sent ? null : `/invite/${invitation.token}`,
        delivery: invitation.delivery,
      },
      { status: 201, requestId },
    );
  },
});
