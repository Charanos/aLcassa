import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { userProfiles } from '@/db/schema';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { withTenantContext } from '@/lib/db';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { AUDIT_ACTIONS, audited } from '@/lib/audit';
import { loadMe } from '@/modules/identity';

/**
 * 07 §3 · `GET /v1/me` — "everything needed to render the shell in one round
 * trip."
 *
 * That sentence is a performance requirement and an isolation one at the same
 * time. A shell assembled from six calls is six chances to render half a
 * workspace before the seventh fails, and six places for a tenant id to be
 * passed as an argument. One call, resolved from the session, is neither.
 *
 * The `supportMode` field comes from the server for the reason design sheet
 * 07 gives: a boundary frame the client could suppress by editing a URL would
 * be worthless.
 */
export const GET = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  handle: async ({ ctx, requestId }) => {
    const me = await loadMe(ctx);
    return jsonOk(me, { requestId });
  },
});

/**
 * 07 §3 · `PATCH /v1/me` — "name, avatar".
 *
 * Every role may edit their own profile: it is theirs, and the row is guarded
 * by `user_profiles_modify`, which admits only `id = current_actor_id()`. So
 * no `roles` clause here is correct rather than an omission — the narrowest
 * possible check is already in the database.
 *
 * ⚠ EXCEPT UNDER SUPPORT MODE, where the same policy adds
 * `and not app.is_support_session()`. A support session acting as somebody
 * would be writing to that person's identity row under their name, which
 * 01 D-13 lists as one of the three permanent carve-outs. The write is
 * refused by the policy, not by a check here, which is why it cannot be
 * forgotten.
 */
export const PATCH = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  bodySchema: z.object({
    fullName: z.string().trim().min(1, 'Enter your name.').max(120),
    avatarPath: z.string().trim().max(500).nullable().optional(),
  }),
  handle: async ({ ctx, body, requestId }) => {
    const updated = await withTenantContext(ctx, async (tx) => {
      const [before] = await tx
        .select({ fullName: userProfiles.fullName, avatarPath: userProfiles.avatarPath })
        .from(userProfiles)
        .where(eq(userProfiles.id, ctx.actorId))
        .limit(1);

      return audited(
        tx,
        ctx,
        {
          action: AUDIT_ACTIONS.PROFILE_UPDATED,
          entityType: 'user_profile',
          entityId: ctx.actorId,
          before,
          after: { fullName: body.fullName, avatarPath: body.avatarPath ?? before?.avatarPath },
        },
        async () => {
          const [row] = await tx
            .update(userProfiles)
            .set({
              fullName: body.fullName,
              ...(body.avatarPath !== undefined ? { avatarPath: body.avatarPath } : {}),
              updatedAt: new Date(),
            })
            .where(eq(userProfiles.id, ctx.actorId))
            .returning({
              id: userProfiles.id,
              fullName: userProfiles.fullName,
              avatarPath: userProfiles.avatarPath,
            });
          return row;
        },
      );
    });

    return jsonOk(updated, { requestId });
  },
});
