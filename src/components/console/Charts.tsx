'use client';

import { useEffect, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Console charts.
 *
 * ⚠ COLOURS ARE RESOLVED TO REAL VALUES BEFORE THEY REACH RECHARTS.
 *
 * Recharts sets `fill` and `stroke` as SVG PRESENTATION ATTRIBUTES on some
 * render paths, and `var(--blue-500)` in a bare presentation attribute is not
 * reliably resolved across engines — it renders black in Safari and silently
 * nothing in some Firefox builds. So every colour is read out of the computed
 * style once, on mount. This is unrelated to theming: with one theme these
 * values never change again after that read, which is why there is no
 * `MutationObserver` here any more — it used to re-read on a `data-theme`
 * flip that no longer happens.
 *
 * ⚠ THE PALETTE IS ONE HUE PLUS A NEUTRAL, NOT A CATEGORICAL SET.
 *
 * 15-spec-delta A6 recorded that the old six-hue palette failed a
 * colour-blindness check as chart series. The aLcassa palette is narrower
 * still — one blue, one orange with a per-screen budget — so these charts use
 * a SINGLE-HUE RAMP (blue-500 → blue-400 → ink-300) and put identity on the
 * axis and in a direct legend rather than resting it on colour. Plan mix reads
 * correctly in greyscale, which is the actual test.
 */

type Tokens = {
  blue500: string;
  blue400: string;
  blue200: string;
  ink300: string;
  ink400: string;
  success: string;
  warning: string;
  danger: string;
  rule: string;
  surface: string;
  text: string;
  muted: string;
};

const FALLBACK: Tokens = {
  blue500: '#043ae1',
  blue400: '#4980fc',
  blue200: '#c0d5ff',
  ink300: '#bbc1d2',
  ink400: '#8b8f99',
  success: '#3f7d53',
  warning: '#b7791f',
  danger: '#c4243a',
  rule: '#d8ddea',
  surface: '#ffffff',
  text: '#17225d',
  muted: '#64708b',
};

const VARS: Record<keyof Tokens, string> = {
  blue500: '--blue-500',
  blue400: '--blue-400',
  blue200: '--blue-200',
  ink300: '--ink-300',
  ink400: '--ink-400',
  success: '--success-fg',
  warning: '--warning-fg',
  danger: '--danger-fg',
  rule: '--border-subtle',
  surface: '--surface-raised',
  text: '--text-primary',
  muted: '--text-secondary',
};

function useTokens(): Tokens {
  const [tokens, setTokens] = useState<Tokens>(FALLBACK);

  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    const next = { ...FALLBACK };
    (Object.keys(VARS) as Array<keyof Tokens>).forEach((k) => {
      const v = s.getPropertyValue(VARS[k]).trim();
      if (v) next[k] = v;
    });
    setTokens(next);
  }, []);

  return tokens;
}

function Panel({
  label,
  value,
  t,
}: {
  label: string;
  value: string;
  t: Tokens;
}) {
  return (
    <div
      className="rounded-chip px-3 py-2"
      style={{
        background: `color-mix(in srgb, ${t.surface} 85%, transparent)`,
        backdropFilter: 'blur(12px)',
        border: `1px solid ${t.rule}`,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ font: '400 11px/1.4 var(--font-ui)', color: t.muted }}>{label}</div>
      <div
        className="numeric mt-0.5"
        style={{ fontSize: 'var(--text-sm)', color: t.text }}
      >
        {value}
      </div>
    </div>
  );
}

const AXIS = { fontSize: 11, fontFamily: 'var(--font-mono)' };

/* ── MRR over time ───────────────────────────────────────────────────────
 * A line for the level and faint bars for net-new. Two encodings rather than
 * two lines: the level and its month-on-month delta are different quantities,
 * and drawing them both as lines invites reading the gap between them as if it
 * meant something.
 */
export function MrrChart({
  data,
}: {
  data: Array<{ month: string; mrr: number; net: number }>;
}) {
  const t = useTokens();

  return (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="mrr-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.blue500} stopOpacity={0.16} />
              <stop offset="100%" stopColor={t.blue500} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={t.rule} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ ...AXIS, fill: t.muted }}
            axisLine={{ stroke: t.rule }}
            tickLine={false}
          />
          <YAxis
            tick={{ ...AXIS, fill: t.muted }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: t.rule }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const mrr = payload.find((p) => p.dataKey === 'mrr')?.value as number;
              return (
                <Panel
                  t={t}
                  label={String(label)}
                  value={`KES ${(mrr / 1_000_000).toFixed(2)}M`}
                />
              );
            }}
          />
          <Bar dataKey="net" fill={t.success} fillOpacity={0.45} radius={[2, 2, 0, 0]} barSize={10} />
          <Area type="monotone" dataKey="mrr" stroke="none" fill="url(#mrr-fill)" />
          <Line
            type="monotone"
            dataKey="mrr"
            stroke={t.blue500}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: t.blue500, stroke: t.surface, strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Plan mix ────────────────────────────────────────────────────────────
 * A donut, single-hue ramp. The legend beneath carries the name, the tenant
 * count and the value, so the chart is a proportion cue and never the only
 * place a number lives.
 */
