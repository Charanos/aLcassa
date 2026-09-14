import * as React from 'react';
import type { Icon as TablerIcon } from '@tabler/icons-react';

/**
 * THE APP-ICON TILE: a rounded square, a lifted ink ground, and a tone wash.
 *
 * ⚠ WHY THIS IS NOT `IconPill`, WHICH ALSO HOUSES AN ICON.
 *
 * `IconPill` is a CIRCLE and it is a status marker — it carries a tone tint at
 * badge strength because its job is to say healthy, warning, failing. It sits
 * beside a figure or in a row, and it is read as a state.
 *
 * This is read as an OBJECT. The rounded square, the vertical ground gradient
 * and the hairline are the visual language of an application icon, so a tile
 * carrying a terminal glyph reads as "the console" rather than as "something is
 * green about the console". That is the right treatment for a destination —
 * a door, a surface, a workspace — and the wrong one for a status.
 *
 * ⚠ IT WAS BUILT TWICE, INLINE, IN TWO SIGN-IN PAGES, and the two copies had
 * already drifted: one at `size-6 rounded-md` on a flat `--danger-bg`, the other
 * at `size-8 rounded-xl` on a gradient with a diagonal wash. The second is
 * markedly better and neither was reachable from anywhere else, so the treatment
 * could not spread to the places that wanted it. 18 §12 — near-identical
 * siblings are the first thing to extract, and the difference between two copies
 * is usually a defect in one of them rather than a decision.
 *
 * ⚠ THE TONE IS A WASH, NOT A FILL. The ground stays neutral ink at every tone
 * and the colour arrives as a ~10% diagonal gradient over it. That is what keeps
 * a row of tiles reading as a set of objects rather than as a traffic-light
 * panel — and it is why the orange accent budget in 03 §4a is not spent by using
 * `brand` here: at this strength it is a tint on grey, not an accent.
 */

export type IconTileSize = 'sm' | 'md' | 'lg';

export type IconTileTone = 'neutral' | 'brand' | 'info' | 'success' | 'warning' | 'danger';

export interface IconTileProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon: TablerIcon;
  size?: IconTileSize;
  tone?: IconTileTone;
  /**
   * The accessible name. Omit when a label sits beside the tile in text —
   * announcing the icon as well would say the same thing twice.
   */
  label?: string;
  /**
   * An explicit glyph colour, overriding the tile's neutral ink.
   *
   * ⚠ THIS IS THE BRAND-MARK ESCAPE HATCH AND IT HAS EXACTLY ONE USE. 03 §2
   * forbids raw colour in a component and exempts brand marks, because
   * WhatsApp's green is not a design decision this product gets to make — it is
   * the mark, and rendering it in `--success-fg` would be rendering a different
   * company's logo.
   *
   * A tile that carries a brand mark passes the brand's own value here. A tile
   * that carries a SEMANTIC glyph — a key, a warning, an activity trace — uses
   * `tone` instead, so it stays inside the token system where it belongs.
   * Reaching for this to get "a red icon" is the misuse it is named to prevent.
   */
  glyphColor?: string;
}

const SIZES: Record<IconTileSize, { box: number; glyph: number; radius: number }> = {
  sm: { box: 28, glyph: 14, radius: 9 },
  md: { box: 32, glyph: 16, radius: 11 },
  lg: { box: 40, glyph: 20, radius: 13 },
};

/**
 * The ink each tone washes with. Written as token NAMES rather than resolved
 * values, so a palette or tier change never reopens this file — the same
 * discipline `StatusBadge`'s tone table follows.
 */
const WASH: Record<IconTileTone, string | null> = {
  neutral: null,
  brand: 'var(--accent-mark)',
  info: 'var(--blue-500)',
  success: 'var(--success-fg)',
  warning: 'var(--warning-fg)',
  danger: 'var(--danger-fg)',
};

export const IconTile = React.forwardRef<HTMLSpanElement, IconTileProps>(function IconTile(
  { icon: Icon, size = 'md', tone = 'neutral', label, glyphColor, className, style, ...props },
  ref,
) {
  const { box, glyph, radius } = SIZES[size];
  const wash = WASH[tone];

  return (
    <span
      ref={ref}
      className={`relative grid shrink-0 place-items-center overflow-hidden ${className ?? ''}`}
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        /* The lift: a light top, a slightly heavier bottom, a hairline round it.
           Two ink steps rather than a shadow, so the tile reads as raised on a
           cream ground without spending the elevation 03 §20 reserves. */
        background: 'linear-gradient(to bottom, var(--ink-50), var(--ink-100))',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        color: 'var(--ink-700)',
        ...style,
      }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      {...props}
    >
      {wash ? (
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to top right, color-mix(in oklab, ${wash} 12%, transparent), transparent)`,
          }}
        />
      ) : null}
      <Icon
        size={glyph}
        stroke={1.5}
        className="relative z-10"
        aria-hidden
        {...(glyphColor ? { style: { color: glyphColor } } : null)}
      />
    </span>
  );
});
