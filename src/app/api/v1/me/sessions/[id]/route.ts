import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { endOwnSessions } from '@/modules/identity';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/** Return 404 for another user's session. Revoking the current session signs the caller out. */
export const DELETE = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  paramsSchema: z.object({ id: z.string().uuid() }),
  handle: async ({ ctx, params, requestId }) => {
    const { wasCurrent } = await endOwnSessions(ctx, params.id);
    return jsonOk({ revoked: params.id, wasCurrent }, { requestId });
  },
});
