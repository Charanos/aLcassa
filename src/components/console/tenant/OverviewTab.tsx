'use client';

import React from 'react';
import Link from 'next/link';
import {
  IconDatabase,
  IconKey,
  IconMail,
  IconShieldCheck,
  IconUsers,
  IconCpu,
  IconAlertTriangle,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { Panel } from '@/components/console/Surface';
import type { Meter, WorkspaceDetail } from '@/lib/console/data';

const METER_ICON: Record<Meter['icon'], TablerIcon> = {
  seat: IconUsers,
  bolt: IconCpu,
  mail: IconMail,
  db: IconDatabase,
  key: IconKey,
};

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
}

export function OverviewTab({ w }: { w: WorkspaceDetail }) {
  const seatsMeter = w.meters.find((m) => m.icon === 'seat');
  const eventsMeter = w.meters.find((m) => m.icon === 'bolt');

  return (
    <div className="flex flex-col gap-6">
      {/* ── Inverted Command Ribbon for Overview ─────────────────────────── */}
      <div
        className="flex flex-col overflow-hidden rounded-2xl sm:flex-row"
        style={{
          background: 'var(--invert-card-bg)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
          border: '1px solid var(--invert-card-border)',
        }}
      >
        {/* Metric 1: Plan & Run Rate */}
        <div className="relative flex-1 p-5 sm:p-6 sm:pr-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Subscription Tier
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {w.plan || 'Trial'}
            </span>
            <span
              className="font-mono text-xs font-medium"
              style={{ color: 'var(--invert-card-subtle)' }}
            >
              {w.monthlyValue.split(' /')[0]}
            </span>
          </div>
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

        {/* Metric 2: Seats Allocation */}
        <div className="relative flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Staff Seats
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {seatsMeter ? seatsMeter.used : w.team.staff}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              / {seatsMeter ? seatsMeter.limit : '—'} limit
            </span>
          </div>
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

        {/* Metric 3: Monthly Ingestion */}
        <div className="relative flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Events MTD
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {eventsMeter ? fmtNum(eventsMeter.used) : '0'}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              / {eventsMeter ? fmtNum(eventsMeter.limit) : '—'}
            </span>
          </div>
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

        {/* Metric 4: Health & Isolation */}
        <div className="relative flex-1 p-5 sm:p-6 sm:pl-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Topology & RLS
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className="inline-flex size-2 rounded-full"
              style={{ background: 'var(--success-fg)' }}
            />
            <span
              className="font-mono text-base font-medium sm:text-lg"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              Isolated Schema
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--invert-card-subtle)' }}>
            {w.residency.split(' · ')[0] ?? 'af-south-1'}
          </p>
        </div>
      </div>

      {/* ── Active Alert Banner (If Applicable) ───────────────────────── */}
      {w.alert && (
        <div
          className="flex flex-col items-start justify-between gap-4 rounded-xl p-5 sm:flex-row"
          style={{
            border: `1px solid ${w.status === 'past due' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
            background:
              w.status === 'past due' ? 'rgba(239, 68, 68, 0.05)' : 'rgba(245, 158, 11, 0.05)',
          }}
        >
          <div className="flex items-start gap-3.5">
            <span
              className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg"
              style={{
                background:
                  w.status === 'past due' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                color: w.status === 'past due' ? 'var(--danger-fg)' : 'var(--warning-fg)',
              }}
              aria-hidden
            >
              <IconAlertTriangle size={18} stroke={1.5} />
            </span>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {w.alert.title}
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: 'var(--text-secondary)', maxWidth: '64ch' }}
              >
                {w.alert.body}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:self-center">
            {w.status === 'past due' && (
              <button
                type="button"
                className="h-8.5 rounded-lg px-3.5 text-xs font-medium text-white transition-all active:scale-95"
                style={{ background: 'var(--blue-500)' }}
              >
                Retry Charge
              </button>
            )}
            <Link
              href={`/platform/tenants/${w.slug}?tab=billing`}
              className="inline-flex h-8.5 items-center gap-1 rounded-lg px-3 text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }}
            >
              View Invoices
            </Link>
          </div>
        </div>
      )}

      {/* ── Main 2-Column Content Area ─────────────────────────────────── */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left Column: Entitlements & Capacity */}
        <div className="flex flex-col gap-6">
          <Panel
            title={`Entitlements · ${w.plan || 'Trial'}`}
            action={
              <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Resets in 19 days
              </span>
            }
          >
            <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {w.meters.map((m) => {
                const pct = m.used / m.limit;
                const Icon = METER_ICON[m.icon] ?? IconCpu;
                const color =
                  pct >= 1
                    ? 'var(--danger-fg)'
                    : pct >= 0.9
                      ? 'var(--warning-fg)'
                      : 'var(--blue-500)';

                const usedStr = m.unit ? `${m.used}${m.unit}` : m.used.toLocaleString('en-GB');
                const limitStr = m.unit ? `${m.limit}${m.unit}` : m.limit.toLocaleString('en-GB');

                return (
                  <div key={m.label} className="flex flex-col gap-2 py-3.5 first:pt-1 last:pb-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="rounded-md p-1"
                          style={{ background: 'var(--surface-inset)' }}
                        >
                          <Icon
                            size={15}
                            stroke={1.5}
                            style={{ color: 'var(--text-secondary)' }}
                            aria-hidden
                          />
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {m.label}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span
                          className="font-mono text-xs font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {usedStr}
                        </span>
                        <span
                          className="font-mono text-[11px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          / {limitStr}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium"
                          style={{
                            background: pct >= 0.9 ? 'var(--warning-bg)' : 'var(--surface-inset)',
                            color: color,
                          }}
                        >
                          {Math.round(pct * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Neumorphic recessed meter bar */}
                    <div
                      className="h-2 w-full overflow-hidden rounded-full"
                      style={{ background: 'var(--surface-inset)', boxShadow: 'var(--neu-inset)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, pct * 100)}%`, background: color }}
                      />
                    </div>

                    {/* Sheet 06: every number names its source. */}
                    <p
                      className="mt-1.5 font-mono text-[10px]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      from {m.source}
                    </p>
                  </div>
                );
              })}
            </div>

            <p
              className="mt-4 font-mono text-xs leading-relaxed"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Overrides on this workspace take precedence over the global plan blueprint. Two are
              currently set.
            </p>
          </Panel>
        </div>

        {/* Right Column: Subscription & Governance Specs */}
        <div className="flex flex-col gap-6">
          {/* Subscription Facts */}
          <Panel title="Subscription Details">
            <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {w.facts.map((f) => (
                <div
                  key={f.label}
                  className="flex items-center justify-between gap-3 py-2.5 text-xs"
                >
                  <span style={{ color: 'var(--text-tertiary)' }}>{f.label}</span>
                  <span
                    className="text-right font-mono font-medium"
                    style={{
                      color: f.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)',
                    }}
                  >
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
            <Link
              href="/platform/plans"
              className="mt-4 flex h-8.5 w-full items-center justify-center rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-inset)] active:scale-95"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }}
            >
              Change Tier Plan
            </Link>
          </Panel>

          {/* Primary Owner Card */}
          <Panel title="Primary Administrator">
            <div className="flex items-center gap-3">
              <div
                className="grid size-10 shrink-0 place-items-center rounded-xl text-xs font-medium"
                style={{
                  background: 'var(--surface-inset)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                {w.owner.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-xs font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {w.owner.name}
                </p>
                <p className="truncate font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  {w.owner.email}
                </p>
              </div>
            </div>

            <div
              className="mt-4 grid grid-cols-3 gap-2 divide-x border-t pt-3.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="px-1">
                <span className="t-eyebrow text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                  Staff
                </span>
                <p
                  className="mt-0.5 font-mono text-xs font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {w.team.staff.split(' of ')[0]}
                </p>
              </div>
              <div className="px-2">
                <span className="t-eyebrow text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                  Admins
                </span>
                <p
                  className="mt-0.5 font-mono text-xs font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {w.team.admins}
                </p>
              </div>
              <div className="px-2">
                <span className="t-eyebrow text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                  Channels
                </span>
                <p
                  className="mt-0.5 font-mono text-xs font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {w.team.channels.split(' ')[0]}
                </p>
              </div>
            </div>
          </Panel>

          {/* Data Isolation & Security Seal */}
          <div
            className="flex flex-col gap-2 rounded-xl p-4"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-sunken)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconShieldCheck
                  size={16}
                  stroke={1.5}
                  style={{ color: 'var(--success-fg)' }}
                  aria-hidden
                />
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  RLS Isolation
                </span>
              </div>
              <span
                className="rounded px-2 py-0.5 font-mono text-[10px]"
                style={{
                  background: 'var(--success-bg)',
                  color: 'var(--success-fg)',
                  border: '1px solid var(--success-fg)',
                }}
              >
                Active
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {w.residency}
            </p>
            <p
              className="mt-1 text-[11px] leading-relaxed"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Platform operators have zero visibility into conversation bodies or customer secret
              keys outside an active support session.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
