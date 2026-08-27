import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { changeMemberRole } from '@/modules/membership';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';

/**
 * 07 §5 · `PATCH /v1/members/:id/role`. Owner only.
 * "Rejects `member.last_owner`."
 *
 * The role enum here deliberately EXCLUDES `owner`. A workspace has exactly
 * one owner (06 §5), so promotion is not a role change — it is a transfer,
 * which demotes the incumbent in the same transaction and lives at
 * `/v1/tenant/transfer-ownership`. Leaving `owner` in this enum and rejecting
 * it in the service would work, but it would mean the API's own contract
 * advertised an operation that always fails.
 */
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
