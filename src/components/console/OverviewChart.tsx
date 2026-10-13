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
/** Recurring revenue and month-over-month change share the supplied portfolio series. */
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

  // Preserve the sign and color of the measured month-over-month change.
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
      <div className="pointer-events-none relative z-10 px-6 pt-6">
        <p
          className="t-compact mb-2.5"
          style={{
            color: 'var(--invert-card-fg)',
            opacity: 0.85,
          }}
        >
          Monthly subscription value
        </p>
        <div className="flex items-baseline gap-3.5">
          {/* numeric: robust and distinct figures */}
          <div
            className="numeric"
            style={{
              fontSize: 'var(--type-heading)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              color: 'var(--invert-card-fg)',
              lineHeight: 1,
              textShadow: '0 2px 10px rgba(255,255,255,0.1)',
            }}
          >
            {headline}
          </div>
          <span className="font-mono text-sm" style={{ color: 'var(--chrome-fg-muted)' }}>
            {currency} per month
          </span>
        </div>
      </div>

      {/* The delta, signed. Green is earned here rather than assumed. */}
      <div className="pointer-events-none relative z-10 flex items-center gap-1.5 px-6 pt-3">
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

      <div
        className="h-[210px] w-full px-3 pt-4 pb-2"
        role="img"
        aria-label="Estimated subscription value over twelve months"
      >
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
                fill: 'var(--chrome-fg-muted)',
                fontSize: 'var(--type-micro)',
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
                      className="rounded-panel border px-3.5 py-2.5"
                      style={{
                        background: 'var(--chrome-bg)',
                        borderColor: 'var(--chrome-rule-strong)',
                        boxShadow: 'var(--shadow-sm)',
                      }}
                    >
                      <div
                        className="t-eyebrow mb-1.5 uppercase"
                        style={{
                          color: 'var(--chrome-fg-muted)',
                          fontSize: 'var(--type-badge)',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {(data.payload as { day?: string })?.day}
                      </div>
                      <div
                        className="flex items-center gap-2 font-mono"
                        style={{
                          color: 'var(--invert-card-fg)',
                          fontSize: 'var(--type-compact)',
                          fontWeight: 500,
                        }}
                      >
                        <span className="size-1.5 rounded-full bg-[var(--invert-card-fg)] opacity-80 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                        {new Intl.NumberFormat('en-GB').format((data.value as number) || 0)}{' '}
                        <span style={{ color: 'var(--chrome-fg-muted)' }}>{currency}</span>
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
