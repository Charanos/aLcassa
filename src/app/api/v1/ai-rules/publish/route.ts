import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { publishTenantRules } from '@/modules/aiRules';

export const POST = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner', 'admin', 'support'],
  bodySchema: z.unknown(),
  handle: async ({ ctx, body, request, requestId }) => {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);
    const result = await publishTenantRules(ctx, body);
    for (const path of [
      '/app/settings/ai-rules',
      '/app/settings/audit',
      '/app/settings/subscription',
    ])
      revalidatePath(path);
    return jsonOk(result, { requestId, status: 201, headers: { 'Cache-Control': 'no-store' } });
  },
});
