/**
 * The initials avatar.
 *
 * ⚠ THIS REPLACES A STOCK PHOTOGRAPH OF A STRANGER.
 *
 * The console shell rendered the SAME hardcoded Unsplash URL in three places
 * — the top-bar control, the account menu header, and the sidebar identity
 * card — as the signed-in administrator's face. It was placeholder art that
 * survived into the shell, and it carried four costs that had nothing to do
 * with how it looked:
 *
 *   1. It is a photograph of a real person who is not the operator. Shipping
 *      someone's likeness as your admin's avatar is not a design decision
 *      anybody made on purpose.
 *   2. Three copies of one URL, so a change meant finding all three.
 *   3. A third-party network request in the application shell, on every
 *      render of every console page, blocking nothing but costing a
 *      connection and leaking a referer.
 *   4. It forced `images.unsplash.com` into BOTH `next.config.ts`'s
 *      `remotePatterns` and the `img-src` line of the CSP in
 *      `middleware.ts`. A content-security policy widened to accommodate a
 *      placeholder is the placeholder outliving its usefulness in the worst
 *      possible place.
 *
 * Initials are real data — `ConsoleAccount.initials` and its tenant
 * equivalent are already computed from the signed-in name — and they render
 * with no request at all. When real uploaded avatars exist they belong here,
 * behind an `src` prop with this as the fallback, and the CSP should be
 * widened only to whatever bucket actually serves them.
 */

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<AvatarSize, { box: number; font: number }> = {
  xs: { box: 22, font: 9 },
  sm: { box: 26, font: 10 },
  md: { box: 32, font: 12 },
  lg: { box: 40, font: 14 },
};

export type AvatarProps = {
  /** Two characters, already derived. Longer strings are cut. */
  initials: string;
  size?: AvatarSize;
  /**
   * `chrome` for the inverted slab (dark console chrome, dark dropdowns),
   * `surface` for ordinary light panels. They are different palettes, not a
   * light/dark pair — see tokens.css TIER 4.
   */
  tone?: 'surface' | 'chrome';
  /** The accessible name. Omit only when adjacent text already says it. */
  label?: string;
  className?: string;
};

export function Avatar({
  initials,
  size = 'sm',
  tone = 'surface',
  label,
  className,
}: AvatarProps) {
  const { box, font } = SIZES[size];

  const palette =
    tone === 'chrome'
      ? {
          background: 'rgba(255, 255, 255, 0.08)',
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
      className={`grid shrink-0 place-items-center rounded-full select-none ${className ?? ''}`}
      style={{
        width: box,
        height: box,
        font: `500 ${font}px/1 var(--font-mono)`,
        ...palette,
      }}
      /* When `label` is absent the initials are decorative — a name sits
         beside them — and announcing "B M" before the name is noise. */
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {initials.slice(0, 2).toUpperCase()}
    </span>
  );
}
