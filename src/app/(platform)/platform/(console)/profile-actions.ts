'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { userProfiles } from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { revokeAllSessions, revokeSession } from '@/lib/auth/session';
import { checkName } from '@/lib/console/profileName';
import { describeAgent } from '@/lib/console/userAgent';
import { sendEmail, sessionsRevokedEmail } from '@/modules/email';
import { avatarUrlFor, deleteAvatarObject, uploadAvatar } from '@/lib/storage/avatar';
import { MAX_AVATAR_BYTES, readableBytes, sniffImage } from '@/lib/storage/avatarRules';
import { withActorContext } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { createSupabasePasswordVerifier } from '@/lib/auth/supabase/verifier';
import { AppError, ERROR_CODES, isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { recordPlatformAction } from '@/modules/platform';

/** Operator profile actions resolve identity per request and expose only supported profile and session operations. */

/** Return canonical saved values and actual affected counts so the interface can describe the outcome accurately. */
export type ProfileActionResult<T = object> =
  | ({ ok: true } & T)
  | {
      ok: false;
      error: string;
      /** An expired session requires sign-in; validation failures can be corrected in place. */
      signedOut?: true;
      /** Attach password validation errors to the affected field. */
      field?: 'currentPassword' | 'password' | 'passwordConfirm';
    };

/** Keep AppError.internal in server logs; return only its user-facing message. */
function refusal(error: unknown, fallback: string): ProfileActionResult<never> {
  if (isAppError(error) && error.code === ERROR_CODES.AUTH_SESSION_EXPIRED) {
    return {
      ok: false,
      signedOut: true,
      error: 'Your session has ended. Sign in again and this page will come back as it is.',
    };
  }
  return { ok: false, error: isAppError(error) ? error.message : fallback };
}

/** Use the shared name validator on the server; client validation is advisory. */

/** Profile writes and audit inserts require actor context to satisfy identity and platform policies. */

/** Rename the user profile; preserve the original platform-access grant label. */
export async function updateConsoleProfileName(
  name: string,
): Promise<ProfileActionResult<{ name: string }>> {
  const checked = checkName(name);
  if (!checked.ok) return { ok: false, error: checked.error };

  try {
    const ctx = await currentPlatformSession();

    /** Require a returned profile row before reporting a successful save. */
    const saved = await withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
      const rows = await tx
        .update(userProfiles)
        .set({ fullName: checked.name, updatedAt: new Date() })
        .where(eq(userProfiles.id, ctx.actorId))
        .returning({ fullName: userProfiles.fullName });

      if (rows.length === 0) return null;

      await recordPlatformAction(tx, {
        actorUserId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        /* Use catalogue audit actions so profile changes remain consistently queryable. */
        action: AUDIT_ACTIONS.PROFILE_UPDATED,
        entityType: 'user_profile',
        entityId: ctx.actorId,
        /* The reason column is what makes the entry readable six months later:
           "profile.updated" alone does not say what changed, and this action
           can only ever change one thing. */
        reason: 'display name',
        ipAddress: ctx.ipAddress,
        requestId: ctx.requestId,
      });

      return rows[0]?.fullName ?? checked.name;
    });

    if (saved === null) {
      return { ok: false, error: 'Your profile record could not be found. Sign in again.' };
    }

    /* Revalidate the console layout so shell identity updates with the profile. */
    PROPAGATE();
    return { ok: true, name: saved };
  } catch (error) {
    logger.error('console profile name could not be saved', { error });
    return refusal(error, 'That could not be saved. Try again.');
  }
}

