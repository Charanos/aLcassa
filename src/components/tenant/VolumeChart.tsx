'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { VolumePoint } from '@/lib/tenant/data';

/**
 * Conversation volume over the period: what the assistant closed, against what
 * reached a person.
 *
 * ⚠ EVERY COLOUR HERE IS A `var(--token)` STRING RATHER THAN A RESOLVED ONE.
 * The design's own `charts.jsx` reads tokens through `getComputedStyle` at
 * mount. There is no `MutationObserver` here and there was never one to
 * remove: nothing in `src` writes `data-theme`, and this product is
 * deliberately single-theme (`tokens.css`). `console/Charts.tsx` documents
 * the same decision from the other side; the two files used to disagree.
 * because it renders into a canvas-style preview that cannot rely on the
 * cascade. Nothing here needs that: these are SVG presentation attributes, so
 * the browser resolves the custom property itself and the chart re-paints on a
 * theme flip with no observer, no re-render and no second copy of the palette
 * living in JavaScript.
 *
 * Two series, and the quieter one is the one that matters — `escalated` is
 * drawn as an unfilled line so it reads against the filled `handled` area
 * rather than competing with it. The point of the chart is the RATIO.
 */

export type VolumeChartProps = {
  data: VolumePoint[];
  /** Matches the design's 220px plot. */
  height?: number;
};

const AXIS = {
  stroke: 'var(--text-tertiary)',
  fontSize: 'var(--type-chip)',
  fontFamily: 'var(--font-mono)',
  tickLine: false,
  axisLine: false,
} as const;

const SERIES = [
  { key: 'handled', label: 'Handled by the assistant', colour: 'var(--blue-500)' },
  { key: 'escalated', label: 'Reached a person', colour: 'var(--ink-300)' },
] as const;

function VolumeTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-panel border px-3 py-2"
      style={{
        background: 'var(--surface-raised)',
        borderColor: 'var(--border-subtle)',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <p className="t-micro mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
        {label}
      </p>
      {payload.map((row) => (
        <div key={row.dataKey} className="flex items-center gap-2 whitespace-nowrap">
          <span
            className="size-2 shrink-0 rounded-bar"
            style={{ background: row.color }}
            aria-hidden
          />
          <span className="t-compact flex-1" style={{ color: 'var(--text-secondary)' }}>
            {row.name}
          </span>
          <span className="t-data" style={{ color: 'var(--text-primary)' }}>
            {row.value?.toLocaleString('en-US')}
          </span>
        </div>
      ))}
    </div>
  );
}

export function VolumeChart({ data, height = 220 }: VolumeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="volume-handled-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--blue-500)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--blue-500)" stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
        <XAxis dataKey="date" {...AXIS} />
        <YAxis width={48} {...AXIS} />
        <Tooltip content={<VolumeTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />

        <Area
          type="monotone"
          dataKey={SERIES[0].key}
          name={SERIES[0].label}
          stroke={SERIES[0].colour}
          strokeWidth={1.75}
          fill="url(#volume-handled-fill)"
        />
        <Area
          type="monotone"
          dataKey={SERIES[1].key}
          name={SERIES[1].label}
          stroke={SERIES[1].colour}
          strokeWidth={1.75}
          fill="transparent"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** The chart's own key, rendered in the card header beside the title. */
export function VolumeLegend() {
  return (
    <span className="flex flex-wrap items-center gap-4">
      {SERIES.map((s) => (
        <span key={s.key} className="t-compact flex items-center gap-1.5 whitespace-nowrap">
          <span className="h-0.5 w-2.5 rounded-bar" style={{ background: s.colour }} aria-hidden />
          <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
        </span>
      ))}
    </span>
  );
}
