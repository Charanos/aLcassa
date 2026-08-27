import 'server-only';
import { eq } from 'drizzle-orm';
import { userProfiles } from '@/db/schema';
import { AUDIT_ACTIONS, audited } from '@/lib/audit';
import { withTenantContext } from '@/lib/db';
import type { ResolvedContext } from '@/lib/db/context';

/**
 * 07 §3 · `PATCH /v1/me`. A person editing their own name.
 *
 * ⚠ THERE IS NO `userId` PARAMETER, AND THAT IS THE WHOLE SAFETY ARGUMENT.
 *
 * The row updated is always `ctx.actorId`. There is no argument a caller
 * could pass to edit somebody else's profile, so the "can I edit this
 * person" question never arises and cannot be answered wrongly. The database
 * agrees independently: `user_profiles_modify` admits only
 * `id = app.current_actor_id()`, so even a rewritten version of this function
 * would update zero rows rather than the wrong one.
 *
 * ⚠ AND IT IS REFUSED UNDER SUPPORT MODE.
 *
 * The same policy carries `and not app.is_support_session()`. 01 D-13 opened
 * support mode to read and write, with three permanent carve-outs, and this
 * is one of them: a support session writing to a member's identity row would
 * be changing who that person appears to be, under their own name, in every
 * audit entry that follows. The refusal is the policy's, so it holds whether
 * or not any caller remembers it.
 */
export async function updateOwnProfile(
  ctx: ResolvedContext,
  fullName: string,
  avatarPath?: string | null,
): Promise<{ id: string; fullName: string; avatarPath: string | null }> {
  return withTenantContext(ctx, async (tx) => {
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
        after: { fullName, avatarPath: avatarPath ?? before?.avatarPath ?? null },
      },
      async () => {
        const [row] = await tx
          .update(userProfiles)
          .set({
            fullName,
            ...(avatarPath !== undefined ? { avatarPath } : {}),
            updatedAt: new Date(),
          })
          .where(eq(userProfiles.id, ctx.actorId))
          .returning({
            id: userProfiles.id,
            fullName: userProfiles.fullName,
            avatarPath: userProfiles.avatarPath,
          });

        if (!row) {
          // Zero rows means the policy refused — a support session, or a
          // context whose actor does not match the row. Both are the
          // carve-out above doing its job, so this is not an internal error.
          throw new Error('The profile could not be updated under this session.');
        }
        return row;
      },
    );
  });
}