/** Revoke another device's session on its next request; use the separate sign-out control for the current session. */
export async function revokeConsoleSession(sessionId: string): Promise<ProfileActionResult> {
  try {
    const ctx = await currentPlatformSession();

    if (sessionId === ctx.sessionId) {
      return { ok: false, error: 'That is this device. Use sign out instead.' };
    }

    const ended = await revokeSession(
      sessionId,
      ctx.actorId,
      ctx.requestId,
      'revoked by the account holder',
    );

    /** A missing session is a stale-state refusal and must not produce a successful revocation audit. */
    if (ended === 0) {
      /* Revalidate anyway — the row the reader pressed is gone from the
         database and the only thing still showing it is this page's cache. The
         message below promises a fresh list, so the list has to be fresh. */
      revalidatePath('/platform/profile');
      return {
        ok: false,
        error: 'That session had already ended. The list is now up to date.',
      };
    }

    await withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
      await recordPlatformAction(tx, {
        actorUserId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        action: AUDIT_ACTIONS.SESSION_REVOKED,
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
    return refusal(error, 'That session could not be ended. Try again.');
  }
}

/** Revoke all other sessions while preserving the operator's current session. */
export async function revokeOtherConsoleSessions(): Promise<
  ProfileActionResult<{ ended: number }>
> {
  try {
    const ctx = await currentPlatformSession();

    const revoked = await revokeAllSessions(
      ctx.actorId,
      ctx.requestId,
      'revoked by the account holder',
      ctx.sessionId ?? undefined,
    );

    /* An empty session sweep succeeds with count zero and records no mutation event. */
    if (revoked > 0) {
      await withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
        await recordPlatformAction(tx, {
          actorUserId: ctx.actorId,
          actorLabel: ctx.actorLabel,
          action: AUDIT_ACTIONS.SESSION_REVOKED,
          entityType: 'session',
          reason: `all except current · ${revoked} ended`,
          ipAddress: ctx.ipAddress,
          requestId: ctx.requestId,
        });
      });
    }

    /** Send a security notification after revocation commits; delivery failure does not restore revoked sessions. */
    if (revoked > 0) {
      try {
        const [me] = await withActorContext(ctx.actorId, ctx.requestId, async (tx) =>
          tx
            .select({ email: userProfiles.email, fullName: userProfiles.fullName })
            .from(userProfiles)
            .where(eq(userProfiles.id, ctx.actorId))
            .limit(1),
        );

        if (me?.email) {
          await sendEmail({
            to: me.email,
            requestId: ctx.requestId,
            template: sessionsRevokedEmail({
              name: me.fullName ?? ctx.actorLabel,
              count: revoked,
              /* The device that made the request, so a recipient who did not
                 do this can tell at a glance that it was not their machine. */
              fromDevice: describeAgent((await headers()).get('user-agent')),
              when: new Date().toLocaleString('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Africa/Nairobi',
              }),
            }),
          });
        }
      } catch (error) {
        logger.warn('sessions were revoked but the notice could not be sent', { error });
      }
    }

    revalidatePath('/platform/profile');
    return { ok: true, ended: revoked };
  } catch (error) {
    logger.error('console sessions could not be revoked', { error });
    return refusal(error, 'Those sessions could not be ended. Try again.');
  }
}

/** Revalidate the layout because avatars also appear in the header, menu and sidebar. */
const PROPAGATE = () => {
  revalidatePath('/platform', 'layout');
  revalidatePath('/platform/profile');
  revalidatePath('/platform/admins');
};

/** Receive a multipart File and validate its size and image signature on the server. */
export async function updateConsoleAvatar(
  form: FormData,
): Promise<ProfileActionResult<{ url: string }>> {
  const file = form.get('avatar');

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'No image was received. Choose a file and try again.' };
  }

  let ctx;
  try {
    ctx = await currentPlatformSession();
  } catch (error) {
    logger.error('avatar authentication failed', { error });
    return refusal(error, 'Authentication failed. Sign in again.');
  }

  if (file.size > MAX_AVATAR_BYTES) {
    return {
      ok: false,
      error: `That image is ${readableBytes(file.size)}. The limit is ${readableBytes(MAX_AVATAR_BYTES)} after the browser has resized it, so this one is probably not an image.`,
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = sniffImage(bytes);

  if (!format) {
    /* Describe unsupported content without trusting the file's declared MIME type. */
    return {
      ok: false,
      error:
        'That file is not a PNG, JPEG or WebP image. Its contents do not match any of the three, whatever its name says.',
    };
  }

  try {
    const uploaded = await uploadAvatar(ctx.actorId, bytes, format);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };

    /** Upload first, commit the profile reference second, then remove the previous object; storage failures preserve the existing avatar. */
    const previous = await withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
      const [before] = await tx
        .select({ avatarPath: userProfiles.avatarPath })
        .from(userProfiles)
        .where(eq(userProfiles.id, ctx.actorId))
        .limit(1);

      const rows = await tx
        .update(userProfiles)
        .set({ avatarPath: uploaded.path, updatedAt: new Date() })
        .where(eq(userProfiles.id, ctx.actorId))
        .returning({ id: userProfiles.id });

      if (rows.length === 0) return undefined;

      await recordPlatformAction(tx, {
        actorUserId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        /* Use profile.updated with the changed field in the reason. */
        action: AUDIT_ACTIONS.PROFILE_UPDATED,
        entityType: 'user_profile',
        entityId: ctx.actorId,
        reason: 'avatar replaced',
        ipAddress: ctx.ipAddress,
        requestId: ctx.requestId,
      });

      return before?.avatarPath ?? null;
    });

    if (previous === undefined) {
      /* The row vanished between the upload and the write. Take the orphan back
         out rather than leaving it behind a failure. */
      await deleteAvatarObject(uploaded.path);
      return { ok: false, error: 'Your profile record could not be found. Sign in again.' };
    }

    await deleteAvatarObject(previous);

    PROPAGATE();
    return { ok: true, url: avatarUrlFor(uploaded.path) ?? '' };
  } catch (error) {
    logger.error('avatar could not be stored', { error });
    return refusal(error, 'The image could not be stored. Try again.');
  }
}

