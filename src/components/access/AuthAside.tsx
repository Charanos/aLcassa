'use client';

import { useEffect, useState } from 'react';
import {
  IconBolt,
  IconCheck,
  IconClock,
  IconDatabase,
  IconFingerprint,
  IconLock,
  IconShieldCheck,
  IconTerminal,
  IconUsers,
} from '@tabler/icons-react';

function useAmbientTicker(periodMs: number, steps: number): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || steps <= 1) {
      setIndex(steps - 1);
      return;
    }

    const id = setInterval(() => setIndex((current) => (current + 1) % steps), periodMs);
    return () => clearInterval(id);
  }, [periodMs, steps]);

  return index;
}

/* ── Live Security & Tenancy Telemetry ──────────────────────────────────── */

const TELEMETRY_STATION = [
  {
    layer: 'Session Handshake',
    protocol: 'Argon2id + TLS 1.3',
    status: 'Authenticating',
    code: 'SEC_AUTH_INITIALIZED',
  },
  {
    layer: 'Tenant Gate',
    protocol: 'Postgres RLS Enclave',
    status: 'Isolated Enclave Active',
    code: 'RLS_TENANT_VERIFIED',
  },
  {
    layer: 'Message Bus',
    protocol: 'WebSocket End-to-End',
    status: 'Encrypted Stream Online',
    code: 'STREAM_BUS_READY',
  },
] as const;

function AccessTelemetryCard() {
  const activeIdx = useAmbientTicker(3000, TELEMETRY_STATION.length);
  const active = TELEMETRY_STATION[activeIdx] ?? TELEMETRY_STATION[0];

  return (
    <div
      className="rounded-panel border p-5 transition-all duration-300 shadow-sm"
      style={{
        background: 'var(--surface-raised)',
        borderColor: 'var(--border-strong)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IconFingerprint size={16} stroke={1.5} className="text-amber-600 dark:text-amber-400" />
          <span className="t-eyebrow font-medium tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            SESSION ENCLAVE
          </span>
        </div>
        <span
          className="t-chip inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-medium"
        >
          <span
            className="size-1.5 rounded-full animate-pulse"
            style={{ background: 'var(--success-fg)' }}
          />
          Protected
        </span>
      </div>

      <div
        className="rounded-chip border p-3.5"
        style={{
          background: 'var(--surface-sunken)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="t-label font-medium" style={{ color: 'var(--text-primary)' }}>
            {active.layer}
          </span>
          <span className="t-micro font-mono" style={{ color: 'var(--text-tertiary)' }}>
            {active.protocol}
          </span>
        </div>
        <div
          className="mt-2.5 flex items-center justify-between gap-2 border-t pt-2"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-1.5">
            <IconCheck size={13} stroke={2.5} className="text-emerald-600 dark:text-emerald-400" />
            <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
              {active.status}
            </span>
          </div>
          <code className="t-code text-[10px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
            {active.code}
          </code>
        </div>
      </div>

      {/* Security Checkpoints */}
      <div
        className="mt-4 grid grid-cols-3 gap-2 border-t pt-3.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <span className="t-eyebrow block" style={{ color: 'var(--text-tertiary)' }}>
            ISOLATION
          </span>
          <span
            className="t-data text-xs font-semibold mt-0.5 block"
            style={{ color: 'var(--text-primary)' }}
          >
            ROW-LEVEL
          </span>
        </div>
        <div>
          <span className="t-eyebrow block" style={{ color: 'var(--text-tertiary)' }}>
            KEYS
          </span>
          <span className="t-data text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5 block font-mono">
            ARGON2ID
          </span>
        </div>
        <div>
          <span className="t-eyebrow block" style={{ color: 'var(--text-tertiary)' }}>
            AUDIT
          </span>
          <span className="t-data text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 block font-mono">
            APPEND-ONLY
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Tenant Security Highlights ─────────────────────────────────────────── */

const TENANT_SECURITY_SPECS = [
  {
    icon: IconDatabase,
    title: 'Postgres Tenant Partitioning',
    desc: 'Each workspace is completely segregated at the database layer with zero shared memory states.',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-200/60 dark:border-emerald-500/30',
  },
  {
    icon: IconLock,
    title: 'Irreversible Hash Encryption',
    desc: 'Credentials and auth tokens are hashed mathematically and cannot be retrieved even by operators.',
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-500/15 border-amber-200/60 dark:border-amber-500/30',
  },
] as const;

function SecuritySpecsCard() {
  return (
    <div
      className="rounded-panel border p-5 shadow-sm"
      style={{
        background: 'var(--surface-raised)',
        borderColor: 'var(--border-strong)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <IconShieldCheck size={16} stroke={1.5} className="text-emerald-600 dark:text-emerald-400" />
          <span className="t-eyebrow font-medium tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            SECURITY GUARANTEES
          </span>
        </div>
        <span className="t-chip font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
          SPEC 08
        </span>
      </div>

      <div className="space-y-3">
        {TENANT_SECURITY_SPECS.map((spec) => {
          const Icon = spec.icon;
          return (
            <div
              key={spec.title}
              className="flex items-start gap-3 rounded-chip border p-3"
              style={{
                background: 'var(--surface-sunken)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div
                className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-chip border ${spec.bgClass}`}
              >
                <Icon size={14} stroke={1.75} className={spec.colorClass} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="t-label font-medium" style={{ color: 'var(--text-primary)' }}>
                  {spec.title}
                </p>
                <p className="t-caption mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {spec.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Tenant Aside ───────────────────────────────────────────────────────── */

export function TenantAside() {
  return (
    <div className="space-y-5">
      <AccessTelemetryCard />
      <SecuritySpecsCard />
    </div>
  );
}

/* ── Platform Aside ─────────────────────────────────────────────────────── */

const PLATFORM_STATS = [
  { label: 'Workspaces', value: 'Isolated', icon: IconBolt, color: 'text-amber-500' },
  { label: 'Rules Engine', value: 'Active', icon: IconTerminal, color: 'text-blue-500' },
  { label: 'Audit Trail', value: 'Append-only', icon: IconClock, color: 'text-emerald-500' },
  { label: 'Security Gate', value: 'Enforced', icon: IconShieldCheck, color: 'text-rose-500' },
] as const;

export function PlatformAside() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2.5">
        {PLATFORM_STATS.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-panel border p-3.5"
            style={{
              background: 'var(--surface-raised)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <Icon size={14} stroke={1.75} aria-hidden className={color} />
              <span className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                {label}
              </span>
            </div>
            <span
              className="t-data mt-1.5 block font-semibold text-xs"
              style={{ color: 'var(--text-primary)' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      <div
        className="rounded-panel border p-4 shadow-sm"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconUsers size={16} stroke={1.75} aria-hidden className="text-amber-500" />
            <span className="t-compact font-medium" style={{ color: 'var(--text-primary)' }}>
              Support Sessions Logged
            </span>
          </div>
          <span
            className="t-chip rounded-chip px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-medium"
          >
            Audited
          </span>
        </div>
        <p className="t-caption mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Stepping into a workspace generates a permanent entry in that tenant&apos;s activity log.
        </p>
      </div>
    </div>
  );
}
