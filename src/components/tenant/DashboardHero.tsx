'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Badge } from '@/components/feedback/Badge';

export type DashboardHeroProps = {
  planName: string;
  planStatus: string;
  operatorFirstName: string;
  seats: { used: number; limit?: number };
  channels: { used: number; limit?: number };
};

// Mock data for the chart since the backend doesn't provide time-series usage yet
const usageData = [
  { name: 'Mon', usage: 400 },
  { name: 'Tue', usage: 300 },
  { name: 'Wed', usage: 550 },
  { name: 'Thu', usage: 480 },
  { name: 'Fri', usage: 700 },
  { name: 'Sat', usage: 650 },
  { name: 'Sun', usage: 800 },
];

export function DashboardHero({
  planName,
  planStatus,
  operatorFirstName,
  seats,
  channels,
}: DashboardHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Staggered entry animation for elegance
      gsap.fromTo(
        '.gsap-reveal',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out' }
      );
      
      // Chart line draw effect
      gsap.from('.recharts-area-area', {
        scaleY: 0,
        transformOrigin: 'bottom',
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.4
      });
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} className="flex flex-col gap-8">
      {/* Header section */}
      <div className="gsap-reveal flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="t-display text-[var(--text-primary)] tracking-tight">
            Good to see you, {operatorFirstName}.
          </h1>
          <p className="t-lede mt-2 text-[var(--text-secondary)] max-w-2xl">
            Here is your workspace overview. You are currently on the <strong className="text-[var(--text-primary)] font-medium">{planName}</strong> plan.
          </p>
        </div>
        <div className="pb-1">
          <Badge tone="active">{planStatus === 'active' ? 'Active' : planStatus}</Badge>
        </div>
      </div>

      {/* Inverted Chrome Element: Dark metrics well for visual distinction from white chrome */}
      <div 
        className="gsap-reveal overflow-hidden rounded-[var(--radius-lg)] shadow-2xl relative"
        style={{ 
          background: 'var(--invert-card-bg)', 
          color: 'var(--invert-card-fg)',
          border: '1px solid var(--invert-card-border)'
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x border-b"
             style={{ borderColor: 'var(--invert-card-rule)' }}>
          
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <span className="t-eyebrow tracking-widest uppercase opacity-60">Staff Seats</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-mono tracking-tight">{seats.used}</span>
              {seats.limit && <span className="t-body opacity-50 font-mono">/ {seats.limit}</span>}
            </div>
          </div>
          
          <div className="p-6 md:p-8 flex flex-col justify-between">
            <span className="t-eyebrow tracking-widest uppercase opacity-60">Channel Connections</span>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl md:text-5xl font-mono tracking-tight">{channels.used}</span>
              {channels.limit && <span className="t-body opacity-50 font-mono">/ {channels.limit}</span>}
            </div>
          </div>

          <div className="p-6 md:p-8 flex flex-col justify-center relative overflow-hidden group">
            <div className="relative z-10">
              <span className="t-eyebrow tracking-widest uppercase opacity-60 group-hover:opacity-100 transition-opacity">Upgrade Plan</span>
              <p className="t-compact mt-2 opacity-80">Unlock unlimited channels and priority support.</p>
            </div>
            {/* Creative GSAP hover background effect will be handled via standard CSS here for robustness, or GSAP on interaction */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" 
                 style={{ background: 'var(--accent-gradient-bold)' }} />
          </div>
        </div>

        {/* Recharts Usage Area */}
        <div className="p-6 md:p-8 bg-black/20">
          <div className="flex items-center justify-between mb-6">
            <span className="t-panel">Weekly Engagement</span>
            <div className="flex gap-2 items-center">
              <span className="size-2 rounded-full" style={{ background: 'var(--accent-mark)' }} />
              <span className="t-compact opacity-70">Messages Processed</span>
            </div>
          </div>
          
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-mark)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-mark)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'var(--font-mono)' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--invert-card-bg)', 
                    borderColor: 'var(--invert-card-border)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'var(--font-mono)'
                  }}
                  itemStyle={{ color: 'var(--accent-mark-text)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="usage" 
                  stroke="var(--accent-mark)" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorUsage)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
