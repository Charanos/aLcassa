'use client';

import React from 'react';
import { ReasonNote } from '@/components/console/Surface';
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
      case 'whatsapp':
        return IconBrandWhatsapp;
      case 'email':
        return IconMail;
      case 'web':
        return IconMessageCircle;
      case 'sms':
        return IconDeviceMobileMessage;
      default:
        return IconActivity;
    }
  };

  const totalMessagesToday = channels.reduce((acc, c) => acc + c.messagesToday, 0);
  const activeCount = channels.filter((c) => c.status === 'healthy').length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Inverted Gateway Status Ribbon ───────────────────────────────── */}
      <div
        className="flex flex-col overflow-hidden rounded-card sm:flex-row"
        style={{
          background: 'var(--invert-card-bg)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
          border: '1px solid var(--invert-card-border)',
        }}
      >
        {/* Stat 1 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:pr-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Connected Gateways
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {channels.length}
            </span>
            <span className="font-mono text-xs font-medium" style={{ color: 'var(--success-fg)' }}>
              {activeCount} healthy
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            WhatsApp, Email, Web, SMS
          </p>
          <div
            className="absolute top-6 right-0 bottom-6 hidden w-px sm:block"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)',
            }}
          />
          <div
            className="absolute right-6 bottom-0 left-6 h-px sm:hidden"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)',
            }}
          />
        </div>

        {/* Stat 2 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            24h Ingress Volume
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {totalMessagesToday.toLocaleString('en-GB')}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              messages
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            Throughput ~4.2 msg/sec peak
          </p>
          <div
            className="absolute top-6 right-0 bottom-6 hidden w-px sm:block"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)',
            }}
          />
          <div
            className="absolute right-6 bottom-0 left-6 h-px sm:hidden"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)',
            }}
          />
        </div>

        {/* Stat 3 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Gateway Uptime
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              99.82%
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            Webhook SLA met
          </p>
          <div
            className="absolute top-6 right-0 bottom-6 hidden w-px sm:block"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)',
            }}
          />
          <div
            className="absolute right-6 bottom-0 left-6 h-px sm:hidden"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)',
            }}
          />
        </div>

        {/* Stat 4 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:pl-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Delivery Latency
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              142ms
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              p95
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            af-south-1 edge gateway
          </p>
        </div>
      </div>

      {/* ── Channel Cards Grid ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Configured Communication Channels
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Endpoints routing traffic into tenant partitions.
          </p>
        </div>
        <button
          type="button"
          disabled
          title="The channel runtime is Phase 2. The adapter contract exists; nothing sits above it yet."
          className="inline-flex h-8 items-center gap-1.5 rounded-overlay px-3 text-xs font-medium text-[var(--text-inverse)] transition-all active:scale-95"
          style={{ opacity: 0.45, cursor: 'not-allowed', background: 'var(--blue-500)' }}
        >
          <IconPlus size={14} stroke={1.5} />
          Connect Channel
        </button>
      </div>

      {/*
        The reason all three controls on this tab are dead, stated once. Connect,
        ping and configure carry it in `title=` as well; this is the copy a
        keyboard or touch reader actually reaches.
      */}
      <ReasonNote>
        Nothing on this tab can act yet. The channel runtime is Phase 2 &mdash; the adapter contract
        is written and nothing sits above it &mdash; so connecting an endpoint and pinging one are
        both waiting on the same work. A workspace&rsquo;s existing channel settings are theirs to
        change; the platform reaches them through a logged support session, not from here.
      </ReasonNote>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {channels.map((ch, idx) => {
          const Icon = getIcon(ch.type);
          const isHealthy = ch.status === 'healthy';
          const isDisconnected = ch.status === 'disconnected';
          const sparklineData = generateSparklineData(idx + 1);

          return (
            <div
              key={ch.id}
              className="flex flex-col justify-between rounded-card p-5 transition-all sm:p-6"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                {/* Header */}
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex size-11 items-center justify-center rounded-overlay"
                      style={{
                        background: 'var(--surface-inset)',
                        border: '1px solid var(--border-strong)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <Icon size={22} stroke={1.5} />
                    </div>
                    <div>
                      <h4
                        className="text-sm leading-snug font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {ch.name}
                      </h4>
                      <p
                        className="mt-0.5 font-mono text-xs capitalize"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {ch.type} gateway connection
                      </p>
                    </div>
                  </div>

                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-2xs font-medium uppercase"
                    style={{
                      background: isHealthy
                        ? 'var(--badge-success-bg)'
                        : isDisconnected
                          ? 'var(--badge-danger-bg)'
                          : 'var(--badge-warning-bg)',
                      color: isHealthy
                        ? 'var(--success-fg)'
                        : isDisconnected
                          ? 'var(--danger-fg)'
                          : 'var(--warning-fg)',
                      border: `1px solid ${isHealthy ? 'var(--badge-success-edge)' : isDisconnected ? 'var(--badge-danger-bg)' : 'var(--badge-warning-edge)'}`,
                    }}
                  >
                    {isDisconnected ? (
                      <IconWifiOff size={11} stroke={2} />
                    ) : (
                      <IconWifi size={11} stroke={2} />
                    )}
                    {ch.status}
                  </span>
                </div>

                {/* Metrics pair */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div
                    className="rounded-overlay p-3"
                    style={{
                      background: 'var(--surface-sunken)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span className="t-eyebrow text-3xs" style={{ color: 'var(--text-tertiary)' }}>
                      Messages Today
                    </span>
                    <p
                      className="mt-1 font-mono text-base font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {ch.messagesToday.toLocaleString('en-GB')}
                    </p>
                  </div>
                  <div
                    className="rounded-overlay p-3"
                    style={{
                      background: 'var(--surface-sunken)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span className="t-eyebrow text-3xs" style={{ color: 'var(--text-tertiary)' }}>
                      Uptime Health
                    </span>
                    <p
                      className="mt-1 font-mono text-base font-medium"
                      style={{
                        color: ch.healthPct < 90 ? 'var(--danger-fg)' : 'var(--text-primary)',
                      }}
                    >
                      {ch.healthPct}%
                    </p>
                  </div>
                </div>

                {/* Sparkline chart */}
                <div
                  className="relative h-16 overflow-hidden rounded-overlay p-1"
                  style={{
                    background: 'var(--surface-sunken)',
                    border: '1px solid var(--border-subtle)',
                  }}
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
                    <div
                      className="absolute inset-0 flex items-center justify-center font-mono text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Channel offline · No live telemetry
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div
                className="mt-5 flex items-center justify-between border-t pt-4"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Last event: {ch.lastEvent}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled
                    title="The channel runtime is Phase 2. There is nothing to ping."
                    className="h-7.5 rounded-overlay px-2.5 text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
                    style={{
                      opacity: 0.45,
                      cursor: 'not-allowed',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--surface-raised)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <IconRefresh size={13} stroke={1.5} />
                  </button>
                  <button
                    type="button"
                    disabled
                    title="A workspace’s channel settings belong to the workspace, reachable through a support session."
                    className="h-7.5 rounded-overlay px-3 text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
                    style={{
                      opacity: 0.45,
                      cursor: 'not-allowed',
                      border: '1px solid var(--border-strong)',
                      background: 'var(--surface-raised)',
                      color: 'var(--text-primary)',
                    }}
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
