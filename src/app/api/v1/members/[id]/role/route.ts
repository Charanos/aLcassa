import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { changeMemberRole } from '@/modules/membership';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/** Owner promotion uses the atomic ownership-transfer operation, not an ordinary role update. */
export const PATCH = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner'],
  paramsSchema: z.object({ id: z.string().uuid() }),
  bodySchema: z.object({ role: z.enum(['admin', 'agent']) }),
  handle: async ({ ctx, params, body, requestId }) => {
    await changeMemberRole(ctx, params.id, body.role);
    return jsonOk({ id: params.id, role: body.role }, { requestId });
  },
});
