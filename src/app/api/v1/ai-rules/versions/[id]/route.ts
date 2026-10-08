import { z } from 'zod';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { readTenantRules } from '@/modules/aiRules';

export const GET = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner', 'admin', 'support'],
  paramsSchema: z.object({ id: z.string().uuid() }),
  handle: async ({ ctx, params, requestId }) => {
    const version = (await readTenantRules(ctx)).versions.find((row) => row.id === params.id);
    if (!version) throw new AppError(ERROR_CODES.NOT_FOUND);
    return jsonOk(version, { requestId, headers: { 'Cache-Control': 'no-store' } });
  },
});