export function PlanMixChart({
  data,
}: {
  data: Array<{ name: string; value: number }>;
}) {
  const t = useTokens();
  const ramp = [t.blue500, t.blue400, t.ink300];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={{ height: 214 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="86%"
            paddingAngle={2}
            stroke={t.surface}
            strokeWidth={2}
          >
            {data.map((d, i) => (
              <Cell key={d.name} fill={ramp[i % ramp.length]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0];
              const v = d?.value as number;
              return (
                <Panel
                  t={t}
                  label={String(d?.name ?? '')}
                  value={`${Math.round((v / total) * 100)}% · ${(v / 1_000_000).toFixed(2)}M`}
                />
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Response latency ────────────────────────────────────────────────────
 * Three percentiles as three weights of ONE hue, not three colours.
 *
 * p50/p95/p99 are an ordered series, not categories — the reader's question is
 * "how far does the tail stretch", and an ordered question wants an ordered
 * encoding. Three saturated hues would also put the least important line (p50,
 * which is almost always flat and boring) at the same visual weight as p99,
 * which is the one that wakes someone up.
 */
export function LatencyChart({
  data,
}: {
  data: Array<{ t: string; p50: number; p95: number; p99: number }>;
}) {
  const t = useTokens();

  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke={t.rule} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ ...AXIS, fill: t.muted }}
            axisLine={{ stroke: t.rule }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ ...AXIS, fill: t.muted }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}ms`}
            width={48}
          />
          <Tooltip
            cursor={{ stroke: t.rule }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const get = (k: string) => payload.find((p) => p.dataKey === k)?.value as number;
              return (
                <Panel
                  t={t}
                  label={String(label)}
                  value={`p50 ${get('p50')} · p95 ${get('p95')} · p99 ${get('p99')}`}
                />
              );
            }}
          />
          <Line type="monotone" dataKey="p99" stroke={t.ink300} strokeWidth={1.5} dot={false} />
          <Line type="monotone" dataKey="p95" stroke={t.blue500} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="p50" stroke={t.blue200} strokeWidth={1.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Throughput and errors ───────────────────────────────────────────────
 * Requests as bars on the left axis, error RATE as a line on the right.
 *
 * Two axes because the quantities differ by four orders of magnitude — an
 * error rate of 0.4% plotted against 12,000 requests is a flat line on the
 * floor, which is exactly the shape that hides a spike.
 */
export function ThroughputChart({
  data,
}: {
  data: Array<{ t: string; requests: number; errors: number }>;
}) {
  const t = useTokens();
  const peak = Math.max(...data.map((d) => d.errors));

  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -14 }}>
          <CartesianGrid stroke={t.rule} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="t"
            tick={{ ...AXIS, fill: t.muted }}
            axisLine={{ stroke: t.rule }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            yAxisId="req"
            tick={{ ...AXIS, fill: t.muted }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            width={44}
          />
          <YAxis yAxisId="err" orientation="right" hide domain={[0, peak * 3]} />
          <Tooltip
            cursor={{ fill: t.rule, fillOpacity: 0.3 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const req = payload.find((p) => p.dataKey === 'requests')?.value as number;
              const err = payload.find((p) => p.dataKey === 'errors')?.value as number;
              return (
                <Panel
                  t={t}
                  label={String(label)}
                  value={`${req.toLocaleString('en-GB')} req · ${err}% errors`}
                />
              );
            }}
          />
          <Bar
            yAxisId="req"
            dataKey="requests"
            fill={t.blue400}
            fillOpacity={0.5}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="err"
            type="monotone"
            dataKey="errors"
            stroke={t.danger}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Invoice ageing ──────────────────────────────────────────────────────
 * Horizontal bars, because the categories are age BUCKETS and a bucket label
 * ("61–90 days") does not fit under a vertical bar without rotating, and
 * rotated axis labels are a reliable way to make a small chart unreadable.
 *
 * Colour escalates with age rather than being categorical: this is an ordered
 * scale, and the reader's question is "how much is very late", not "which
 * bucket is which".
 */
export function AgeingChart({
  data,
}: {
  data: Array<{ bucket: string; amount: number }>;
}) {
  const t = useTokens();
  const ink = [t.blue200, t.blue400, t.warning, t.danger];

  return (
    <div style={{ height: 214 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 12, bottom: 0, left: 8 }}
        >
          <CartesianGrid stroke={t.rule} strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tick={{ ...AXIS, fill: t.muted }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <YAxis
            type="category"
            dataKey="bucket"
            tick={{ ...AXIS, fill: t.muted }}
            axisLine={false}
            tickLine={false}
            width={72}
          />
          <Tooltip
            cursor={{ fill: t.rule, fillOpacity: 0.3 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const v = payload[0]?.value as number;
              return <Panel t={t} label={String(label)} value={`KES ${v.toLocaleString('en-GB')}`} />;
            }}
          />
          <Bar dataKey="amount" radius={[0, 3, 3, 0]} barSize={18}>
            {data.map((d, i) => (
              <Cell key={d.bucket} fill={ink[i % ink.length]} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
