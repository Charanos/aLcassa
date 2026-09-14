import { AVATAR_EDGE, MAX_AVATAR_BYTES, readableBytes, sniffImage } from './avatarRules';

/**
 * Turn whatever the operator picked into something worth uploading.
 *
 * ⚠ THIS RUNS IN THE BROWSER, AND IT IS NOT AN OPTIMISATION. Three of the four
 * things it does are correctness, and the most important one is invisible.
 *
 *   1. IT STRIPS EXIF, AND THAT INCLUDES GPS.
 *
 *      A photograph taken on a phone carries the coordinates of where it was
 *      taken, the device model, and the timestamp. The avatars bucket is
 *      public-read — deliberately, for the reasons in `lib/storage/avatar.ts` —
 *      so uploading a raw camera file would publish the operator's location,
 *      usually their home or the office, at a URL anyone with the link can
 *      fetch. Re-encoding through a canvas drops every metadata block, because
 *      a canvas has no idea any of it existed.
 *
 *      This is the reason the preparation happens BEFORE the network call
 *      rather than on the server. Stripping it server-side would mean the
 *      coordinates still travelled, still landed in a request log, and were
 *      removed afterwards by a step that could be skipped.
 *
 *   2. IT APPLIES EXIF ORIENTATION FIRST. The same metadata block says which
 *      way up the image is, and phones rely on it rather than rotating pixels.
 *      Dropping the block without applying it first is how an avatar ends up
 *      sideways — correct before the upload, wrong after it.
 *
 *   3. IT CROPS TO A SQUARE, centred. The avatar is a circle at every call
 *      site, so a 3:4 portrait would be cropped by CSS anyway — at render time,
 *      differently in each of the five places it appears. Doing it once, in the
 *      file, means what the operator sees in the picker is what everyone sees.
 *
 *   4. IT DOWNSCALES to 512px and re-encodes to WebP. The image renders at 24
 *      to 72 pixels; a 4000px original is four megabytes to store, serve and
 *      decode for nothing.
 *
 * ⚠ NONE OF IT IS A SECURITY CONTROL. Everything here is reachable only if the
 * caller uses this function, and the server action is reachable directly. The
 * action re-checks the size, and sniffs the magic bytes, because those are the
 * checks that have to hold against a caller that never ran this code.
 */

export type PreparedAvatar =
  { ok: true; file: File; previewUrl: string; bytes: number } | { ok: false; error: string };

const OUTPUT_TYPE = 'image/webp';
const OUTPUT_QUALITY = 0.9;

export async function prepareAvatar(input: File): Promise<PreparedAvatar> {
  /*
   * ⚠ SNIFFED BEFORE DECODING, NOT AFTER. `File.type` is derived from the
   * extension on most platforms, so it is a claim rather than a fact — and the
   * point of checking here is to give the operator a useful sentence about the
   * file they chose, instead of a decode failure from the browser.
   */
  const head = new Uint8Array(await input.slice(0, 16).arrayBuffer());
  if (!sniffImage(head)) {
    return {
      ok: false,
      error:
        'That file is not a PNG, JPEG or WebP image — whatever its name says, its contents are not one of those three.',
    };
  }

  let bitmap: ImageBitmap;
  try {
    /* `from-image` is what applies the EXIF rotation. Without it a phone
       portrait arrives on its side, because the pixels were never rotated —
       only the metadata this function is about to discard said which way up
       they went. */
    bitmap = await createImageBitmap(input, { imageOrientation: 'from-image' });
  } catch {
    return { ok: false, error: 'That image could not be read. It may be damaged.' };
  }

  try {
    const edge = Math.min(bitmap.width, bitmap.height);
    /* Centre crop. The face in a portrait is nearer the top than the middle,
       but guessing where it is needs detection this does not have, and a
       confidently wrong crop is worse than an honest centred one — the operator
       can see the result in the picker and choose a different file. */
    const sx = Math.round((bitmap.width - edge) / 2);
    const sy = Math.round((bitmap.height - edge) / 2);
    /* Never upscale: a 90px source becomes a 90px avatar, not a blurry 512. */
    const target = Math.min(AVATAR_EDGE, edge);

    const canvas = document.createElement('canvas');
    canvas.width = target;
    canvas.height = target;

    const context = canvas.getContext('2d');
    if (!context) return { ok: false, error: 'This browser could not process the image.' };

    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, sx, sy, edge, edge, 0, 0, target, target);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, OUTPUT_TYPE, OUTPUT_QUALITY),
    );

    if (!blob)
      return { ok: false, error: 'That image could not be converted. Try a different file.' };

    /* Belt and braces: the downscale puts a realistic photograph well under
       100KB, so anything still over the ceiling here is pathological. The
       server checks this too, and the server's check is the one that counts. */
    if (blob.size > MAX_AVATAR_BYTES) {
      return {
        ok: false,
        error: `Even resized, that image is ${readableBytes(blob.size)}. The limit is ${readableBytes(MAX_AVATAR_BYTES)}.`,
      };
    }

    return {
      ok: true,
      file: new File([blob], 'avatar.webp', { type: OUTPUT_TYPE }),
      /* A local object URL, so the preview is instant and costs no request.
         `blob:` is already in the CSP's `img-src`. The caller revokes it. */
      previewUrl: URL.createObjectURL(blob),
      bytes: blob.size,
    };
  } finally {
    /* Frees the decoded bitmap immediately rather than at the next collection —
       a 4000px source is ~64MB in memory, and an operator trying three photos
       in a row would otherwise hold all three. */
    bitmap.close();
  }
}
