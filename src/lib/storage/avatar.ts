import 'server-only';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { supabaseUrl } from '@/lib/auth/supabase/env';
import { logger } from '@/lib/logger';
import { AVATAR_BUCKET, EXTENSION, MIME, type AvatarFormat } from './avatarRules';

/**
 * Avatar objects in Supabase Storage.
 *
 * ⚠ IT USES THE SIGNED-IN USER'S OWN CLIENT, NOT THE ADMIN CLIENT.
 *
 * `lib/auth/supabase/admin.ts` is lint-guarded to `modules/platform` because it
 * bypasses Row Level Security, and its own header names the rule this file
 * obeys: "if a session exists, use `createSupabaseServerClient()` and let the
 * policies apply. Reaching for this because a policy is inconvenient is how the
 * guarantee dies quietly."
 *
 * A person uploading their own face is the clearest possible case of an
 * operation that can run as the person it concerns. The storage policy in
 * `db/policies/08_storage.sql` admits writes only under `platform/<auth.uid()>/`,
 * so the isolation argument for avatars is the same argument as for every other
 * table: the database enforces it, not this function.
 *
 * ⚠ WHY THE BUCKET IS PUBLIC-READ, WHICH IS A REAL DECISION AND NOT A DEFAULT.
 *
 * The alternative is a signed URL, which is what `tenant/live.ts` reaches for
 * with the tenant logo. For an avatar it is the wrong trade: the console chrome
 * renders this image in three places on EVERY page — the top-bar control, the
 * account menu and the sidebar identity card — so signing would put a Supabase
 * round trip in the layout's critical path on every navigation, to protect a
 * photograph the operator uploaded so their colleagues would see it.
 *
 * What makes public acceptable rather than lazy:
 *
 *   · the path carries a random segment, so the bucket is not enumerable from
 *     a user id;
 *   · the CSP is widened to exactly one host, the project's own storage
 *     origin, rather than to images generally;
 *   · nothing but avatars goes in this bucket, and the write policy makes that
 *     structural rather than a convention;
 *   · the browser strips EXIF before upload — see `prepareAvatar` — so a phone
 *     photograph cannot publish the GPS coordinates of the operator's house
 *     into a public object.
 *
 * That last one is the reason the downscale is not merely an optimisation.
 */

/**
 * `platform/<userId>/<random>.<ext>`.
 *
 * ⚠ THE RANDOM SEGMENT IS NOT COSMETIC. A stable path — `platform/<id>/avatar.png`
 * — would be guessable from a user id, and worse, it would be CACHED: replacing
 * an avatar at the same URL leaves every browser, proxy and `next/image`
 * optimiser showing the old face until something expires. A fresh path per
 * upload makes replacement instant everywhere, and makes the old object
 * unreachable the moment the row stops pointing at it.
 */
function avatarPath(userId: string, format: AvatarFormat): string {
  return `platform/${userId}/${crypto.randomUUID()}.${EXTENSION[format]}`;
}

/**
 * The public URL for a stored path.
 *
 * ⚠ IT IS BUILT, NOT FETCHED. `supabase.storage.getPublicUrl()` is a pure
 * string concatenation over the project URL, but it needs a client instance,
 * and this is called from the console LAYOUT on every render. Constructing the
 * string directly keeps a synchronous read synchronous.
 *
 * Returns null for null, so a profile with no avatar produces no `src` and the
 * initials fallback renders — which is the state most accounts are in.
 */
export function avatarUrlFor(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${supabaseUrl()}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}

export type AvatarUploadResult = { ok: true; path: string } | { ok: false; error: string };

/**
 * Put the bytes in the bucket.
 *
 * ⚠ IT NEVER OVERWRITES (`upsert: false`). Combined with the random path, that
 * makes an upload a create rather than a replace, so a failed write cannot
 * leave a half-written object where the previous avatar used to be.
 */
export async function uploadAvatar(
  userId: string,
  bytes: Uint8Array,
  format: AvatarFormat,
): Promise<AvatarUploadResult> {
  const path = avatarPath(userId, format);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, bytes, {
    contentType: MIME[format],
    upsert: false,
    /* A year. The path changes on every replacement, so a long cache is safe
       and is the whole reason the path is random. */
    cacheControl: '31536000',
  });

  if (error) {
    logger.error('avatar upload failed', { error: error.message });
    /* ⚠ THE SUPABASE MESSAGE IS NOT SHOWN TO THE OPERATOR. It names the bucket
       and the policy that refused, which is internal shape; and the most
       likely cause by far is the bucket not existing yet in this environment,
       which is an operator-facing sentence rather than a storage error. */
    return {
      ok: false,
      error:
        'The image could not be stored. If this persists, avatar storage may not be configured for this environment.',
    };
  }

  return { ok: true, path };
}

/**
 * Remove an object.
 *
 * ⚠ FAILURE HERE IS LOGGED AND SWALLOWED, ON PURPOSE.
 *
 * This is only ever called to clean up a path the `user_profiles` row has
 * already stopped pointing at. If the delete fails, the outcome is an orphaned
 * object in a bucket — invisible, unreachable from the application, and
 * costing a few kilobytes. Failing the operator's action over it would undo a
 * change that has already succeeded in the database and report an error for
 * something that did work.
 *
 * The row is the source of truth; the object is a consequence of it.
 */
export async function deleteAvatarObject(path: string | null | undefined): Promise<void> {
  if (!path) return;
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    if (error) logger.warn('previous avatar object could not be removed', { error: error.message });
  } catch (error) {
    logger.warn('previous avatar object could not be removed', { error });
  }
}
