/**
 * What counts as an acceptable avatar. Shared by the browser and the server.
 *
 * ⚠ NO DIRECTIVE, DELIBERATELY — the same reasoning as `console/profileName.ts`
 * and `console/statusHue.ts`. The picker needs these to set its `accept`
 * attribute and to refuse a 40MB file before it starts uploading it; the server
 * action needs them because a client-side check is a courtesy and never a
 * control. A `'use client'` home would hand the server reference proxies, which
 * typecheck, build, and compare as `undefined` at runtime. 18 §13.
 */

/** The bucket. Created once in the Supabase project — see 19 §2. */
export const AVATAR_BUCKET = 'avatars';

/**
 * 2MB, AFTER the browser has downscaled.
 *
 * ⚠ THE LIMIT IS NOT ABOUT DISK. A raw photograph off a modern phone is 4–12MB
 * and 4000px wide, and it is rendered here at 24, 30 and 60 pixels. The
 * downscale in `prepareAvatar` reduces a typical upload to well under 100KB, so
 * anything still over 2MB when it arrives is either not really an image or is
 * an attempt to make the server do work. Both are worth refusing.
 */
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

/** The longest edge, after downscaling. Rendered at 60px at the very largest. */
export const AVATAR_EDGE = 512;

export const ACCEPTED_AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/** For the file input's `accept`. */
export const AVATAR_ACCEPT = ACCEPTED_AVATAR_TYPES.join(',');

export type AvatarFormat = 'png' | 'jpeg' | 'webp';

/**
 * What this actually is, read from its first bytes.
 *
 * ⚠ THE BROWSER'S `File.type` IS A CLAIM, NOT A FACT. It comes from the file
 * extension on most platforms, so `payload.exe` renamed to `me.png` arrives
 * declaring `image/png`, and a server that trusts the declaration has been
 * handed whatever the caller wanted to hand it. The bucket is public-read, so
 * the consequence of getting this wrong is hosting an arbitrary file on our own
 * origin — which is how a storage bucket becomes somebody else's CDN.
 *
 * Magic bytes cannot be renamed. Three signatures, checked against the first
 * twelve bytes:
 *
 *   PNG   89 50 4E 47 0D 0A 1A 0A
 *   JPEG  FF D8 FF
 *   WEBP  "RIFF" ???? "WEBP"
 *
 * Returns `null` for anything else, including a valid image in a format this
 * product does not accept — an animated GIF avatar is a decision, not an
 * oversight.
 */
export function sniffImage(bytes: Uint8Array): AvatarFormat | null {
  if (bytes.length < 12) return null;

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (png.every((b, i) => bytes[i] === b)) return 'png';

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpeg';

  const ascii = (from: number, to: number) =>
    String.fromCharCode(...Array.from(bytes.slice(from, to)));
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'webp';

  return null;
}

export const EXTENSION: Record<AvatarFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};

export const MIME: Record<AvatarFormat, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/** "1.4 MB". For refusal messages, where a byte count means nothing. */
export function readableBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
