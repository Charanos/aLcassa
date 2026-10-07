import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { revokeInvitation } from '@/modules/membership';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/** Invitation withdrawal returns its reserved seat in the same transaction. */
export const DELETE = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner', 'admin'],
  paramsSchema: z.object({ id: z.string().uuid() }),
  handle: async ({ ctx, params, requestId }) => {
    await revokeInvitation(ctx, params.id);
    return jsonOk({ revoked: params.id }, { requestId });
  },
});
