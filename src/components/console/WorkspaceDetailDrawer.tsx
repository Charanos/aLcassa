'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import {
  IconX,
  IconExternalLink,
  IconCircleX,
  IconAlertTriangle,
  IconUsersGroup,
  IconBolt,
  IconMail,
  IconDatabase,
  IconKey,
  IconPlayerPlay,
  IconCheck,
  IconCopy,
  IconShieldLock,
  IconReceipt,
  IconActivity,
  IconBuilding,
  IconWorld,
  IconRefresh,
  IconFileText,
} from '@tabler/icons-react';
import { fetchWorkspaceDetail, suspendWorkspace } from '@/app/(platform)/platform/(console)/actions';
import type { WorkspaceRow, WorkspaceStatus } from '@/lib/console/data';
import Link from 'next/link';
import { gsapSafe } from '@/lib/motion';
import { DestructiveConfirm } from '@/components/primitives/ConfirmDialog';
import { StartSessionDialog } from './StartSessionDialog';
import { useToast } from '@/components/primitives/Toast';

/* ─ Types ─────────────────────────────────────────────────────────────────── */
type Meter = { label: string; icon: string; used: number; limit: number; unit?: string };
type Invoice = { id: string; issued: string; period: string; amount: string; status: 'paid' | 'failed'; paid: string };
type WorkspaceDetailData = {
  id: string; slug: string; name: string; status: WorkspaceStatus; plan: string;
  monthlyValue: string; since: string; lastActive: string;
  alert: { title: string; body: string } | null;
  meters: Meter[];
  facts: Array<{ label: string; value: string; tone?: 'danger' }>;
  owner: { name: string; email: string; initials: string };
  team: { staff: string; admins: string; channels: string };
  residency: string;
  billingStats: Array<{ label: string; value: string; note: string; tone?: 'danger' }>;
  invoices: Invoice[];
  impact: { staff: number; conversations: number; channels: number };
};

type TabKey = 'overview' | 'telemetry' | 'billing' | 'access';

/* ─ Helpers & Tokens ─────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<WorkspaceStatus, { dot: string; label: string; bg: string; text: string }> = {
  active:     { dot: 'var(--success-fg)',  label: 'Active',     bg: 'rgba(16, 185, 129, 0.08)',  text: 'var(--success-fg)' },
  trial:      { dot: 'var(--blue-400)',    label: 'Trial',      bg: 'rgba(56, 189, 248, 0.08)',  text: 'var(--blue-400)' },
  'past due': { dot: 'var(--danger-fg)',   label: 'Past due',   bg: 'rgba(239, 68, 68, 0.08)',   text: 'var(--danger-fg)' },
  suspended:  { dot: 'var(--ink-400)',     label: 'Suspended',  bg: 'rgba(148, 163, 184, 0.1)',  text: 'var(--text-tertiary)' },
  pending:    { dot: 'var(--warning-fg)', label: 'Pending',    bg: 'rgba(245, 158, 11, 0.08)',  text: 'var(--warning-fg)' },
};

const NEAR_LIMIT = 0.9;
function meterColor(pct: number): string {
  if (pct >= 1) return 'var(--danger-fg)';
  if (pct >= NEAR_LIMIT) return 'var(--warning-fg)';
  return 'var(--blue-500)';
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const METER_ICONS: Record<string, React.ElementType<any>> = {
  seat: IconUsersGroup,
  bolt: IconBolt,
  mail: IconMail,
  db:   IconDatabase,
  key:  IconKey,
};

/* ══════════════════════════════════════════════════════════════════════════
   WorkspaceDetailDrawer (Executive Workspace Detail Modal)
   ══════════════════════════════════════════════════════════════════════════ */
