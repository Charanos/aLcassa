/**
 * The inline sparkline that sits under each headline number on the overview.
 *
 * Deliberately NOT a charting-library component. It renders eight readings as
 * a filled area, a line and a terminal dot — a shape, not a chart. It carries
 * no axes, no grid, no tooltip and no interactivity, because at 26px tall none
 * of those can be read anyway, and pulling Recharts in for it would put a
 * client bundle and a mount-time layout pass behind something the server can
 * emit as static SVG.
 *
 * That is also why this file has no `'use client'`: the whole component is
 * arithmetic and markup, so it renders on the server and ships as HTML.
 *
 * ⚠ THE SERIES SCALES TO ITS OWN RANGE, NOT TO ZERO. A satisfaction score
 * moving 4.8 → 4.6 would be a flat line on a zero-based axis; the reader needs
 * to see the shape of the movement, and the number beside it already carries
 * the magnitude. `preserveAspectRatio="none"` lets the shape stretch to
 * whatever width the tile ends up at.
 */

export type SparklineProps = {
  /** Oldest reading first. Fewer than two points renders nothing. */
  series: number[];
  /** A resolved CSS colour — pass a token, e.g. `var(--success-fg)`. */
  stroke: string;
};

const WIDTH = 132;
const HEIGHT = 26;
const PAD = 1.5;

export function Sparkline({ series, stroke }: SparklineProps) {
  // A single reading has no shape to draw, and dividing by `length - 1` below
  // would be a divide-by-zero.
  if (series.length < 2) return null;

  const lo = Math.min(...series);
  const hi = Math.max(...series);
  // A perfectly flat series has zero span; `|| 1` pins it to the midline
  // rather than emitting NaN across every coordinate.
  const span = hi - lo || 1;

  const points = series.map((value, i) => {
    const x = (i / (series.length - 1)) * WIDTH;
    const y = PAD + (1 - (value - lo) / span) * (HEIGHT - PAD * 2);
    return [x, y] as const;
  });

  const line = points
    .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(' ');

  const area = `${line} L${WIDTH} ${HEIGHT} L0 ${HEIGHT} Z`;
  const [lastX, lastY] = points[points.length - 1]!;

  return (
    <svg
      width="100%"
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      fill="none"
      aria-hidden
      style={{ display: 'block', overflow: 'visible' }}
    >
      <path d={area} fill={stroke} fillOpacity={0.09} stroke="none" />
      <path
        d={line}
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r={2} fill={stroke} />
    </svg>
  );
}
