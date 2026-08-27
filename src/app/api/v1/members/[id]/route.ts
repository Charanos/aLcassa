import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { removeMember } from '@/modules/membership';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/**
 * 07 §5 · `DELETE /v1/members/:id`. "owner, admin (agents only)."
 *
 * The parenthetical is a second, narrower rule inside the first: an admin
 * reaches this route, but may only remove agents. That distinction cannot be
 * expressed in the `roles` array — it depends on the TARGET's role, which is
 * not known until the row is read — so it lives in `removeMember`, next to
 * the owner check it belongs with.
 */
export const DELETE = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner', 'admin'],
  paramsSchema: z.object({ id: z.string().uuid() }),
  handle: async ({ ctx, params, requestId }) => {
    await removeMember(ctx, params.id);
    return jsonOk({ removed: params.id }, { requestId });
  },
});
