import { z } from 'zod';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { revokeCredential } from '@/modules/credentials';

export const DELETE = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner'],
  paramsSchema: z.object({ id: z.string().uuid() }),
  handle: async ({ ctx, params, request, requestId }) => {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);
    return jsonOk(await revokeCredential(ctx, params.id), {
      requestId,
      headers: { 'Cache-Control': 'no-store' },
    });
  },
});
