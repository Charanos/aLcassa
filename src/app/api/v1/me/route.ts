import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { loadMe, updateOwnProfile } from '@/modules/identity';

/** Resolve shell identity and support state in one server-authorized request. */
export const GET = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  handle: async ({ ctx, requestId }) => {
    const me = await loadMe(ctx);
    return jsonOk(me, { requestId });
  },
});

/** Users may edit their own profiles; support sessions cannot alter another person's identity. */
export const PATCH = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  bodySchema: z.object({
    fullName: z.string().trim().min(1, 'Enter your name.').max(120),
    avatarPath: z.string().trim().max(500).nullable().optional(),
  }),
  handle: async ({ ctx, body, requestId }) => {
    const updated = await updateOwnProfile(ctx, body.fullName, body.avatarPath);
    return jsonOk(updated, { requestId });
  },
});
