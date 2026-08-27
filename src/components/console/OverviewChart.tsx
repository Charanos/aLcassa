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

/**
 * Creative Data Viz for the Overview Dashboard.
 *
 * Instead of a generic 4-stat grid, we use this continuous AreaChart to tell
 * a story about platform activity (e.g., event volume vs revenue throughput)
 * over the last 30 days. It uses inverse chrome for a striking, premium appearance.
 */
export function OverviewChart() {
  const chartId = useId();

  // Generate some realistic-looking organic data
  const data = useMemo(() => {
    const pts = [];
    let base = 120;
    for (let i = 1; i <= 30; i++) {
      base = base + (Math.random() * 40 - 15);
      pts.push({
        day: `Aug ${i}`,
        volume: Math.round(base * 1000),
      });
    }
    return pts;
  }, []);

  return (
    <div className="relative h-full min-h-[260px] w-full overflow-hidden">
      {/* Subtle interior glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-5"
        style={{
          background: 'radial-gradient(circle at 70% 30%, var(--invert-card-fg), transparent 60%)',
        }}
      />

      {/* t-eyebrow: mono, uppercase, 11px — the standard label class */}
      <div className="absolute top-5 left-5 z-10">
        <p
          className="t-eyebrow mb-2"
          style={{
            color: 'var(--invert-card-fg)',
            opacity: 0.55,
            letterSpacing: 'var(--t-eyebrow-tracking)',
          }}
        >
          PLATFORM THROUGHPUT
        </p>
        <div className="flex items-baseline gap-3">
          {/* numeric: mono tabular figures */}
          <div
            className="numeric"
            style={{
              fontSize: 'var(--text-2xl)',
              color: 'var(--invert-card-fg)',
              lineHeight: 1.15,
            }}
          >
            3.42M
          </div>
          <div
            className="t-caption"
            style={{
              color: 'var(--success-fg)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--success-fg)',
              }}
            />
            +12.4% vs last month
          </div>
        </div>
      </div>

      <div className="absolute inset-0 px-3 pt-20 pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${chartId}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--invert-card-fg)" stopOpacity={0.22} />
                <stop offset="95%" stopColor="var(--invert-card-fg)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--invert-card-rule)"
              strokeOpacity={0.6}
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--invert-card-fg)', opacity: 0.5, fontSize: 11, fontWeight: 500 }}
              dy={10}
              minTickGap={28}
            />
            <YAxis hide={true} domain={['dataMin - 10000', 'dataMax + 20000']} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  if (!data) return null;
                  return (
                    <div
                      className="rounded-lg border px-3 py-2 shadow-lg backdrop-blur-md"
                      style={{
                        background: 'var(--invert-card-well)',
                        borderColor: 'var(--invert-card-rule)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                      }}
                    >
                      <div
                        className="t-caption mb-1"
                        style={{ color: 'var(--invert-card-subtle)' }}
                      >
                        {(data.payload as { day?: string })?.day}
                      </div>
                      <div
                        className="font-mono font-medium"
                        style={{ color: 'var(--invert-card-fg)' }}
                      >
                        {new Intl.NumberFormat('en-US').format((data.value as number) || 0)} reqs
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
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#gradient-${chartId})`}
              activeDot={{
                r: 5,
                fill: 'var(--invert-card-bg)',
                stroke: 'var(--invert-card-fg)',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
