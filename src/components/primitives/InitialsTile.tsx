import * as React from 'react';

/**
 * A WORKSPACE'S MARK: its initials, on the same raised surface `IconTile` uses.
 *
 * ⚠ THREE HAND-ROLLED COPIES OF THIS EXISTED — the workspace table's row, the
 * same table's card layout, and the detail drawer's header. All three painted
 * `--surface-raised` with an inset ring and a small shadow, at 40px, 44px and
 * 56px, with the status dot positioned slightly differently in each.
 *
 * ⚠ THEY WERE ALSO FLAT, AND THE TILE BESIDE THEM IS NOT. `IconTile` lifts with
 * a light-to-dark gradient — two ink steps rather than an elevation — so on a
 * screen carrying both, a glyph tile read as raised and a workspace mark read as
 * a hole in the surface. They are the same object at the same altitude and now
 * share one treatment.
 *
 * ⚠ AND THEY WERE WEIGHT 600, WHICH THE CONSOLE DOES NOT HAVE. 03 §5 caps the
 * console at 500. Two letters at 600 in a list of twelve is not subtle — it is
 * the heaviest text on the screen, on the least important word in each row.
 */

const SIZES = {
  sm: { box: 32, radius: 11, text: 12, dot: 9 },
  md: { box: 40, radius: 14, text: 13, dot: 10 },
  lg: { box: 56, radius: 18, text: 17, dot: 14 },
} as const;

export type InitialsTileSize = keyof typeof SIZES;

export function InitialsTile({
  name,
  size = 'md',
  /**
   * The status dot, when the mark carries one.
   *
   * ⚠ IT IS A TOKEN NAME, NOT A COLOUR DECISION MADE HERE. The status hues live
   * in `statusHue.ts` and the callers already resolve them; this draws the dot
   * and nothing else, so a new status never needs to reach into this file.
   */
  dot,
  className,
  style,
  ...props
}: {
  name: string;
  size?: InitialsTileSize;
  dot?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  const { box, radius, text, dot: dotSize } = SIZES[size];

  /* First letter of the first two words. "Zuri Beauty Collective" → ZB, which
     is what every caller was computing separately and identically. */
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className={`relative grid shrink-0 place-items-center ${className ?? ''}`}
      style={{
        width: box,
        height: box,
        borderRadius: radius,
        /* Identical to `IconTile`. If that changes, this follows — which is the
           whole reason the two sit in the same folder. */
        background: 'linear-gradient(to bottom, var(--ink-50), var(--ink-100))',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)',
        color: 'var(--ink-700)',
        font: `500 ${text}px/1 var(--font-ui)`,
        letterSpacing: '0.01em',
        ...style,
      }}
      aria-hidden
      {...props}
    >
      {initials}
      {dot ? (
        <span
          className="absolute rounded-full"
          style={{
            top: -1,
            right: -1,
            width: dotSize,
            height: dotSize,
            background: dot,
            /* Two rings: the page ground cuts it out of the tile, the hairline
               keeps it from dissolving into a light status colour. */
            boxShadow: '0 0 0 2px var(--surface-base)',
          }}
        />
      ) : null}
    </span>
  );
}
