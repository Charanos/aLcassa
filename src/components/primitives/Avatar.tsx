import Image from 'next/image';

/**
 * The account avatar: an uploaded face, or initials.
 *
 * ⚠ THIS REPLACED A STOCK PHOTOGRAPH OF A STRANGER, AND NOW IT REPLACES THE
 * PLACEHOLDER THAT REPLACED IT.
 *
 * The console shell rendered the SAME hardcoded Unsplash URL in three places —
 * the top-bar control, the account menu header, and the sidebar identity card —
 * as the signed-in administrator's face. It was placeholder art that survived
 * into the shell, and it carried four costs that had nothing to do with how it
 * looked:
 *
 *   1. It is a photograph of a real person who is not the operator. Shipping
 *      someone's likeness as your admin's avatar is not a design decision
 *      anybody made on purpose.
 *   2. Three copies of one URL, so a change meant finding all three.
 *   3. A third-party network request in the application shell, on every
 *      render of every console page, blocking nothing but costing a
 *      connection and leaking a referer.
 *   4. It forced `images.unsplash.com` into BOTH `next.config.ts`'s
 *      `remotePatterns` and the `img-src` line of the CSP in `middleware.ts`.
 *      A content-security policy widened to accommodate a placeholder is the
 *      placeholder outliving its usefulness in the worst possible place.
 *
 * This file's previous version ended: "When real uploaded avatars exist they
 * belong here, behind an `src` prop with this as the fallback, and the CSP
 * should be widened only to whatever bucket actually serves them."
 *
 * They exist. That is what `src` is, the initials are the fallback, and the CSP
 * now names this deployment's own storage origin — derived from the project
 * URL, so each environment admits exactly its own host and no other.
 *
 * ⚠ THE INITIALS ARE NOT A LOADING STATE. They are the resting state of most
 * accounts, and they render with no request at all. An avatar that is absent is
 * not an avatar that failed.
 */

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, { box: number; font: number }> = {
  xs: { box: 22, font: 9 },
  sm: { box: 26, font: 10 },
  md: { box: 32, font: 12 },
  lg: { box: 40, font: 14 },
  /** The profile's own picker, the one place an avatar is the subject. */
  xl: { box: 72, font: 24 },
};

export type AvatarProps = {
  /**
   * Two characters, already derived. Longer strings are cut.
   *
   * Optional, because a caller that renders its own fallback — the profile
   * picker draws 28px initials inside an 84px tile of its own — uses this
   * component purely as the image and has nothing to pass.
   */
  initials?: string;
  /**
   * The person, for the accessible name and the image's `alt`.
   *
   * ⚠ `alt` IS THE NAME HERE AND EMPTY EVERYWHERE ELSE, WHICH IS THE CORRECT
   * ASYMMETRY. In the chrome the avatar sits beside the name in text, so
   * alt text would make a screen reader say it twice. Where the avatar stands
   * alone — the profile picker — it is the only thing identifying the person
   * and needs the name.
   */
  name?: string;
  /**
   * The uploaded image. Null, undefined or empty renders the initials, which is
   * the state most accounts are in and is not a failure.
   */
  src?: string | null;
  /**
   * A named step, or an exact pixel box.
   *
   * ⚠ THE NUMERIC ESCAPE HATCH IS FOR ONE CASE: a screen where the avatar is
   * the SUBJECT rather than an identifier beside a name. The profile's picker
   * is 84px because it is the control you press, and inventing an `xxl` step
   * for a single site would put a rung on the scale that means "the profile
   * picker" rather than a size.
   *
   * Everywhere the avatar identifies somebody in a list or a bar, use a named
   * step — that is what keeps five call sites agreeing.
   */
  size?: AvatarSize | number;
  /**
   * `chrome` for the inverted slab (dark console chrome, dark dropdowns),
   * `surface` for ordinary light panels. They are different palettes, not a
   * light/dark pair — see tokens.css TIER 4.
   */
  tone?: 'surface' | 'chrome';
  /** The accessible name. Omit only when adjacent text already says it. */
  label?: string;
  className?: string;
  /** A ring, for the chrome where the avatar sits on a dark slab. */
  ring?: boolean;
};

export function Avatar({
  initials = '',
  name,
  src,
  size = 'sm',
  tone = 'surface',
  label,
  className,
  ring,
}: AvatarProps) {
  const { box, font } =
    typeof size === 'number' ? { box: size, font: Math.round(size / 2.6) } : SIZES[size];

  /* `label` wins when given; otherwise a standalone avatar is named by the
     person it depicts, and one sitting beside their name stays decorative. */
  const accessibleName = label ?? name;

  const palette =
    tone === 'chrome'
      ? {
          background: 'var(--chrome-hover)',
          color: 'var(--chrome-fg)',
          border: '1px solid var(--chrome-rule)',
        }
      : {
          background: 'var(--blue-50)',
          color: 'var(--blue-500)',
          border: '1px solid transparent',
        };

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full select-none ${className ?? ''}`}
      style={{
        width: box,
        height: box,
        font: `500 ${font}px/1 var(--font-mono)`,
        ...palette,
        ...(ring ? { boxShadow: '0 0 0 1px var(--chrome-rule-strong)' } : null),
      }}
      /* When there is no accessible name the avatar is decorative — a name sits
         beside it — and announcing "B M" before the name is noise. */
      role={accessibleName ? 'img' : undefined}
      aria-label={accessibleName}
      aria-hidden={accessibleName ? undefined : true}
    >
      {src ? (
        /* ⚠ EXPLICIT `width`/`height`, NOT `fill`. The box is a known, fixed
           number of pixels at every call site, so giving `next/image` the real
           dimensions lets it request one correctly-sized variant instead of
           guessing from a container. An avatar is the one image on the page
           whose size is never in doubt.

           `alt=""` because the surrounding `role="img"`/`aria-label` already
           names it when it needs naming — an alt here as well would announce
           the person twice. */
        <Image
          src={src}
          alt=""
          width={box}
          height={box}
          className="size-full object-cover"
          /* The initials underneath stay in the DOM, so a storage object that
             404s degrades to them rather than to a broken-image glyph. */
          style={{ position: 'absolute', inset: 0 }}
        />
      ) : null}
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}
