import { z } from 'zod';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { createCredential, listCredentials } from '@/modules/credentials';

export const GET = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner'],
  handle: async ({ ctx, requestId }) =>
    jsonOk(await listCredentials(ctx), { requestId, headers: { 'Cache-Control': 'no-store' } }),
});

export const POST = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner'],
  bodySchema: z
    .object({
      name: z.string(),
      scopes: z.array(z.string()),
      environment: z.enum(['live', 'test']).optional(),
      rotateFromId: z.string().uuid().optional(),
    })
    .strict(),
  handle: async ({ ctx, body, request, requestId }) => {
    if (request.headers.get('origin') !== new URL(request.url).origin)
      throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);
    const result = await createCredential(ctx, {
      ...body,
      requestKey: request.headers.get('idempotency-key'),
    });
    return jsonOk(result, {
      requestId,
      status: result.replayed ? 200 : 201,
      headers: { 'Cache-Control': 'no-store' },
    });
  },
});