/** Avatar removal deletes the object; require explicit confirmation in the calling control. */
export async function removeConsoleAvatar(): Promise<ProfileActionResult> {
  try {
    const ctx = await currentPlatformSession();

    const previous = await withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
      const [before] = await tx
        .select({ avatarPath: userProfiles.avatarPath })
        .from(userProfiles)
        .where(eq(userProfiles.id, ctx.actorId))
        .limit(1);

      if (!before?.avatarPath) return null;

      await tx
        .update(userProfiles)
        .set({ avatarPath: null, updatedAt: new Date() })
        .where(eq(userProfiles.id, ctx.actorId));

      await recordPlatformAction(tx, {
        actorUserId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        action: AUDIT_ACTIONS.PROFILE_UPDATED,
        entityType: 'user_profile',
        entityId: ctx.actorId,
        reason: 'avatar removed',
        ipAddress: ctx.ipAddress,
        requestId: ctx.requestId,
      });

      return before.avatarPath;
    });

    /* Removing an already-absent avatar is an idempotent success. */
    if (previous) await deleteAvatarObject(previous);

    PROPAGATE();
    return { ok: true };
  } catch (error) {
    logger.error('console avatar could not be removed', { error });
    return refusal(error, 'That image could not be removed. Try again.');
  }
}

export type ChangePasswordResult = ProfileActionResult<{ signedOutDevices: number }>;

/** Changing a password requires current-password reauthentication and revokes other application sessions. */
export async function changeConsolePassword(input: {
  currentPassword: string;
  password: string;
  passwordConfirm: string;
}): Promise<ChangePasswordResult> {
  // 02 §9. Length over composition: a 12-character passphrase beats
  // `P@ssw0rd!`. Same rule as the reset route, deliberately — two different
  // minimums for one credential is how a password policy stops meaning
  // anything.
  if (input.password.length < 12) {
    return { ok: false, error: 'Use at least 12 characters.', field: 'password' };
  }
  if (input.password !== input.passwordConfirm) {
    return { ok: false, error: 'Both passwords must match.', field: 'passwordConfirm' };
  }
  if (input.password === input.currentPassword) {
    return {
      ok: false,
      error: 'That is the password you already have. Choose a different one.',
      field: 'password',
    };
  }

  try {
    const ctx = await currentPlatformSession();

    const supabase = await createSupabaseServerClient();
    const { data: me } = await supabase.auth.getUser();
    const email = me.user?.email;
    if (!email) throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, { message: 'Signed out.' });

    // ─ 1 · prove the old one, without touching the live session ─────────────
    const verifier = createSupabasePasswordVerifier();
    const proof = await verifier.auth.signInWithPassword({
      email,
      password: input.currentPassword,
    });
    if (proof.error) {
      /* Deliberately not distinguishing "wrong password" from "rate limited"
         to the caller by message alone — but this one IS the signed-in user,
         so a precise field error is the right kindness rather than a leak. */
      logger.warn('password change: re-authentication failed', {
        actorId: ctx.actorId,
        requestId: ctx.requestId,
      });
      return {
        ok: false,
        error: 'That is not your current password.',
        field: 'currentPassword',
      };
    }
    await verifier.auth.signOut({ scope: 'local' });

    // ─ 2 · the credential ───────────────────────────────────────────────────
    const updated = await supabase.auth.updateUser({ password: input.password });
    if (updated.error) {
      return { ok: false, error: updated.error.message, field: 'password' };
    }

    // ─ 3 · everything signed in under the old one, except this device ───────
    const signedOutDevices = await revokeAllSessions(
      ctx.actorId,
      ctx.requestId,
      'password changed',
      ctx.sessionId ?? undefined,
    );

    // ─ 4 · the record ───────────────────────────────────────────────────────
    await withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
      await recordPlatformAction(tx, {
        actorUserId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        action: AUDIT_ACTIONS.PASSWORD_CHANGED,
        entityType: 'user',
        entityId: ctx.actorId,
        /* What changed, never what it changed TO. A log that carries a
           password, or any part of one, is worse than no log. */
        reason:
          signedOutDevices > 0
            ? `password changed; ${signedOutDevices} other ${signedOutDevices === 1 ? 'session' : 'sessions'} revoked`
            : 'password changed; no other sessions were open',
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
    });

    PROPAGATE();
    return { ok: true, signedOutDevices };
  } catch (error) {
    logger.error('password change failed', { error });
    return refusal(error, 'The password could not be changed. Nothing was saved.');
  }
}
