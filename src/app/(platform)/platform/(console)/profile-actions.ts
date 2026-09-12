'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { userProfiles } from '@/db/schema';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { revokeAllSessions, revokeSession } from '@/lib/auth/session';
import { withoutTenantContext } from '@/lib/db';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { recordPlatformAction } from '@/modules/platform';

/**
 * The operator's own profile. 17 §6.3.
 *
 * ⚠ THESE ARE THE ONLY CONTROLS ON THAT SCREEN THAT COULD BE WIRED, and the
 * rest are inert with a reason rather than pretending.
 *
 * Two-factor enrolment, password change and recovery codes all live in
 * Supabase's `auth.users`, behind the admin client that is lint-guarded to
 * `modules/platform` because it bypasses Row Level Security. Reaching it from
 * a console screen to redraw a checklist would widen that guard for a
 * convenience. Those three stay disabled and say why.
 *
 * The display name and the session list are ours, in our tables, and were
 * dead for no reason at all.
 */

export type ProfileActionResult = { ok: true } | { ok: false; error: string };

/** What a person is allowed to call themselves. Generous, but bounded. */
const NAME_MIN = 2;
const NAME_MAX = 80;

/**
 * Rename yourself.
 *
 * ⚠ IT WRITES `user_profiles`, NOT `auth.users`. 05 §2 states which is the
 * source of truth for an address; for a DISPLAY name the profile row is the
 * only store, and it is the one every screen in both applications reads.
 *
 * ⚠ IT DOES NOT RENAME THE `platform_admins` ROW. That table carries its own
 * `display_name`, written when access was granted, and it is deliberately not
 * updated here: the roster's label is what the person who granted access
 * called them, and letting an admin rewrite their own entry in the access
 * register is the wrong direction for a security record. The roster prefers
 * the profile name when one exists, so the screen still agrees with itself.
 */
export async function updateConsoleProfileName(name: string): Promise<ProfileActionResult> {
  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) {
    return { ok: false, error: `A name is between ${NAME_MIN} and ${NAME_MAX} characters.` };
  }

  try {
    const ctx = await currentPlatformSession();

    await withoutTenantContext(ctx.requestId, async (tx) => {
      await tx
        .update(userProfiles)
        .set({ fullName: trimmed })
        .where(eq(userProfiles.id, ctx.actorId));

      await recordPlatformAction(tx, {
        actorUserId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        action: 'profile.updated',
        entityType: 'user_profile',
        entityId: ctx.actorId,
        ipAddress: ctx.ipAddress,
        requestId: ctx.requestId,
      });
    });

    revalidatePath('/platform/profile');
    revalidatePath('/platform/admins');
    return { ok: true };
  } catch (error) {
    logger.error('console profile name could not be saved', { error });
    return {
      ok: false,
      error: isAppError(error) ? error.message : 'That could not be saved. Try again.',
    };
  }
}

/**
 * End one session on another device.
 *
 * ⚠ IT TAKES EFFECT ON THE NEXT REQUEST, because a session here is a ROW
 * rather than a token the browser holds. That is the property the tenant
 * application's session list already relies on, and it is the difference
 * between revocation and waiting for an expiry.
 *
 * ⚠ IT REFUSES TO END THE CURRENT ONE. Signing yourself out is a different
 * control with a different outcome — a redirect — and conflating them means
 * an operator clearing old devices can log themselves out by misreading a
 * row. "Sign out everywhere" is the deliberate version, and it also spares
 * the current session.
 */
export async function revokeConsoleSession(sessionId: string): Promise<ProfileActionResult> {
  try {
    const ctx = await currentPlatformSession();

    if (sessionId === ctx.sessionId) {
      return { ok: false, error: 'That is this device. Use sign out instead.' };
    }

    await revokeSession(sessionId, ctx.actorId, ctx.requestId, 'revoked by the account holder');

    await withoutTenantContext(ctx.requestId, async (tx) => {
      await recordPlatformAction(tx, {
        actorUserId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        action: 'session.revoked',
        entityType: 'session',
        entityId: sessionId,
        reason: 'revoked by the account holder',
        ipAddress: ctx.ipAddress,
        requestId: ctx.requestId,
      });
    });

    revalidatePath('/platform/profile');
    return { ok: true };
  } catch (error) {
    logger.error('console session could not be revoked', { error });
    return {
      ok: false,
      error: isAppError(error) ? error.message : 'That session could not be ended. Try again.',
    };
  }
}

/**
 * End every session except this one.
 *
 * ⚠ "EXCEPT THIS ONE" IS THE WHOLE DESIGN. A control that signs you out too
 * is one an operator will not press in the situation it exists for — the
 * suspicion that something else is signed in — because pressing it costs them
 * their own session at exactly the moment they want to keep looking.
 */
export async function revokeOtherConsoleSessions(): Promise<ProfileActionResult> {
  try {
    const ctx = await currentPlatformSession();

    const revoked = await revokeAllSessions(
      ctx.actorId,
      ctx.requestId,
      'revoked by the account holder',
      ctx.sessionId ?? undefined,
    );

    await withoutTenantContext(ctx.requestId, async (tx) => {
      await recordPlatformAction(tx, {
        actorUserId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        action: 'session.revoked',
        entityType: 'session',
        reason: `all except current · ${revoked} ended`,
        ipAddress: ctx.ipAddress,
        requestId: ctx.requestId,
      });
    });

    revalidatePath('/platform/profile');
    return { ok: true };
  } catch (error) {
    logger.error('console sessions could not be revoked', { error });
    return {
      ok: false,
      error: isAppError(error) ? error.message : 'Those sessions could not be ended. Try again.',
    };
  }
}
