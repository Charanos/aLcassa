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
import { Badge } from '@/components/primitives/Badge';

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

      {/* t-eyebrow: refined typography with premium tracking */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <p
          className="t-eyebrow mb-2.5"
          style={{
            color: 'var(--invert-card-fg)',
            opacity: 0.6,
            letterSpacing: '0.08em',
          }}
        >
          PLATFORM THROUGHPUT
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
            3.42M
          </div>
        </div>
      </div>

      <div className="absolute top-6 right-6 z-10 pointer-events-none">
        <Badge intent="success" indicator={false} crisp={false}>
          +12.4% vs last month
        </Badge>
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
            <CartesianGrid
              strokeDasharray="4 6"
              vertical={false}
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--invert-card-fg)', opacity: 0.4, fontSize: 10, fontWeight: 500, letterSpacing: '0.02em' }}
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
                      className="rounded-xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-xl"
                      style={{
                        background: 'rgba(15, 23, 42, 0.75)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.08)',
                      }}
                    >
                      <div
                        className="t-eyebrow mb-1.5 uppercase"
                        style={{ color: 'var(--invert-card-fg)', opacity: 0.6, fontSize: '9px', letterSpacing: '0.06em' }}
                      >
                        {(data.payload as { day?: string })?.day}
                      </div>
                      <div
                        className="flex items-center gap-2 font-mono"
                        style={{ color: 'var(--invert-card-fg)', fontSize: '13px', fontWeight: 500 }}
                      >
                        <span className="size-1.5 rounded-full bg-[var(--invert-card-fg)] opacity-80 shadow-[0_0_8px_rgba(255,255,255,0.5)]" />
                        {new Intl.NumberFormat('en-US').format((data.value as number) || 0)} <span className="opacity-50">reqs</span>
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
