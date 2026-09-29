'use client';

import React, { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { IconArrowDownRight, IconArrowUpRight } from '@tabler/icons-react';
/**
 * The hero's chart.
 *
 * ⚠ IT INVENTED ITS OWN DATA, AND THE INVENTION WAS THREE SEPARATE DEFECTS.
 *
 *   1. The series was a `Math.random()` walk. Not a placeholder shaped like
 *      real data — literally random, regenerated on every mount, so the
 *      "platform throughput" a reader watched climb was a different climb each
 *      time they opened the page. It also HYDRATION-MISMATCHED: the server
 *      rendered one walk and the client rendered another, which React logs and
 *      repaints.
 *   2. `3.42M` was a hardcoded headline over that random series, so the figure
 *      and the line it labelled were unrelated to each other.
 *   3. `+12.4% vs last month` was hardcoded too, in success green, asserting a
 *      trend nothing had measured.
 *
 * It takes its series as a prop now. The data is `revenueSeries()` from
 * `portfolio.ts` — twelve months of recurring revenue derived from the same
 * twelve workspaces the seed writes, already reconciled (each month's net is
 * the difference between that month and the one before it, computed per
 * workspace rather than asserted).
 *
 * ⚠ WHY REVENUE RATHER THAN A REQUEST RATE. The label said "platform
 * throughput" and nothing in this product measures requests — there is no
 * metrics pipeline, the health page says so in its own copy, and `usage_counters`
 * holds current values with no history to plot. Revenue is the one twelve-month
 * series this database can actually answer, and it is the series the business
 * is run on. A chart of a number we have beats a beautiful chart of a number we
 * do not.
 */
export function OverviewChart({
  series,
  currency = 'KES',
}: {
  /** Twelve months, oldest first. `revenueSeries()`. */
  series: ReadonlyArray<{ month: string; mrr: number }>;
  currency?: string;
}) {
  const chartId = useId();

  const data = useMemo(() => series.map((m) => ({ day: m.month, volume: m.mrr })), [series]);

  /**
   * The headline and its delta, computed from the series rather than typed.
   *
   * ⚠ THE DELTA IS SIGNED AND ITS COLOUR FOLLOWS THE SIGN. The hardcoded one
   * was green and positive with no way to be anything else — so a month where
   * the platform lost revenue would have rendered a green rise, on the hero,
   * for as long as it took somebody to notice.
   */
  const current = series.at(-1)?.mrr ?? 0;
  const previous = series.at(-2)?.mrr ?? 0;
  const delta = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const rising = delta >= 0;

  const headline =
    current >= 1_000_000
      ? `${(current / 1_000_000).toFixed(2)}M`
      : current >= 1_000
        ? `${Math.round(current / 1_000)}k`
        : String(current);

  return (
    <div className="relative h-full min-h-[260px] w-full overflow-hidden">
      {/* Subtle interior glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          background: 'radial-gradient(circle at 70% 30%, var(--invert-card-fg), transparent 60%)',
        }}
      />

      {/* t-eyebrow: refined typography with premium tracking */}
      <div className="pointer-events-none absolute top-6 left-6 z-10">
        <p
          className="t-eyebrow mb-2.5"
          style={{
            color: 'var(--invert-card-fg)',
            opacity: 0.6,
            letterSpacing: '0.08em',
          }}
        >
          RECURRING REVENUE · 12 MONTHS
        </p>
        <div className="flex items-baseline gap-3.5">
          {/* numeric: robust and distinct figures */}
          <div
            className="numeric"
            style={{
              fontSize: '28px',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--invert-card-fg)',
              lineHeight: 1,
              textShadow: '0 2px 10px rgba(255,255,255,0.1)',
            }}
          >
            {headline}
          </div>
          <span
            className="font-mono text-sm"
            style={{ color: 'var(--invert-card-fg)', opacity: 0.45 }}
          >
            {currency} per month
          </span>
        </div>
      </div>

      {/* The delta, signed. Green is earned here rather than assumed. */}
      <div className="pointer-events-none absolute top-6 right-6 z-10 flex items-center gap-1.5">
        {rising ? (
          <IconArrowUpRight size={14} stroke={2.5} style={{ color: 'var(--chrome-success)' }} />
        ) : (
          <IconArrowDownRight size={14} stroke={2.5} style={{ color: 'var(--chrome-danger)' }} />
        )}
        <span
          className="font-mono text-sm font-medium"
          style={{ color: rising ? 'var(--chrome-success)' : 'var(--chrome-danger)' }}
        >
          {rising ? '+' : ''}
          {delta.toFixed(1)}% vs last month
        </span>
      </div>

      <div className="absolute inset-0 px-3 pt-20 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--invert-card-fg)" stopOpacity={0.15} />
                <stop offset="50%" stopColor="var(--invert-card-fg)" stopOpacity={0.05} />
                <stop offset="100%" stopColor="var(--invert-card-fg)" stopOpacity={0.0} />
              </linearGradient>
              <filter id={`glow-${chartId}`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <CartesianGrid strokeDasharray="4 6" vertical={false} stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{
                fill: 'var(--invert-card-fg)',
                opacity: 0.4,
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
              dy={14}
              minTickGap={32}
            />
            <YAxis hide={true} domain={['dataMin - 5000', 'dataMax + 25000']} />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  if (!data) return null;
                  return (
                    <div
                      className="rounded-overlay border px-3.5 py-2.5 shadow-2xl backdrop-blur-xl"
                      style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        boxShadow:
                          '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08)',
                      }}
                    >
                      <div
                        className="t-eyebrow mb-1.5 uppercase"
                        style={{
                          color: 'var(--invert-card-fg)',
                          opacity: 0.6,
                          fontSize: '9px',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {(data.payload as { day?: string })?.day}
                      </div>
                      <div
                        className="flex items-center gap-2 font-mono"
                        style={{
                          color: 'var(--invert-card-fg)',
                          fontSize: '13px',
                          fontWeight: 500,
                        }}
                      >
                        <span className="size-1.5 rounded-full bg-[var(--invert-card-fg)] opacity-80 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                        {new Intl.NumberFormat('en-GB').format((data.value as number) || 0)}{' '}
                        <span className="opacity-50">{currency}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="volume"
              stroke="var(--invert-card-fg)"
              strokeWidth={1.5}
              fillOpacity={1}
              fill={`url(#gradient-${chartId})`}
              filter={`url(#glow-${chartId})`}
              activeDot={{
                r: 4,
                fill: 'var(--invert-card-bg)',
                stroke: 'var(--invert-card-fg)',
                strokeWidth: 2.5,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
