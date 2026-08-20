'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Charts for the tracker.
 *
 * ⚠ THE PALETTE FINDING THAT SHAPED ALL THREE OF THESE.
 *
 * Running the six-check validator over aLcassa's six hues as a categorical
 * palette FAILS, and not marginally: copper against ochre is ΔE 6.8 to NORMAL
 * vision and 1.5 under deuteranopia. They are adjacent warm hues by design,
 * chosen so a row of status chips does not vibrate, and that same restraint
 * makes them unusable as neighbouring series in a chart.
 *
 * The wrong fix is to invent brighter chart-only hues, which would give the
 * page a second palette. The right fix is to CHOOSE FORMS THAT DO NOT NEED SIX
 * CATEGORICAL COLOURS:
 *
 *   · magnitude by category  →  one bar per category, category on the axis,
 *                               ONE hue. Colour encodes nothing, so it cannot
 *                               be ambiguous.
 *   · progress per milestone →  one hue, status carried by a labelled chip
 *                               beside the bar rather than by fill.
 *
 * Every value is directly labelled, so identity never rests on colour at all,
 * which is also what 03 §3 rule 3 already required of the interface.
 *
 * `--copper-solid` is the single series hue. It passes contrast against both
 * surfaces and it is the system's one interactive/brand hue, which is the
 * correct reading here: these bars are the subject, not a status.
 */

/** Recharts needs real colour values — see the note above on presentation
 *  attributes — so the tokens are read out of the computed style once, on
 *  mount. With one theme they never change again after that read. */
function useTokens() {
  const [tokens, setTokens] = useState({
    series: '#A6572A',
    grid: '#ECE5D8',
    axis: '#635D54',
    ink: '#1F1C18',
    surface: '#FFFEFB',
    rule: '#D8CFBD',
  });

  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    const get = (name: string, fallback: string) => s.getPropertyValue(name).trim() || fallback;

    setTokens({
      series: get('--copper-solid', '#A6572A'),
      grid: get('--rule-soft', '#ECE5D8'),
      axis: get('--ink-tertiary', '#635D54'),
      ink: get('--ink-primary', '#1F1C18'),
      surface: get('--surface-raised', '#FFFEFB'),
      rule: get('--rule-base', '#D8CFBD'),
    });
  }, []);

  return tokens;
}

const TONE_NAMES = ['copper', 'verdigris', 'ochre', 'oxide', 'slate', 'graphite'] as const;
type ToneName = (typeof TONE_NAMES)[number];

const TONE_FALLBACK: Record<ToneName, string> = {
  copper: '#A6572A',
  verdigris: '#1A6155',
  ochre: '#78570F',
  oxide: '#98301D',
  slate: '#425A79',
  graphite: '#55504A',
};

/**
 * Resolves `--{tone}-ink` to an actual colour string for every tone, read
 * once on mount. A Recharts `Cell` sets `fill` as an SVG attribute rather than
 * a style in some render paths, and `var()` resolution in a bare SVG
 * presentation attribute is not reliable across engines, so the colour has to
 * be a real value by the time it reaches the chart. `useTokens` above does the
 * same thing for the single series hue; this is the six-tone version of it.
 */
export function useToneColors(): Record<ToneName, string> {
  const [colors, setColors] = useState<Record<ToneName, string>>(TONE_FALLBACK);

  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    const next = { ...TONE_FALLBACK };
    TONE_NAMES.forEach((tone) => {
      const value = s.getPropertyValue(`--${tone}-ink`).trim();
      if (value) next[tone] = value;
    });
    setColors(next);
  }, []);

  return colors;
}

type Datum = { label: string; value: number; note?: string };

