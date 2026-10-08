import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { readTenantRules } from '@/modules/aiRules';

export const GET = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner', 'admin', 'support'],
  handle: async ({ ctx, requestId }) =>
    jsonOk((await readTenantRules(ctx)).versions, {
      requestId,
      headers: { 'Cache-Control': 'no-store' },
    }),
});