export function WorkspaceDetailDrawer({
  row,
  onClose,
  onStartSession,
}: {
  row: WorkspaceRow;
  onClose: () => void;
  onStartSession: (input: { tenantId: string; tenantName: string; reason: string }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const pushToast = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef  = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [detail, setDetail]       = useState<WorkspaceDetailData | null>(null);
  const [loading, setLoading]     = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  /* Sub-dialog state */
  const [sessionOpen, setSessionOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [suspendPending, startSuspendTransition] = useTransition();

  /* Fetch details via Server Action */
  useEffect(() => {
    let live = true;
    setLoading(true);
    fetchWorkspaceDetail(row.slug)
      .then((data) => {
        if (live && data) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (live) setLoading(false);
      });
    return () => { live = false; };
  }, [row.slug]);

  /* Entrance animations */
  useEffect(() => {
    if (overlayRef.current) {
      gsapSafe.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
    }
    if (dialogRef.current) {
      gsapSafe.fromTo(
        dialogRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.4, ease: 'power3.out', clearProps: 'transform' }
      );
    }
  }, []);

  /* Escape listener */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sessionOpen) { setSessionOpen(false); return; }
        if (suspendOpen) { setSuspendOpen(false); return; }
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function handleClose() {
    if (dialogRef.current && overlayRef.current) {
      gsapSafe.to(dialogRef.current, { x: '100%', duration: 0.3, ease: 'power3.in' });
      gsapSafe.to(overlayRef.current, { opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: onClose });
    } else {
      onClose();
    }
  }

  function handleCopy(text: string, key: string) {
    void navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function submitSuspend(typed: string) {
    setSuspendError(null);
    startSuspendTransition(async () => {
      const result = await suspendWorkspace({ tenantId: row.id, slug: row.slug, confirmSlug: typed });
      if (result.ok) {
        setSuspendOpen(false);
      } else {
        setSuspendError(result.error);
      }
    });
  }

  const st = STATUS_CONFIG[row.status];
  const initials = row.name.split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

  return (
    <>
      {/* ── Backdrop Overlay ───────────────────────────────────────────── */}
      <div
        ref={overlayRef}
        onClick={handleClose}
        className="fixed inset-0"
        style={{
          zIndex: 90,
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
        aria-hidden="true"
      />

      {/* ── Unified Drawer Dialog ─────────────────────────────────────── */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-detail-title"
        className="fixed inset-y-0 right-0 z-[91] surface-glass-strong w-[820px] max-w-full overflow-hidden flex flex-col"
        style={{
          background: 'var(--surface-raised)',
          borderLeft: '1px solid var(--border-strong)',
          boxShadow: '-8px 0 32px -8px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* ── 1 · Header Surface ─────────────────────────────────────── */}
          <div
            className="p-6 sm:p-7 pb-5 relative"
            style={{
              borderBottom: '1px solid var(--border-subtle)',
              background: 'linear-gradient(to bottom, var(--surface-raised), var(--surface-base))',
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close workspace details"
              className="absolute top-5 right-5 grid size-8 place-items-center rounded-lg transition-colors hover:bg-[var(--surface-inset)] active:scale-95"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <IconX size={18} stroke={1.5} />
            </button>

            {/* Top Identity Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-8">
              <div className="flex items-start gap-4">
                {/* 48px Avatar with Live Beacon */}
                <div
                  className="relative flex size-12 shrink-0 items-center justify-center rounded-xl font-medium text-sm"
                  style={{
                    background: 'linear-gradient(135deg, var(--surface-inset), var(--surface-sunken))',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm), inset 0 1px 1px rgba(255,255,255,0.1)',
                  }}
                  aria-hidden="true"
                >
                  {initials}
                  <span
                    className="absolute -top-1 -right-1 size-3 rounded-full border-2"
                    style={{
                      background: st.dot,
                      borderColor: 'var(--surface-raised)',
                      boxShadow: `0 0 6px ${st.dot}`,
                    }}
                  />
                </div>

                {/* Workspace Name & Identifiers */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2
                      id="workspace-detail-title"
                      className="display display-sm tracking-tight leading-snug"
                      style={{ color: 'var(--text-primary)', fontSize: '20px' }}
                    >
                      {row.name}
                    </h2>
                  </div>

                  {/* Copyable slug & ID */}
                  <div className="mt-1.5 flex items-center gap-2 font-mono text-xs flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleCopy(row.slug, 'slug')}
                      title="Click to copy slug"
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[var(--surface-inset)]"
                      style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                    >
                      <span>{row.slug}</span>
                      {copiedKey === 'slug' ? (
                        <IconCheck size={12} stroke={2} style={{ color: 'var(--success-fg)' }} />
                      ) : (
                        <IconCopy size={11} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} />
                      )}
                    </button>

                    <span style={{ color: 'var(--border-strong)' }}>·</span>

                    <button
                      type="button"
                      onClick={() => handleCopy(row.id, 'id')}
                      title="Click to copy tenant ID"
                      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[var(--surface-inset)]"
                      style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}
                    >
                      <span>{row.id}</span>
                      {copiedKey === 'id' ? (
                        <IconCheck size={12} stroke={2} style={{ color: 'var(--success-fg)' }} />
                      ) : (
                        <IconCopy size={11} stroke={1.5} />
                      )}
                    </button>

                    <span style={{ color: 'var(--border-strong)' }}>·</span>
                    <span style={{ color: 'var(--text-tertiary)' }}>Created {row.created}</span>
                  </div>
                </div>
              </div>

              {/* Status & Plan Badges */}
              <div className="flex items-center gap-2 sm:self-start mt-1 sm:mt-0">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                  style={{
                    background: st.bg,
                    border: `1px solid ${st.dot}`,
                    color: st.text,
                  }}
                >
                  <span className="size-1.5 rounded-full" style={{ background: st.dot }} />
                  <span style={{ font: '500 11px/1 var(--font-ui)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                    {st.label}
                  </span>
                </span>

                {row.plan && row.plan !== '—' && (
                  <span
                    className="inline-flex items-center rounded-full px-2.5 py-1 font-mono text-[11px] font-medium uppercase"
                    style={{
                      background: 'var(--surface-inset)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {row.plan}
                  </span>
                )}
              </div>
            </div>

            {/* Header Action Strip */}
            <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSessionOpen(true)}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-lg px-3.5 transition-all duration-150 hover:bg-[var(--surface-inset)] hover:text-[var(--text-action)] active:scale-95"
                  style={{
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-raised)',
                    color: 'var(--text-primary)',
                    font: '500 12px var(--font-ui)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <IconExternalLink size={14} stroke={1.5} aria-hidden />
                  Support session
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSuspendError(null);
                    setSuspendOpen(true);
                  }}
                  className="inline-flex h-8.5 items-center gap-1.5 rounded-lg px-3 transition-all duration-150 active:scale-95"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    background: row.status === 'suspended' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.06)',
                    color: row.status === 'suspended' ? 'var(--success-fg)' : 'var(--danger-fg)',
                    font: '500 12px var(--font-ui)',
                  }}
                >
                  {row.status === 'suspended' ? (
                    <>
                      <IconRefresh size={14} stroke={1.5} aria-hidden />
                      Reactivate
                    </>
                  ) : (
                    <>
                      <IconCircleX size={14} stroke={1.5} aria-hidden />
                      Suspend
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: 'var(--success-fg)', animation: 'pulse-dot 2s ease-in-out infinite' }}
                />
                <span>{row.activity}</span>
              </div>
            </div>

            {/* Segmented Navigation Tabs */}
            <div className="mt-4 flex items-center gap-1 p-1 rounded-xl" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}>
              {[
                { key: 'overview',   label: 'Overview',            icon: IconBuilding },
                { key: 'telemetry',  label: 'Usage & Telemetry',    icon: IconActivity },
                { key: 'billing',    label: 'Billing & Invoices',  icon: IconReceipt },
                { key: 'access',     label: 'Team & Governance',   icon: IconShieldLock },
              ].map(({ key, label, icon: Icon }) => {
                const isActive = activeTab === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key as TabKey)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all duration-150"
                    style={{
                      background: isActive ? 'var(--surface-raised)' : 'transparent',
                      color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                      boxShadow: isActive ? 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                      border: isActive ? '1px solid var(--border-subtle)' : '1px solid transparent',
                    }}
                  >
                    <Icon size={14} stroke={1.5} style={{ opacity: isActive ? 1 : 0.7 }} aria-hidden />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 2 · Tab Content Area (Scrollable) ──────────────────────── */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-7 pt-5" style={{ scrollbarWidth: 'thin' }}>
            {loading ? (
              <div className="flex h-56 flex-col items-center justify-center gap-2">
                <span
                  className="size-5 rounded-full border-2 animate-spin"
                  style={{ borderColor: 'var(--blue-500)', borderTopColor: 'transparent' }}
                />
                <span className="t-compact font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>Resolving tenant telemetry…</span>
              </div>
            ) : detail ? (
              <div className="flex flex-col gap-6">

                {/* Optional Alert Banner */}
                {detail.alert && (
                  <div
                    className="flex gap-3.5 p-4 rounded-xl"
                    style={{
                      background: row.status === 'past due' ? 'rgba(239, 68, 68, 0.06)' : 'rgba(245, 158, 11, 0.06)',
                      border: `1px solid ${row.status === 'past due' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                    }}
                  >
                    <IconAlertTriangle
                      size={18}
                      stroke={1.5}
                      className="shrink-0 mt-0.5"
                      style={{ color: row.status === 'past due' ? 'var(--danger-fg)' : 'var(--warning-fg)' }}
                      aria-hidden
                    />
                    <div>
                      <p className="t-label" style={{ color: 'var(--text-primary)' }}>{detail.alert.title}</p>
                      <p className="t-compact mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{detail.alert.body}</p>
                    </div>
                  </div>
                )}

                {/* ── TAB 1 · OVERVIEW ────────────────────────────────────── */}
                {activeTab === 'overview' && (
                  <div className="flex flex-col gap-6">
                    {/* 4 Summary Metric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: 'Seats in Use', value: `${row.seatsUsed} / ${row.seatsLimit}`, note: `${Math.max(0, row.seatsLimit - row.seatsUsed)} seats free` },
                        { label: 'Monthly Events', value: fmtNum(row.events), note: `${fmtNum(row.eventsLimit)} limit` },
                        { label: 'Monthly Run Rate', value: detail.monthlyValue.split(' /')[0], note: detail.plan || 'Trial tier' },
                        { label: 'Data Residency', value: 'af-south-1', note: 'RLS isolated schema' },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-xl p-3.5 flex flex-col justify-between"
                          style={{
                            background: 'var(--surface-base)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <span className="t-eyebrow text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{item.label}</span>
                          <span className="font-mono text-base font-medium mt-1.5" style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                          <span className="font-mono text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{item.note}</span>
                        </div>
                      ))}
                    </div>

                    {/* Metadata & Facts Grid */}
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                      <div className="px-4 py-3 bg-[var(--surface-sunken)] border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>Workspace Specifications</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                          {detail.facts.slice(0, 3).map((f) => (
                            <div key={f.label} className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--surface-raised)' }}>
                              <span className="t-compact text-xs" style={{ color: 'var(--text-tertiary)' }}>{f.label}</span>
                              <span className="font-mono text-xs font-medium" style={{ color: f.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)' }}>{f.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                          {detail.facts.slice(3).map((f) => (
                            <div key={f.label} className="flex items-center justify-between px-4 py-3" style={{ background: 'var(--surface-raised)' }}>
                              <span className="t-compact text-xs" style={{ color: 'var(--text-tertiary)' }}>{f.label}</span>
                              <span className="font-mono text-xs font-medium" style={{ color: f.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)' }}>{f.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Primary Contact Row */}
                    <div
                      className="flex items-center justify-between p-4 rounded-xl gap-3"
                      style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-lg font-medium text-xs"
                          style={{ background: 'var(--surface-inset)', color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}
                        >
                          {detail.owner.initials}
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{detail.owner.name}</p>
                          <p className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{detail.owner.email}</p>
                        </div>
                      </div>
                      <span className="t-eyebrow text-[10px] px-2 py-0.5 rounded" style={{ background: 'var(--surface-inset)', color: 'var(--text-secondary)' }}>
                        Primary Administrator
                      </span>
                    </div>
                  </div>
                )}

                {/* ── TAB 2 · TELEMETRY & METERS ─────────────────────────── */}
                {activeTab === 'telemetry' && (
                  <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-5">
                      {detail.meters.map((m) => {
                        const Icon = METER_ICONS[m.icon] ?? IconBolt;
                        const pct = m.used / m.limit;
                        const color = meterColor(pct);
                        const usedStr = m.unit ? `${m.used}${m.unit}` : fmtNum(m.used);
                        const limitStr = m.unit ? `${m.limit}${m.unit}` : fmtNum(m.limit);

                        return (
                          <div
                            key={m.label}
                            className="p-4 rounded-xl"
                            style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}
                          >
                            <div className="mb-2.5 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="p-1 rounded-md" style={{ background: 'var(--surface-inset)' }}>
                                  <Icon size={14} stroke={1.5} style={{ color: 'var(--text-secondary)' }} aria-hidden />
                                </div>
                                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{m.label}</span>
                              </div>
                              <div className="flex items-baseline gap-2">
                                <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{usedStr}</span>
                                <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>/ {limitStr}</span>
                                <span
                                  className="rounded px-1.5 py-0.5 font-mono text-[10px] font-medium"
                                  style={{
                                    background: pct >= NEAR_LIMIT ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-inset)',
                                    color: pct >= NEAR_LIMIT ? color : 'var(--text-secondary)',
                                  }}
                                >
                                  {Math.round(pct * 100)}%
                                </span>
                              </div>
                            </div>

                            {/* Meter Bar */}
                            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-inset)' }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, pct * 100)}%`,
                                  background: color,
                                  boxShadow: pct >= NEAR_LIMIT ? `0 0 8px ${color}` : 'none',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <p className="font-mono text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                      Meters update in near real-time across tenant partitions. Ingestion tracks flip to amber alert at 90% of resolved quota.
                    </p>
                  </div>
                )}

                {/* ── TAB 3 · BILLING & INVOICES ─────────────────────────── */}
                {activeTab === 'billing' && (
                  <div className="flex flex-col gap-6">
                    {/* 4 Billing KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {detail.billingStats.map((s) => (
                        <div
                          key={s.label}
                          className="rounded-xl p-3.5 flex flex-col justify-between"
                          style={{
                            background: s.tone === 'danger' ? 'rgba(239, 68, 68, 0.05)' : 'var(--surface-base)',
                            border: `1px solid ${s.tone === 'danger' ? 'rgba(239, 68, 68, 0.25)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          <span className="t-eyebrow text-[10px]" style={{ color: s.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-tertiary)' }}>
                            {s.label}
                          </span>
                          <span className="font-mono text-base font-medium mt-1.5" style={{ color: s.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)' }}>
                            {s.value}
                          </span>
                          <span className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                            {s.note}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Invoice History List */}
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>Recent Invoices</h3>
                        <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>Currency: KES</span>
                      </div>

                      {detail.invoices.length > 0 ? (
                        <div className="overflow-hidden rounded-xl divide-y" style={{ border: '1px solid var(--border-subtle)', borderColor: 'var(--border-subtle)' }}>
                          {detail.invoices.map((inv) => (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between p-3.5 gap-4"
                              style={{
                                background: inv.status === 'failed' ? 'rgba(239, 68, 68, 0.03)' : 'var(--surface-raised)',
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-1.5 rounded-lg" style={{ background: 'var(--surface-inset)' }}>
                                  <IconFileText size={15} stroke={1.5} style={{ color: 'var(--text-secondary)' }} aria-hidden />
                                </div>
                                <div>
                                  <p className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{inv.id}</p>
                                  <p className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{inv.period} · Issued {inv.issued}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                  KES {inv.amount}
                                </span>
                                <span
                                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-medium uppercase"
                                  style={{
                                    background: inv.status === 'paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    color: inv.status === 'paid' ? 'var(--success-fg)' : 'var(--danger-fg)',
                                    border: `1px solid ${inv.status === 'paid' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                  }}
                                >
                                  {inv.status === 'paid' ? <IconCheck size={10} stroke={2.5} /> : <IconAlertTriangle size={10} stroke={2} />}
                                  {inv.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center rounded-xl font-mono text-xs" style={{ background: 'var(--surface-base)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}>
                          No invoice records found under this evaluation tier.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── TAB 4 · TEAM & GOVERNANCE ─────────────────────────── */}
                {activeTab === 'access' && (
                  <div className="flex flex-col gap-6">
                    {/* Team Allocations */}
                    <div className="rounded-xl p-4 flex flex-col gap-4" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                      <h3 className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>Access Topology</h3>
                      <div className="grid grid-cols-3 gap-3 divide-x" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="px-2">
                          <span className="t-eyebrow text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Staff Seats</span>
                          <p className="font-mono text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{detail.team.staff}</p>
                        </div>
                        <div className="px-4">
                          <span className="t-eyebrow text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Privileged Admins</span>
                          <p className="font-mono text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{detail.team.admins} members</p>
                        </div>
                        <div className="px-4">
                          <span className="t-eyebrow text-[10px]" style={{ color: 'var(--text-tertiary)' }}>Active Channels</span>
                          <p className="font-mono text-sm font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{detail.team.channels}</p>
                        </div>
                      </div>
                    </div>

                    {/* Data Residency & Encryption Box */}
                    <div className="rounded-xl p-4 flex items-start gap-3.5" style={{ background: 'var(--surface-base)', border: '1px solid var(--border-subtle)' }}>
                      <div className="p-2 rounded-lg" style={{ background: 'var(--surface-inset)' }}>
                        <IconWorld size={18} stroke={1.5} style={{ color: 'var(--text-primary)' }} aria-hidden />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Data Residency & Encryption</p>
                          <span
                            className="font-mono text-[10px] px-2 py-0.5 rounded"
                            style={{
                              background: 'var(--success-bg)',
                              color: 'var(--success-fg)',
                              border: '1px solid var(--success-fg)',
                            }}
                          >
                            RLS Isolated
                          </span>
                        </div>
                        <p className="font-mono text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{detail.residency}</p>
                        <p className="text-xs mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                          Tenant data is physically segmented with Row-Level Security policies. Platform operators have zero visibility into conversation bodies outside active support sessions.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ) : null}
          </div>

          {/* ── 3 · Footer Actions ─────────────────────────────────────── */}
          <div
            className="px-6 py-3.5 flex items-center justify-between border-t"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--surface-sunken)',
            }}
          >
            <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              aLcassa.tenant · {row.slug}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="h-8.5 px-3.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-inset)] active:scale-95"
                style={{
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-secondary)',
                }}
              >
                Close
              </button>

              <Link
                href={`/platform/tenants/${row.slug}`}
                className="h-8.5 inline-flex items-center gap-1.5 px-4 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-inset)] active:scale-95"
                style={{
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-base)',
                  color: 'var(--text-primary)',
                }}
              >
                View Full Details
              </Link>

              <button
                type="button"
                onClick={() => setSessionOpen(true)}
                className="h-8.5 inline-flex items-center gap-1.5 px-4 rounded-lg text-xs font-medium text-white transition-all active:scale-95"
                style={{
                  background: 'var(--blue-500)',
                  boxShadow: '0 2px 8px rgba(14, 165, 233, 0.25)',
                }}
              >
                <IconPlayerPlay size={13} stroke={1.5} aria-hidden />
                Start Support Session
              </button>
            </div>
          </div>
        </div>

      {/* ── Sub-Dialog: Start Support Session ──────────────────────────── */}
      {sessionOpen && (
        <StartSessionDialog
          workspace={{ id: row.id, name: row.name, slug: row.slug, plan: row.plan, initials }}
          onCancel={() => setSessionOpen(false)}
          onConfirm={async (reason) => {
            const result = await onStartSession({
              tenantId: row.id,
              tenantName: row.name,
              reason,
            });
            if (result.ok) {
              setSessionOpen(false);
              pushToast({
                title: `Support session started in ${row.name}`,
                description: 'Read-only, expires in 30 minutes.',
                tone: 'success',
              });
            }
            return result;
          }}
        />
      )}

      {/* ── Sub-Dialog: Suspend Workspace ──────────────────────────────── */}
      {detail ? (
        <DestructiveConfirm
          open={suspendOpen}
          onOpenChange={(next) => {
            if (!suspendPending) setSuspendOpen(next);
          }}
          title={`Suspend ${row.name}`}
          consequence="Stated in numbers, because a suspension is felt by people who did not choose it."
          details={
            <ul className="grid list-none gap-2.5 border-t p-0 pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
              {[
                [detail.impact.staff, 'staff lose access at their next request. Sessions are not waited out.'],
                [detail.impact.conversations, 'open conversations stop receiving replies. Inbound messages queue but nothing sends.'],
                [detail.impact.channels, 'connected channels go quiet, including the WhatsApp number their customers reply to.'],
              ].map(([n, text]) => (
                <li key={String(text)} className="t-compact flex items-start gap-3" style={{ color: 'var(--ink-primary)' }}>
                  <span className="font-mono shrink-0 text-right font-medium" style={{ color: 'var(--danger-fg)', minWidth: '4ch' }}>
                    {Number(n).toLocaleString('en-GB')}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
              <li className="t-compact mt-1.5" style={{ color: 'var(--ink-secondary)' }}>
                Data is retained. Reactivation restores access immediately and is a single action.
              </li>
            </ul>
          }
          confirmValue={row.slug}
          confirmFieldLabel={`Type "${row.slug}" to confirm`}
          confirmLabel="Suspend workspace"
          loading={suspendPending}
          error={suspendError}
          onConfirm={submitSuspend}
        />
      ) : null}
    </>
  );
}