function ChartTooltip({
  active,
  payload,
  suffix,
  surface,
  rule,
  ink,
}: {
  active?: boolean;
  payload?: Array<{ payload: Datum }>;
  suffix: string;
  surface: string;
  rule: string;
  ink: string;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  return (
    <div
      className="rounded-chip border px-3 py-2"
      style={{ background: surface, borderColor: rule, boxShadow: 'var(--shadow-overlay)' }}
    >
      <div className="t-caption" style={{ color: ink }}>
        {datum.label}
      </div>
      <div className="t-data" style={{ color: ink, fontSize: '15px' }}>
        {datum.value}
        {suffix}
      </div>
      {datum.note ? (
        <div className="t-caption mt-0.5" style={{ color: 'var(--ink-tertiary)' }}>
          {datum.note}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Horizontal bars, category on the axis, one hue.
 *
 * Horizontal rather than vertical because the categories are words rather than
 * dates: a vertical bar chart with eight word labels either rotates them to 45
 * degrees or truncates them, and both are worse than turning the chart.
 */
export function CategoryBars({
  data,
  suffix = '',
  max,
  height = 260,
  labelWidth = 96,
}: {
  data: Datum[];
  suffix?: string;
  max?: number;
  height?: number;
  labelWidth?: number;
}) {
  const t = useTokens();

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 44, bottom: 4, left: 0 }}
          barCategoryGap={8}
        >
          <XAxis type="number" hide domain={[0, max ?? 'dataMax']} />
          <YAxis
            type="category"
            dataKey="label"
            width={labelWidth}
            tickLine={false}
            axisLine={{ stroke: t.rule }}
            tick={{ fill: t.axis, fontSize: 12, fontFamily: 'var(--font-sans)' }}
          />
          <Tooltip
            cursor={{ fill: 'transparent' }}
            content={
              <ChartTooltip suffix={suffix} surface={t.surface} rule={t.rule} ink={t.ink} />
            }
          />
          <Bar
            dataKey="value"
            fill={t.series}
            /* 4px rounded data-end, anchored to the baseline: the end away from
               the axis is rounded, the end at the axis stays square. */
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell key={entry.label} />
            ))}
            {/* Direct labels, so no value has to be read off a gridline and
                identity never rests on the fill. */}
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value: unknown) =>
                typeof value === 'number' ? `${value}${suffix}` : ''
              }
              style={{ fill: t.ink, fontSize: 12, fontFamily: 'var(--font-mono)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * A line across the milestones, in delivery order.
 *
 * Unlike the foundation breakdown, milestones have a genuine sequence: M0
 * before M1 before M2, each one a step the last depends on. That is exactly
 * the case a line earns its keep over a bar, per the form heuristic: change
 * across an ORDERED axis reads as a line, magnitude across an unordered one
 * reads as a bar. One hue, direct labels on every point since eight points is
 * not enough to need thinning, and a very soft fill under the line rather than
 * a hard area, so the shape reads without competing with the numbers.
 */
export function ProgressLine({
  data,
  suffix = '',
  height = 240,
}: {
  data: Datum[];
  suffix?: string;
  height?: number;
}) {
  const t = useTokens();
  const gradientId = 'aLcassa-progress-fill';

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 26, right: 12, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.series} stopOpacity={0.18} />
              <stop offset="100%" stopColor={t.series} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={t.grid} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: t.rule }}
            tick={{ fill: t.axis, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            interval={0}
          />
          <YAxis hide domain={[0, 100]} />
          <Tooltip
            cursor={{ stroke: t.rule, strokeWidth: 1 }}
            content={<ChartTooltip suffix={suffix} surface={t.surface} rule={t.rule} ink={t.ink} />}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={t.series}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={{ r: 4, fill: t.series, strokeWidth: 2, stroke: t.surface }}
            activeDot={{ r: 6, strokeWidth: 0 }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="value"
              position="top"
              formatter={(value: unknown) =>
                typeof value === 'number' ? `${value}${suffix}` : ''
              }
              style={{ fill: t.ink, fontSize: 11, fontFamily: 'var(--font-mono)' }}
            />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * A proportion of a fixed, small, exhaustive whole, as a donut.
 *
 * ⚠ THIS IS DELIBERATELY A PIE, AND `dataviz`'s DEFAULT ADVICE IS TO AVOID ONE.
 *
 * The usual failure a pie chart invites is exactly the one the palette
 * validator caught earlier in this file: many wedges, hues too close to
 * separate, angle judged worse than length. None of that applies to what this
 * draws. The set is fixed at three items (built, scaffolded, planned), the
 * actual question being asked is "what share of the whole is each", which is
 * the one question a pie answers better than a bar, and the segments still
 * carry a direct label, a percentage and a legend row rather than depending on
 * angle alone.
 *
 * The centre is not decoration. A donut's hole is normally empty; putting the
 * total there answers the first question a reader has, "how many items is
 * this", before they have read a single wedge.
 */
export function ProportionDonut({
  segments,
  centerLabel,
  size = 168,
}: {
  segments: Array<{ label: string; value: number; ink: string; hatch?: boolean }>;
  centerLabel: { value: number; caption: string };
  size?: number;
}) {
  const t = useTokens();
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;
  const patternId = 'aLcassa-donut-hatch';

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer>
          <PieChart>
            {/* The system's own hatch, reused rather than invented: it already
                means "this capacity exists and is not available yet", which is
                precisely what the "planned" wedge is. */}
            <defs>
              <pattern
                id={patternId}
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill={t.surface} />
                <line x1="0" y1="0" x2="0" y2="6" stroke={t.rule} strokeWidth="1.6" />
              </pattern>
            </defs>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="label"
              innerRadius="66%"
              outerRadius="99%"
              paddingAngle={3}
              stroke={t.surface}
              strokeWidth={2}
              isAnimationActive={false}
            >
              {segments.map((segment) => (
                <Cell key={segment.label} fill={segment.hatch ? `url(#${patternId})` : segment.ink} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0]?.payload as
                  | (typeof segments)[number]
                  | undefined;
                if (!point) return null;
                return (
                  <div
                    className="rounded-chip border px-3 py-2"
                    style={{ background: t.surface, borderColor: t.rule, boxShadow: 'var(--shadow-overlay)' }}
                  >
                    <div className="t-caption" style={{ color: t.ink }}>
                      {point.label}
                    </div>
                    <div className="t-data" style={{ color: t.ink, fontSize: 15 }}>
                      {point.value} · {Math.round((point.value / total) * 100)}%
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* The centre label sits in the donut's hole as a plain absolutely
            positioned layer, since recharts has no first-class slot for one. */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="t-data tabular-nums" style={{ color: t.ink, fontSize: 26, lineHeight: 1 }}>
              {centerLabel.value}
            </div>
            <div className="t-eyebrow mt-1.5" style={{ color: t.axis }}>
              {centerLabel.caption}
            </div>
          </div>
        </div>
      </div>

      <ul className="grid w-full gap-2">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{
                background: segment.hatch ? undefined : segment.ink,
                backgroundImage: segment.hatch ? 'var(--hatch-graphite)' : undefined,
                boxShadow: `inset 0 0 0 1px ${segment.ink}`,
              }}
            />
            <span className="t-caption flex-1 text-[var(--ink-secondary)]">{segment.label}</span>
            <span className="t-data tabular-nums text-[var(--ink-primary)]" style={{ fontSize: '12px' }}>
              {segment.value}
            </span>
            <span className="t-caption w-9 text-right text-[var(--ink-tertiary)]">
              {Math.round((segment.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A one-row stacked meter. Used where the parts genuinely make a whole, with a
 * 2px surface gap between segments and a legend below carrying glyph and word.
 *
 * The segments are distinguished by LIGHTNESS steps of one hue plus the
 * system's own hatch for the "not yet" segment, rather than by three hues that
 * the validator says a reader cannot separate.
 */
export function StackedMeter({
  segments,
  total,
}: {
  segments: Array<{ label: string; value: number; fill: string; hatch?: boolean }>;
  total: number;
}) {
  return (
    <div>
      <div
        className="flex h-3 w-full overflow-hidden rounded-chip"
        style={{ background: 'var(--surface-sunken)', gap: '2px' }}
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${String(s.value)}`).join(', ')}
      >
        {segments.map((segment) => (
          <span
            key={segment.label}
            style={{
              width: `${((segment.value / total) * 100).toFixed(2)}%`,
              background: segment.hatch ? undefined : segment.fill,
              backgroundImage: segment.hatch ? 'var(--hatch-graphite)' : undefined,
              boxShadow: segment.hatch ? `inset 0 0 0 1px ${segment.fill}` : undefined,
            }}
          />
        ))}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{
                background: segment.hatch ? undefined : segment.fill,
                backgroundImage: segment.hatch ? 'var(--hatch-graphite)' : undefined,
                boxShadow: `inset 0 0 0 1px ${segment.fill}`,
              }}
            />
            <span className="t-caption text-[var(--ink-secondary)]">{segment.label}</span>
            <span className="t-data tabular-nums text-[var(--ink-primary)]" style={{ fontSize: '12px' }}>
              {segment.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
