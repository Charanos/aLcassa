import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { restoreTenantRules } from '@/modules/aiRules';

export const POST = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner', 'admin', 'support'],
  paramsSchema: z.object({ versionId: z.string().uuid() }),
  bodySchema: z.object({ revision: z.unknown(), changeNote: z.string() }).strict(),
  handle: async ({ ctx, body, params, request, requestId }) => {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);
    const result = await restoreTenantRules(ctx, { ...body, versionId: params.versionId });
    for (const path of [
      '/app/settings/ai-rules',
      '/app/settings/audit',
      '/app/settings/subscription',
    ])
      revalidatePath(path);
    return jsonOk(result, { requestId, headers: { 'Cache-Control': 'no-store' } });
  },
});
