import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { removeMember } from '@/modules/membership';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/** Target-role restrictions belong in removeMember: administrators may remove agents only. */
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
