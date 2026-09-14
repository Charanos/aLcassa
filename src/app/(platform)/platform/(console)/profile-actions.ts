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
import { withoutTenantContext } from '@/lib/db';
import { ERROR_CODES, isAppError } from '@/lib/errors';
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

/**
 * ⚠ SUCCESS CARRIES A PAYLOAD, BECAUSE "it worked" IS NOT ENOUGH TO RENDER.
 *
 * Each of these three does something the screen then has to describe — the
 * canonical name after trimming, how many devices were actually signed out,
 * whether the row was already gone. Returning a bare `{ ok: true }` forced the
 * caller to invent that sentence, and an invented sentence is how "Saved." ends
 * up over a write that changed nothing.
 */
export type ProfileActionResult<T = object> =
  | ({ ok: true } & T)
  | {
      ok: false;
      error: string;
      /**
       * The refusal was "you are not signed in", not "that did not work".
       *
       * ⚠ IT IS A SEPARATE FLAG BECAUSE IT NEEDS A SEPARATE CONTROL. Every other
       * failure on this screen is something the operator can correct in place —
       * a shorter name, a smaller image, a different file. This one cannot be
       * retried at all, and an interface that offers "try again" for it is
       * inviting somebody to press a button that will fail identically every
       * time. The caller renders a sign-in link instead.
       */
      signedOut?: true;
    };

/**
 * ⚠ THE INTERNAL PAYLOAD NEVER REACHES THE OPERATOR.
 *
 * `AppError.internal` is documented in `lib/errors` as "detail that goes to the
 * log and never to the client", and all three catch blocks in this file were
 * appending `(Stage: ${JSON.stringify(error.internal)})` to the message — added
 * as a debugging aid during the front-end pass, and genuinely useful: it is how
 * the half-signed-out state below was diagnosed.
 *
 * It cannot ship. It puts the auth resolver's internal stage names, the door,
 * and the identity provider's own error codes on screen, in a red sentence, for
 * a person whose only available action is to sign in again. The diagnosis
 * belongs in `logger.error`, which every one of these already calls.
 */
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

