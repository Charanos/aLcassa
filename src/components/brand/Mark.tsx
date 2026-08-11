/**
 * THE aLcassa MARK.
 *
 * The previous file in this path was a placeholder that said, in its own
 * header, "when a real identity arrives this changes and nothing else does."
 * The identity arrived on 3 August 2026. This is that change.
 *
 * The icon is a rounded `C` with two ears and a centred dot, reading as a
 * friendly bear. BRAND.md §2 permits it standalone anywhere the wordmark
 * would fall below legible size: favicon, app icon, avatar, social profile.
 *
 * ⚠ DRAWN AS VECTOR RATHER THAN SHIPPED AS THE SUPPLIED PNG.
 *
 * The client supplied the icon at 2560px square, which is correct for print
 * and wrong for a 20px nav mark: it is 280KB to render 400 pixels, it cannot
 * take a currentColor, and it has no dark-mode variant. Redrawing it on a
 * 24-unit grid gives one file that is a favicon, a nav mark and an OG asset,
 * and that recolours by prop instead of by asset swap.
 *
 * ⚠ ON WHICH BLUE.
 *
 * BRAND.md §5 records the open question: the supplied icon file is #0059D4,
 * the moodboard palette is #043AE1, and they are visibly different. The
 * resolution recorded there is #043AE1, because the moodboard presents itself
 * as the palette specification and measures better (7.58:1 on cream against
 * 6.05:1). This component therefore takes its colour from `--blue-500` like
 * every other blue in the system, so if the client confirms #0059D4 instead,
 * the fix is one token and not one asset.
 *
 * The mark is NEVER recoloured to a tenant accent. It is aLcassa's mark, not
 * the tenant's, and a logo that changes colour per customer stops functioning
 * as a mark. There is deliberately no `accent` tone below.
 */

export type MarkProps = {
  size?: number;
  /**
   * `brand`   the blue lockup, and the default.
   * `inverse` the white-on-dark cut.
   * `ink`     the single-colour context where blue is unavailable.
   * `chrome`  the platform console's inverted header and sidebar.
   */
  tone?: 'brand' | 'inverse' | 'ink' | 'chrome';
  title?: string;
};

const TONES = {
  brand: 'var(--blue-500)',
  inverse: 'var(--text-inverse)',
  ink: 'var(--text-primary)',
  /*
   * ⚠ `chrome` IS NOT AN ALIAS OF `brand`, and it exists because the mark
   * would otherwise be illegible on the console.
   *
   * The console chrome inverts against the page, so in light mode the mark
   * sits on a navy slab where #043AE1 measures 2.52:1. `--chrome-action`
   * resolves to blue-300 there and back to blue-500 on dark mode's light
   * chrome — the inverse of what `--text-action` does.
   *
   * This is still the brand mark in the brand's own blue. BRAND.md §2's rule
   * is that the logo is never recoloured to a TENANT's accent; stepping a
   * value so it stays readable on aLcassa's own surface is the opposite of
   * that — it is what keeps the mark recognisable.
   */
  chrome: 'var(--chrome-action)',
} as const;

export function Mark({ size = 24, tone = 'brand', title }: MarkProps) {
  const colour = TONES[tone];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      data-slot="mark"
    >
      {/* The two ears, set wide and high so the silhouette reads as a bear at
          16px, which is the size that actually decides whether it works. */}
      <circle cx="6.6" cy="6.4" r="4.05" fill={colour} />
      <circle cx="17.4" cy="6.4" r="4.05" fill={colour} />

      {/* The C. An open ring with the aperture to the right, drawn as a stroke
          so the counter stays true at every size instead of collapsing the way
          a filled path does when it is scaled down. */}
      <path
        d="M17.9 7.4a7.9 7.9 0 1 0 0 9.2"
        stroke={colour}
        strokeWidth="4.6"
        strokeLinecap="round"
        fill="none"
      />

      {/* The centred dot. */}
      <circle cx="12" cy="12" r="2.35" fill={colour} />
    </svg>
  );
}

/**
 * The primary lockup: icon plus the `aLcassa` wordmark.
 *
 * ⚠ THE CAPITALISATION IS LOAD-BEARING AND IT IS SET HERE ONCE.
 *
 * BRAND.md §1 names `Alcassa` as the one error the brand guidance prohibits
 * explicitly, and capitalisation is exactly the sort of thing that erodes
 * through autocorrect and copy-paste. Rendering the wordmark from this
 * component rather than as a typed string in each surface means there is one
 * place for it to be right, and a CI grep for the wrong form has somewhere to
 * point when it fails.
 *
 * The wordmark is set in the interface face rather than the display serif.
 * 03 §6 restricts the serif to titles, and a wordmark is a mark, not a title.
 */
export function Wordmark({
  size = 22,
  tone = 'brand',
  showIcon = true,
}: {
  size?: number;
  tone?: MarkProps['tone'];
  showIcon?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2.5" data-slot="wordmark">
      {showIcon ? <Mark size={size} tone={tone} /> : null}
      <span
        style={{
          font: `var(--weight-medium) ${size * 0.86}px/1 var(--font-ui)`,
          letterSpacing: '-0.015em',
          color: tone === 'inverse' ? 'var(--text-inverse)' : 'var(--text-primary)',
        }}
      >
        aLcassa
      </span>
    </span>
  );
}
