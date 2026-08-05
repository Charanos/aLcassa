'use client';

import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
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
 * Running the six-check validator over Conduit's six hues as a categorical
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

/** Recharts needs real colour values, so the tokens are read once on mount and
 *  re-read when the theme attribute flips. */
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
    const read = () => {
      const s = getComputedStyle(document.documentElement);
      const get = (name: string, fallback: string) =>
        s.getPropertyValue(name).trim() || fallback;

      setTokens({
        series: get('--copper-solid', '#A6572A'),
        grid: get('--rule-soft', '#ECE5D8'),
        axis: get('--ink-tertiary', '#635D54'),
        ink: get('--ink-primary', '#1F1C18'),
        surface: get('--surface-raised', '#FFFEFB'),
        rule: get('--rule-base', '#D8CFBD'),
      });
    };

    read();

    // The theme toggle flips a data attribute rather than reloading, so the
    // chart has to notice. A MutationObserver on that one attribute is cheaper
    // and more reliable than a custom event both sides have to remember.
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return tokens;
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