/**
 * ⚠ THE RULE IS IMPORTED, NOT RESTATED. `checkName` lives in a module with no
 * directive so the form and this action share one definition — see
 * `lib/console/profileName.ts` for why it cannot live in either of them.
 *
 * The client check is a courtesy that saves a round trip. This one is the
 * control, and it runs whether or not the client ran its own.
 */

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
export async function updateConsoleProfileName(
  name: string,
): Promise<ProfileActionResult<{ name: string }>> {
  const checked = checkName(name);
  if (!checked.ok) return { ok: false, error: checked.error };

  try {
    const ctx = await currentPlatformSession();

    /**
     * ⚠ THE WRITE IS RETURNING, AND THE ZERO-ROW CASE IS AN ERROR.
     *
     * `update ... where id = actorId` against a row that is not there updates
     * nothing and throws nothing, so the action was free to answer `ok` for a
     * write that did not happen — and the screen would then say "Saved." over
     * the old value, which is the precise failure this file's header says it
     * was written to end. The header was true of the `setTimeout` it replaced
     * and not quite true of the replacement.
     *
     * In practice this fires when the profile row is missing for a session
     * that nonetheless resolved — a state worth a loud refusal rather than a
     * quiet success.
     */
    const saved = await withoutTenantContext(ctx.requestId, async (tx) => {
      const rows = await tx
        .update(userProfiles)
        .set({ fullName: checked.name, updatedAt: new Date() })
        .where(eq(userProfiles.id, ctx.actorId))
        .returning({ fullName: userProfiles.fullName });

      if (rows.length === 0) return null;

      await recordPlatformAction(tx, {
        actorUserId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        /* ⚠ FROM THE CATALOGUE, NOT A LITERAL. 05 §9: inventing a string at a
           call site is how a trail becomes unqueryable. Both actions in this
           file were bare strings that happened to match. */
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

    /* ⚠ THE LAYOUT TOO, NOT JUST THESE TWO PAGES. The sidebar identity card and
       the top-bar account control both render this name, and they live in the
       console LAYOUT — which a default `revalidatePath` does not touch. The
       rename was landing in the database and on the roster while the chrome
       kept showing the old name on every screen until a hard reload. */
    PROPAGATE();
    return { ok: true, name: saved };
  } catch (error) {
    logger.error('console profile name could not be saved', { error });
    return refusal(error, 'That could not be saved. Try again.');
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

    const ended = await revokeSession(
      sessionId,
      ctx.actorId,
      ctx.requestId,
      'revoked by the account holder',
    );

    /**
     * ⚠ ZERO ROWS IS NOT SUCCESS, AND IT USED TO BE REPORTED AS SUCCESS.
     *
     * `revokeSession` returned `void`, so a stale id — a row another tab had
     * already ended, a list the reader had left open while a session expired —
     * produced a silent no-op, a `router.refresh()`, and no explanation for why
     * the row was still there. On the screen whose job is locking somebody
     * out, "I pressed it and nothing said otherwise" has to mean it happened.
     *
     * It also short-circuits the audit row: recording `session.revoked` for a
     * revocation that revoked nothing puts a false event into the one log a
     * security review reads.
     */
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

    await withoutTenantContext(ctx.requestId, async (tx) => {
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

/**
 * End every session except this one.
 *
 * ⚠ "EXCEPT THIS ONE" IS THE WHOLE DESIGN. A control that signs you out too
 * is one an operator will not press in the situation it exists for — the
 * suspicion that something else is signed in — because pressing it costs them
 * their own session at exactly the moment they want to keep looking.
 */
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

    /* ⚠ NOTHING TO END IS NOT A FAILURE. Unlike the single revoke above, this
       control is a sweep — an operator pressing it after a scare wants the
       assurance, and "nothing else was signed in" IS that assurance. It is
       reported as a success carrying zero, and the toast says so. No audit row
       either way: a sweep that swept nothing is not an event. */
    if (revoked > 0) {
      await withoutTenantContext(ctx.requestId, async (tx) => {
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

    /**
     * ⚠ AN EMAIL, AND IT IS BEST-EFFORT BY DESIGN.
     *
     * The confirmation is not the point — the operator pressed the button and
     * watched the list empty. The point is the SECOND reader: somebody who
     * receives this and did not do it has just learned their account is
     * compromised, through the only channel that reaches a person who is not
     * looking at the console. It is the one action on this screen with that
     * property, which is why it is the only one that mails.
     *
     * ⚠ AND A FAILED SEND MUST NOT FAIL THE REVOCATION. The sessions are
     * already ended and the audit row is already written. Turning "we could not
     * reach your mailbox" into "signing out your devices failed" would be a
     * false report of a security action that did succeed, and would invite the
     * operator to press it again. `sendEmail` is contracted not to throw; the
     * catch is for an adapter that breaks that contract.
     *
     * In an environment with no provider configured, the adapter is the logging
     * one and this writes the message to the log rather than dropping it.
     */
    if (revoked > 0) {
      try {
        const [me] = await withoutTenantContext(ctx.requestId, async (tx) =>
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

/* ── The avatar ───────────────────────────────────────────────────────────── */

/**
 * ⚠ WHY THE AVATAR IS A REVALIDATION OF THE LAYOUT AND NOT JUST THE PAGE.
 *
 * The face appears in four places: the profile card that uploaded it, the
 * top-bar account control, the account dropdown, and the sidebar identity card.
 * The last three live in the console LAYOUT, and `revalidatePath(path)` with
 * its default scope revalidates the page segment only — so an operator could
 * change their avatar, watch the profile card update, and still be looking at
 * the old face in the chrome around it until a hard reload.
 *
 * `revalidatePath('/platform', 'layout')` is what actually propagates. The same
 * omission applied to the NAME: renaming yourself updated the profile and the
 * roster and left the sidebar showing the old name, which is the more visible
 * of the two because it is on every screen.
 */
const PROPAGATE = () => {
  revalidatePath('/platform', 'layout');
  revalidatePath('/platform/profile');
  revalidatePath('/platform/admins');
};

/**
 * Replace your avatar.
 *
 * ⚠ IT TAKES `FormData`, NOT A BASE64 STRING. A server action can receive a
 * `File` directly, which streams as multipart rather than inflating the image
 * by a third to pass it as JSON in an RSC payload.
 *
 * ⚠ AND IT RE-VALIDATES EVERYTHING THE BROWSER ALREADY CHECKED. The picker
 * refuses the wrong type and the wrong size before it uploads, which is a
 * courtesy that saves a slow round trip on a phone. None of it is a control:
 * this action is reachable directly, so the size, the declared type and the
 * actual magic bytes are all checked again here, and the magic bytes are the
 * only one of the three that cannot be forged.
 */
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
    /* ⚠ THE MESSAGE DOES NOT REPEAT THE BROWSER'S CLAIM BACK. Saying "PNG is
       not supported" to somebody whose file merely CALLS itself a PNG is
       confusing in exactly the case that matters. */
    return {
      ok: false,
      error:
        'That file is not a PNG, JPEG or WebP image. Its contents do not match any of the three, whatever its name says.',
    };
  }

  try {
    const uploaded = await uploadAvatar(ctx.actorId, bytes, format);
    if (!uploaded.ok) return { ok: false, error: uploaded.error };

    /**
     * ⚠ THE ROW IS WRITTEN AFTER THE OBJECT EXISTS, AND THE PREVIOUS OBJECT IS
     * REMOVED AFTER THE ROW MOVES. The order is the whole of the failure
     * design, because there is no transaction spanning Postgres and object
     * storage:
     *
     *   upload fails      → nothing written, nothing lost, old avatar intact
     *   row write fails   → a new orphaned object, old avatar still correct
     *   cleanup fails     → an orphaned object, everything else correct
     *
     * Every failure leaves the operator with a working avatar and at worst a
     * few unreferenced kilobytes. The opposite order — clear the row first —
     * has a failure mode where the account loses its avatar and the bytes are
     * already gone.
     */
    const previous = await withoutTenantContext(ctx.requestId, async (tx) => {
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
        /* ⚠ `profile.updated` WITH A REASON, NOT A NEW CATALOGUE ENTRY. 05 §9
           keeps the action list short and dotted; "what changed" is the reason
           column's job. The name save writes `display name` into the same
           field, so "everything this person changed about their own profile"
           is one filter rather than three. */
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

/**
 * Go back to initials.
 *
 * ⚠ IT IS DESTRUCTIVE AND IT IS TREATED AS SUCH. The object is deleted, not
 * unlinked — there is no recycle bin behind this and no way to get the file
 * back from the product. The control that calls it confirms first and says so.
 */
export async function removeConsoleAvatar(): Promise<ProfileActionResult> {
  try {
    const ctx = await currentPlatformSession();

    const previous = await withoutTenantContext(ctx.requestId, async (tx) => {
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

    /* ⚠ NO AVATAR IS NOT AN ERROR. A double-click, or a second tab that already
       removed it, lands here with nothing to do. The end state the operator
       asked for is the end state they have. */
    if (previous) await deleteAvatarObject(previous);

    PROPAGATE();
    return { ok: true };
  } catch (error) {
    logger.error('console avatar could not be removed', { error });
    return refusal(error, 'That image could not be removed. Try again.');
  }
}
