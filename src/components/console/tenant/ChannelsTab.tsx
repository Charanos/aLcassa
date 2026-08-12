'use client';

import React from 'react';
import {
  IconBrandWhatsapp,
  IconMail,
  IconMessageCircle,
  IconDeviceMobileMessage,
  IconActivity,
  IconWifi,
  IconWifiOff,
  IconPlus,
  IconRefresh,
} from '@tabler/icons-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import type { WorkspaceChannel } from '@/lib/console/data';

function generateSparklineData(seed: number) {
  return Array.from({ length: 18 }).map((_, i) => ({
    time: i,
    volume: Math.floor(Math.sin((i + seed) / 2.5) * 30) + 40 + ((i * seed * 3) % 15),
  }));
}

export function ChannelsTab({ channels }: { channels: WorkspaceChannel[] }) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return IconBrandWhatsapp;
      case 'email': return IconMail;
      case 'web': return IconMessageCircle;
      case 'sms': return IconDeviceMobileMessage;
      default: return IconActivity;
    }
  };

  const totalMessagesToday = channels.reduce((acc, c) => acc + c.messagesToday, 0);
  const activeCount = channels.filter((c) => c.status === 'healthy').length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Inverted Gateway Status Ribbon ───────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row overflow-hidden rounded-2xl"
        style={{
          background: 'var(--invert-card-bg)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
          border: '1px solid var(--invert-card-border)',
        }}
      >
        {/* Stat 1 */}
        <div className="flex-1 p-5 sm:p-6 sm:pr-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Connected Gateways</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {channels.length}
            </span>
            <span className="text-xs font-mono font-medium" style={{ color: 'var(--success-fg)' }}>
              {activeCount} healthy
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            WhatsApp, Email, Web, SMS
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Stat 2 */}
        <div className="flex-1 p-5 sm:p-6 sm:px-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>24h Ingress Volume</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {totalMessagesToday.toLocaleString('en-GB')}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              messages
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            Throughput ~4.2 msg/sec peak
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Stat 3 */}
        <div className="flex-1 p-5 sm:p-6 sm:px-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Gateway Uptime</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              99.82%
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            Webhook SLA met
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Stat 4 */}
        <div className="flex-1 p-5 sm:p-6 sm:pl-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Delivery Latency</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              142ms
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              p95
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            af-south-1 edge gateway
          </p>
        </div>
      </div>

      {/* ── Channel Cards Grid ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Configured Communication Channels</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Endpoints routing traffic into tenant partitions.</p>
        </div>
        <button
          type="button"
          className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium text-white transition-all active:scale-95"
          style={{ background: 'var(--blue-500)', boxShadow: '0 2px 6px rgba(14, 165, 233, 0.25)' }}
        >
          <IconPlus size={14} stroke={1.5} />
          Connect Channel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {channels.map((ch, idx) => {
          const Icon = getIcon(ch.type);
          const isHealthy = ch.status === 'healthy';
          const isDisconnected = ch.status === 'disconnected';
          const sparklineData = generateSparklineData(idx + 1);

          return (
            <div
              key={ch.id}
              className="rounded-2xl p-5 sm:p-6 flex flex-col justify-between transition-all"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="size-11 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'var(--surface-inset)',
                        border: '1px solid var(--border-strong)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <Icon size={22} stroke={1.5} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium leading-snug" style={{ color: 'var(--text-primary)' }}>
                        {ch.name}
                      </h4>
                      <p className="text-xs font-mono capitalize mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {ch.type} gateway connection
                      </p>
                    </div>
                  </div>

                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-mono font-medium"
                    style={{
                      background: isHealthy ? 'rgba(16, 185, 129, 0.1)' : isDisconnected ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: isHealthy ? 'var(--success-fg)' : isDisconnected ? 'var(--danger-fg)' : 'var(--warning-fg)',
                      border: `1px solid ${isHealthy ? 'rgba(16, 185, 129, 0.25)' : isDisconnected ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                    }}
                  >
                    {isDisconnected ? <IconWifiOff size={11} stroke={2} /> : <IconWifi size={11} stroke={2} />}
                    {ch.status}
                  </span>
                </div>

                {/* Metrics pair */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}
                  >
                    <span className="t-eyebrow text-[9px]" style={{ color: 'var(--text-tertiary)' }}>Messages Today</span>
                    <p className="font-mono text-base font-medium mt-1" style={{ color: 'var(--text-primary)' }}>
                      {ch.messagesToday.toLocaleString('en-GB')}
                    </p>
                  </div>
                  <div
                    className="p-3 rounded-xl"
                    style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}
                  >
                    <span className="t-eyebrow text-[9px]" style={{ color: 'var(--text-tertiary)' }}>Uptime Health</span>
                    <p className="font-mono text-base font-medium mt-1" style={{ color: ch.healthPct < 90 ? 'var(--danger-fg)' : 'var(--text-primary)' }}>
                      {ch.healthPct}%
                    </p>
                  </div>
                </div>

                {/* Sparkline chart */}
                <div
                  className="h-16 relative rounded-xl overflow-hidden p-1"
                  style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}
                >
                  {!isDisconnected ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData}>
                        <defs>
                          <linearGradient id={`grad-${ch.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--blue-500)" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="var(--blue-500)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="volume"
                          stroke="var(--blue-500)"
                          strokeWidth={1.5}
                          fill={`url(#grad-${ch.id})`}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      Channel offline · No live telemetry
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                  Last event: {ch.lastEvent}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-7.5 px-2.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
                    style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-raised)', color: 'var(--text-secondary)' }}
                    title="Ping channel connection"
                  >
                    <IconRefresh size={13} stroke={1.5} />
                  </button>
                  <button
                    type="button"
                    className="h-7.5 px-3 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
                    style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', color: 'var(--text-primary)' }}
                  >
                    Configure
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
