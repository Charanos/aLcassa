import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { resendInvitation } from '@/modules/membership';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/** Resending uses the existing seat reservation; the membership service enforces the invitation resend limit. */
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
