import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { resendInvitation } from '@/modules/membership';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/**
 * 07 §5 · `POST /v1/invitations/:id/resend`. Owner and admin.
 * "Rate limited per invitation."
 *
 * ⚠ NO `entitlement` CLAUSE, AND THAT IS NOT AN OVERSIGHT.
 *
 * The seat was consumed when the invitation was first sent. Charging it again
 * on a resend would mean an owner on a five-seat plan could exhaust their
 * allowance by helping one person whose email went to spam — and the seat
 * would only come back when the invitation was withdrawn, which is the one
 * thing they are trying not to do.
 *
 * The rate limit lives in the service, expressed as the remaining life of the
 * existing link rather than as a counter. See `resendInvitation` for why that
 * is the cheaper control.
 */
export const POST = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner', 'admin'],
  paramsSchema: z.object({ id: z.string().uuid() }),
  handle: async ({ ctx, params, requestId }) => {
    const invitation = await resendInvitation(ctx, params.id);

    return jsonOk(
      {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt.toISOString(),
        // The previous link is dead, so the interface must offer the new one
        // when delivery failed. Returned on the same terms as the original
        // invitation: only useful when we could not send it ourselves.
        acceptUrl: invitation.delivery.sent ? null : `/invite/${invitation.token}`,
        delivery: invitation.delivery,
      },
      { requestId },
    );
  },
});
