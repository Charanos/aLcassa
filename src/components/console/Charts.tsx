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

function Panel({ label, value, t }: { label: string; value: string; t: Tokens }) {
  return (
    <div
      className="flex flex-col gap-1 overflow-hidden rounded-overlay px-3.5 py-2.5"
      style={{
        background: 'color-mix(in srgb, var(--surface-raised) 75%, transparent)',
        backdropFilter: 'blur(20px) saturate(1.2)',
        border: '1px solid color-mix(in srgb, var(--border-subtle) 60%, transparent)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      <div
        className="font-mono text-2xs font-medium tracking-wide uppercase"
        style={{ color: t.muted }}
      >
        {label}
      </div>
      <div className="font-mono text-base font-medium tracking-[-0.01em]" style={{ color: t.text }}>
        {value}
      </div>
    </div>
  );
}

const AXIS = { fontSize: 'var(--type-chip)', fontFamily: 'var(--font-mono)' };

/* ── MRR over time ───────────────────────────────────────────────────────
 * A line for the level and faint bars for net-new. Two encodings rather than
 * two lines: the level and its month-on-month delta are different quantities,
 * and drawing them both as lines invites reading the gap between them as if it
 * meant something.
 */
export function MrrChart({ data }: { data: Array<{ month: string; mrr: number; net: number }> }) {
  const t = useTokens();

  return (
    <div style={{ height: 340 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="mrr-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={t.ink400} stopOpacity={0.15} />
              <stop offset="100%" stopColor={t.surface} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="color-mix(in srgb, var(--border-subtle) 40%, transparent)"
            vertical={false}
          />
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
                <Panel t={t} label={String(label)} value={`KES ${(mrr / 1_000_000).toFixed(2)}M`} />
              );
            }}
          />
          <Bar
            dataKey="net"
            fill={t.success}
            fillOpacity={0.45}
            radius={[2, 2, 0, 0]}
            barSize={10}
          />
          <Area type="monotone" dataKey="mrr" stroke="none" fill="url(#mrr-fill)" />
          <Line
            type="monotone"
            dataKey="mrr"
            stroke={t.text}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: t.text, stroke: t.surface, strokeWidth: 2 }}
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
export function PlanMixChart({ data }: { data: Array<{ name: string; value: number }> }) {
  const t = useTokens();
  // Premium palette: Primary ink, accent blue, disabled gray
  const ramp = [t.text, t.blue500, t.muted];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div style={{ height: 214 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="86%"
            paddingAngle={4}
            cornerRadius={4}
            stroke="none"
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
    <div className="absolute inset-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
          <Line
            type="monotone"
            dataKey="p99"
            stroke={t.ink300}
            strokeWidth={1.5}
            dot={false}
            style={{ filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.1))' }}
          />
          <Line
            type="monotone"
            dataKey="p95"
            stroke={t.blue500}
            strokeWidth={2.5}
            dot={false}
            style={{ filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.15))' }}
          />
          <Line
            type="monotone"
            dataKey="p50"
            stroke={t.blue200}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
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
export function AgeingChart({ data }: { data: Array<{ bucket: string; amount: number }> }) {
  const t = useTokens();
  // Neutral escalating to danger
  const ink = [t.ink300, t.ink400, t.warning, t.danger];

  return (
    <div className="absolute inset-0">
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
            width={90}
          />
          <Tooltip
            cursor={{ fill: t.rule, fillOpacity: 0.3 }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const v = payload[0]?.value as number;
              return (
                <Panel t={t} label={String(label)} value={`KES ${v.toLocaleString('en-GB')}`} />
              );
            }}
          />
          <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {data.map((d, i) => (
              <Cell key={d.bucket} fill={ink[i % ink.length]} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Workspace status mix ────────────────────────────────────────────────
 * A donut over the portfolio: how many workspaces are active, on trial, past
 * due, suspended.
 *
 * ⚠ THIS IS THE ONE CHART ON THE CONSOLE THAT USES SEMANTIC HUES RATHER THAN
 * THE SINGLE-HUE RAMP, AND THE EXCEPTION IS DELIBERATE.
 *
 * The note at the top of this file is right: plan mix is CATEGORIES, and
 * categories get a ramp because colour there carries no meaning and a six-hue
 * set failed a colour-blindness check. Status is not categories. `past due`
 * and `suspended` already have hues everywhere else in this product — 03 §14
 * fixes them as ochre and oxide — and drawing them in blue-400 and ink-300
 * here would be the console saying one thing in its table and another in its
 * chart about the same tenant.
 *
 * The rule that makes it safe is the one the badge taxonomy already states:
 * HUE IS NEVER ALONE. Every slice is named in the legend beside it with its
 * count, so the chart is fully readable with no colour at all — which is the
 * actual test, and the reason the ramp exists in the first place.
 */
/*
 * The donut's five status colours, resolved. They mirror `statusHue.ts`,
 * which is where the shared definition lives — see that file for why a client
 * module cannot be the single source for a server component.
 */
export function StatusMixChart({
  data,
}: {
  data: Array<{ label: string; count: number; status: string }>;
}) {
  const t = useTokens();
  const total = data.reduce((sum, d) => sum + d.count, 0);

  /* The same five meanings as STATUS_HUE above, resolved to real values —
     an SVG presentation attribute does not reliably resolve var(). 03 §24. */
  const hue: Record<string, string> = {
    active: t.success,
    trial: t.blue400,
    'past due': t.warning,
    suspended: t.danger,
    pending: t.ink300,
  };

  return (
    <div className="h-full min-h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius="70%"
            outerRadius="90%"
            paddingAngle={4}
            strokeWidth={0}
            cornerRadius={6}
          >
            {data.map((d) => (
              <Cell key={d.status} fill={hue[d.status] ?? t.ink300} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0];
              const v = (d?.value as number) ?? 0;
              return (
                <Panel
                  t={t}
                  label={String(d?.name ?? '')}
                  value={`${v} of ${total} · ${Math.round((v / total) * 100)}%`}
                />
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Portfolio growth ────────────────────────────────────────────────────
 * Workspaces opened against workspaces closed, with the net as a line.
 *
 * ⚠ CLOSED IS DRAWN NEGATIVE, NOT AS A SECOND POSITIVE BAR. Two bars growing
 * upward from a shared baseline invite the eye to compare their heights, which
 * is the wrong question — nobody asks "were more opened than closed" and stops
 * there. Mirroring them around zero makes the answer the SHAPE: bars above the
 * line are the business growing, bars below are it shrinking, and the net line
 * tracks where the two land. That reads at a glance and survives greyscale,
 * because the sign is carried by position rather than by colour.
 */
export function GrowthChart({
  data,
}: {
  data: Array<{ month: string; opened: number; closed: number; net: number }>;
}) {
  const t = useTokens();
  const mirrored = data.map((d) => ({ ...d, closedDown: -d.closed }));

  return (
    <div className="absolute inset-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={mirrored} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={t.rule} vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tick={{ fill: t.muted, fontSize: 11 }}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: t.muted, fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: `color-mix(in srgb, ${t.ink300} 18%, transparent)` }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as
                { opened: number; closed: number; net: number } | undefined;
              if (!row) return null;
              return (
                <Panel
                  t={t}
                  label={String(label)}
                  value={`+${row.opened} opened · −${row.closed} closed · net ${
                    row.net >= 0 ? '+' : ''
                  }${row.net}`}
                />
              );
            }}
          />
          <Bar dataKey="opened" fill={t.blue500} radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="closedDown" fill={t.ink300} radius={[0, 0, 4, 4]} maxBarSize={24} />
          <Line
            type="monotone"
            dataKey="net"
            stroke={t.blue200}
            strokeWidth={2.5}
            style={{ filter: 'drop-shadow(0px 4px 6px rgba(0, 0, 0, 0.1))' }}
            dot={false}
            /* The net is a running read, not a category — it gets the lightest
               weight of the same hue so it sits behind the bars rather than
               competing with them. */
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Platform audit volume ───────────────────────────────────────────────
 * Thirty days, one bar a day, stacked into three meanings.
 *
 * ⚠ `serviceRole` IS ITS OWN SERIES BECAUSE IT IS THE QUESTION AN AUDITOR
 * ASKS. Every platform audit row carries `used_service_role` precisely so that
 * "when did we bypass Row Level Security, and why" is one filter rather than a
 * reconstruction. Folding it into a total hides the only series on the chart
 * anybody would investigate.
 *
 * ⚠ THE STACK IS ORDERED BY CONSEQUENCE, not by size: routine at the base,
 * support visits above it, service-role bypasses on top. A stacked bar reads
 * from the baseline up, so the segment that matters most sits where the eye
 * finishes rather than where it starts, and the top edge of the bypass band is
 * readable across the whole month as a line.
 *
 * The three segments are one hue's ramp plus the accent for the bypass band.
 * §24: identity rests on the legend and the axis, not on colour alone.
 */
export function AuditVolumeChart({
  data,
}: {
  data: Array<{ day: string; total: number; serviceRole: number; support: number }>;
}) {
  const t = useTokens();

  const series = data.map((d) => ({
    day: d.day,
    /* Routine is what is LEFT once the two named kinds are taken out, so the
       stack sums to the total rather than double-counting a row that is both
       a support action and a service-role call. */
    routine: Math.max(0, d.total - d.serviceRole - d.support),
    support: d.support,
    serviceRole: d.serviceRole,
    total: d.total,
  }));

  const busiest = series.length > 0 ? series.reduce((a, b) => (b.total > a.total ? b : a)) : null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={168}>
        <ComposedChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={t.rule} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ ...AXIS, fill: t.muted }}
            tickLine={false}
            axisLine={{ stroke: t.rule }}
            interval="preserveStartEnd"
            minTickGap={28}
            tickFormatter={(v: string) => v.slice(8)}
          />
          <YAxis
            tick={{ ...AXIS, fill: t.muted }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={34}
          />
          <Tooltip
            cursor={{ fill: `color-mix(in srgb, ${t.ink300} 22%, transparent)` }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload as (typeof series)[number] | undefined;
              if (!row) return null;
              return (
                <div
                  className="rounded-chip px-3 py-2"
                  style={{
                    background: `color-mix(in srgb, ${t.surface} 88%, transparent)`,
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${t.rule}`,
                    boxShadow: 'var(--shadow-md)',
                  }}
                >
                  <div
                    style={{ font: '400 var(--type-chip)/1.4 var(--font-mono)', color: t.muted }}
                  >
                    {String(label)}
                  </div>
                  <div
                    className="numeric mt-0.5"
                    style={{ fontSize: 'var(--type-compact)', color: t.text }}
                  >
                    {row.total} {row.total === 1 ? 'action' : 'actions'}
                  </div>
                  <div
                    className="mt-1 grid gap-0.5"
                    style={{ font: '400 var(--type-chip)/1.5 var(--font-mono)', color: t.muted }}
                  >
                    <span>{row.routine} routine</span>
                    <span>{row.support} in a support session</span>
                    <span style={{ color: row.serviceRole > 0 ? t.warning : t.muted }}>
                      {row.serviceRole} bypassed RLS
                    </span>
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey="routine" stackId="a" fill={t.blue200} radius={[0, 0, 0, 0]} />
          <Bar dataKey="support" stackId="a" fill={t.blue400} radius={[0, 0, 0, 0]} />
          <Bar dataKey="serviceRole" stackId="a" fill={t.warning} radius={[2, 2, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <Swatch colour={t.blue200}>routine</Swatch>
        <Swatch colour={t.blue400}>support session</Swatch>
        <Swatch colour={t.warning}>bypassed RLS</Swatch>
        {busiest ? (
          <span
            className="ml-auto whitespace-nowrap"
            style={{ font: '400 var(--type-chip)/1 var(--font-mono)', color: t.muted }}
          >
            busiest {busiest.day.slice(5)} · {busiest.total}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** A legend dot. Identity rests here rather than on the colour alone. §24. */
function Swatch({ colour, children }: { colour: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{ font: '400 var(--type-chip)/1 var(--font-ui)', color: 'var(--text-secondary)' }}
    >
      <span aria-hidden className="size-2 shrink-0 rounded-bar" style={{ background: colour }} />
      {children}
    </span>
  );
}

/* ── MRR movement ────────────────────────────────────────────────────────
 * The decomposition the level chart cannot show.
 *
 * ⚠ "MRR ROSE 4%" AND "MRR ROSE 4% WHILE CHURN DOUBLED" ARE THE SAME LINE ON
 * THE CHART ABOVE, AND OPPOSITE BUSINESSES.
 *
 * A level series answers "how are we doing". It cannot answer "why", and the
 * why is where the decisions are: growth carried by new logos is a marketing
 * result, growth carried by expansion is a product result, and flat growth
 * hiding heavy churn replaced by heavy acquisition is a leaking bucket that
 * looks identical from the outside.
 *
 * ⚠ LOSSES ARE DRAWN DOWNWARD, and the data does NOT carry negative numbers.
 * Contraction and churn are positive magnitudes in the read model — a sign
 * convention stored in data is one every call site has to remember, and the
 * first place that forgets renders churn as growth. The negation happens here,
 * once, where the axis is.
 *
 * ⚠ THE ZERO LINE IS DRAWN SOLID. A mirrored chart without an explicit
 * baseline invites reading the top of the loss stack as the baseline, which
 * inverts the whole reading.
 */
export function MovementChart({
  data,
}: {
  data: Array<{
    month: string;
    new: number;
    expansion: number;
    contraction: number;
    churn: number;
  }>;
}) {
  const t = useTokens();

  const series = data.map((d) => ({
    month: d.month,
    gained: d.new,
    expanded: d.expansion,
    /* Negated for the axis only. See the header note. */
    contracted: -d.contraction,
    churned: -d.churn,
    net: d.new + d.expansion - d.contraction - d.churn,
  }));

  const fmt = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n / 1000))}k`;

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={series}
            margin={{ top: 8, right: 4, bottom: 0, left: -8 }}
            stackOffset="sign"
          >
            <CartesianGrid stroke={t.rule} strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ ...AXIS, fill: t.muted }}
              tickLine={false}
              axisLine={{ stroke: t.rule }}
            />
            <YAxis
              tick={{ ...AXIS, fill: t.muted }}
              tickLine={false}
              axisLine={false}
              width={46}
              tickFormatter={fmt}
            />
            <Tooltip
              cursor={{ fill: `color-mix(in srgb, ${t.ink300} 18%, transparent)` }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0]?.payload as (typeof series)[number] | undefined;
                if (!row) return null;
                return (
                  <div
                    className="rounded-chip px-3 py-2"
                    style={{
                      background: `color-mix(in srgb, ${t.surface} 88%, transparent)`,
                      backdropFilter: 'blur(12px)',
                      border: `1px solid ${t.rule}`,
                      boxShadow: 'var(--shadow-md)',
                    }}
                  >
                    <div
                      style={{ font: '400 var(--type-chip)/1.4 var(--font-mono)', color: t.muted }}
                    >
                      {String(label)}
                    </div>
                    <div
                      className="numeric mt-0.5"
                      style={{
                        fontSize: 'var(--type-compact)',
                        color: row.net >= 0 ? t.success : t.danger,
                      }}
                    >
                      {row.net >= 0 ? '+' : '−'}
                      {Math.abs(Math.round(row.net / 1000))}k net
                    </div>
                    <div
                      className="mt-1 grid gap-0.5"
                      style={{ font: '400 var(--type-chip)/1.5 var(--font-mono)', color: t.muted }}
                    >
                      <span>new {fmt(row.gained)}</span>
                      <span>expansion {fmt(row.expanded)}</span>
                      <span>contraction {fmt(row.contracted)}</span>
                      <span>churn {fmt(row.churned)}</span>
                    </div>
                  </div>
                );
              }}
            />
            {/* The zero line, explicit. */}
            <Line
              type="linear"
              dataKey={() => 0}
              stroke={t.rule}
              strokeWidth={1}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              legendType="none"
            />
            <Bar dataKey="gained" stackId="m" fill={t.blue500} radius={[2, 2, 0, 0]} />
            <Bar dataKey="expanded" stackId="m" fill={t.blue200} radius={[0, 0, 0, 0]} />
            <Bar dataKey="contracted" stackId="m" fill={t.ink300} radius={[0, 0, 0, 0]} />
            <Bar dataKey="churned" stackId="m" fill={t.danger} radius={[0, 0, 2, 2]} />
            <Line
              type="monotone"
              dataKey="net"
              stroke={t.text}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1.5 pb-1">
        <Swatch colour={t.blue500}>new</Swatch>
        <Swatch colour={t.blue200}>expansion</Swatch>
        <Swatch colour={t.ink300}>contraction</Swatch>
        <Swatch colour={t.danger}>churn</Swatch>
        <span
          className="inline-flex items-center gap-1.5 whitespace-nowrap"
          style={{ font: '400 var(--type-chip)/1 var(--font-ui)', color: 'var(--text-secondary)' }}
        >
          <span
            aria-hidden
            className="shrink-0"
            style={{ width: 10, height: 2, borderRadius: 'var(--radius-bar)', background: t.text }}
          />
          net
        </span>
      </div>
    </div>
  );
}
