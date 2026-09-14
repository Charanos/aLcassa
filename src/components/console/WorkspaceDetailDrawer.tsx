'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import {
  IconX,
  IconExternalLink,
  IconCircleX,
  IconAlertTriangle,
  IconUsersGroup,
  IconCpu,
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
import {
  fetchWorkspaceDetail,
  suspendWorkspace,
} from '@/app/(platform)/platform/(console)/actions';
import type { WorkspaceDetail, WorkspaceRow, WorkspaceStatus } from '@/lib/console/data';
import Link from 'next/link';
import { gsapSafe } from '@/lib/motion';
import { DestructiveConfirm } from '@/components/primitives/ConfirmDialog';
import { StartSessionDialog } from './StartSessionDialog';
import { ProfileCardDialog } from './ProfileCardDialog';
import { useToast } from '@/components/primitives/Toast';

/* ─ Types ─────────────────────────────────────────────────────────────────── */

/**
 * ⚠ THE REAL TYPE, NOT A COPY OF IT.
 *
 * This file used to hand-redeclare `Meter`, `Invoice` and the whole detail
 * shape locally, structurally matching what `fetchWorkspaceDetail` returns.
 * That compiles — right up until the server type gains a field, at which point
 * the copy silently keeps compiling while rendering a workspace without it.
 * Adding sheet 06's `source` to `Meter` is exactly that: the field landed in
 * `data.ts` and this component could not see it.
 *
 * `WorkspaceDetail` is the type the action actually returns. There is no
 * second definition of it any more.
 */
type WorkspaceDetailData = WorkspaceDetail;

type TabKey = 'overview' | 'telemetry' | 'billing' | 'access';

/* ─ Helpers & Tokens ─────────────────────────────────────────────────────── */
const STATUS_CONFIG: Record<
  WorkspaceStatus,
  { dot: string; label: string; bg: string; text: string }
> = {
  active: {
    dot: 'var(--success-fg)',
    label: 'Active',
    bg: 'rgba(16, 185, 129, 0.08)',
    text: 'var(--success-fg)',
  },
  trial: {
    dot: 'var(--blue-400)',
    label: 'Trial',
    bg: 'rgba(56, 189, 248, 0.08)',
    text: 'var(--blue-400)',
  },
  'past due': {
    dot: 'var(--danger-fg)',
    label: 'Past due',
    bg: 'rgba(239, 68, 68, 0.08)',
    text: 'var(--danger-fg)',
  },
  suspended: {
    dot: 'var(--ink-400)',
    label: 'Suspended',
    bg: 'rgba(148, 163, 184, 0.1)',
    text: 'var(--text-tertiary)',
  },
  pending: {
    dot: 'var(--warning-fg)',
    label: 'Pending',
    bg: 'rgba(245, 158, 11, 0.08)',
    text: 'var(--warning-fg)',
  },
};

const NEAR_LIMIT = 0.9;
/** Sheet 04 · 06: verdigris within the limit, ochre at the ceiling. A ceiling
 *  is not a failure, so no entitlement meter in this console renders red. */
function meterColor(pct: number): string {
  if (pct >= NEAR_LIMIT) return 'var(--warning-fg)';
  return 'var(--success-fg)';
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${n}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const METER_ICONS: Record<string, React.ElementType<any>> = {
  seat: IconUsersGroup,
  bolt: IconCpu,
  mail: IconMail,
  db: IconDatabase,
  key: IconKey,
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
  onStartSession: (input: {
    tenantId: string;
    tenantName: string;
    reason: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const pushToast = useToast();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [detail, setDetail] = useState<WorkspaceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  /* Sub-dialog state */
  const [sessionOpen, setSessionOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
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
    return () => {
      live = false;
    };
  }, [row.slug]);

  /* Entrance animations */
  useEffect(() => {
    if (overlayRef.current) {
      gsapSafe.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out' },
      );
    }
    if (dialogRef.current) {
      gsapSafe.fromTo(
        dialogRef.current,
        { x: '100%' },
        { x: '0%', duration: 0.4, ease: 'power3.out', clearProps: 'transform' },
      );
    }
  }, []);

  /* Escape listener */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (sessionOpen) {
          setSessionOpen(false);
          return;
        }
        if (suspendOpen) {
          setSuspendOpen(false);
          return;
        }
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function handleClose() {
    if (dialogRef.current && overlayRef.current) {
      gsapSafe.to(dialogRef.current, { x: '100%', duration: 0.3, ease: 'power3.in' });
      gsapSafe.to(overlayRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onClose,
      });
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
      const result = await suspendWorkspace({
        tenantId: row.id,
        slug: row.slug,
        confirmSlug: typed,
        reason: suspendReason,
      });
      if (result.ok) {
        setSuspendOpen(false);
        setSuspendReason('');
      } else {
        setSuspendError(result.error);
      }
    });
  }

  const st = STATUS_CONFIG[row.status];
  const initials = row.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

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
        className="surface-glass-strong fixed inset-y-0 right-0 z-[91] flex w-[820px] max-w-full flex-col overflow-hidden"
        style={{
          background: 'var(--surface-raised)',
          borderLeft: '1px solid var(--border-strong)',
          boxShadow: '-8px 0 32px -8px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* ── 1 · Header Surface ─────────────────────────────────────── */}
        <div
          className="relative py-6 px-3 pb-5 sm:p-7"
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
            className="absolute top-4 right-5 grid size-8 place-items-center rounded-lg transition-colors hover:bg-[var(--surface-inset)] active:scale-95"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <IconX size={18} stroke={1.5} />
          </button>

          {/* Top Identity Row */}
          <div className="flex flex-col justify-between gap-4 pr-4 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              {/* 48px Avatar with Live Beacon */}
              <div
                className="relative flex size-14 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-transform duration-300 hover:scale-105"
                style={{
                  background: 'var(--surface-raised)',
                  boxShadow: 'inset 0 0 0 1px var(--border-subtle), 0 1px 2px rgba(0,0,0,0.02)',
                  color: 'var(--text-primary)',
                  font: '600 16px var(--font-ui)',
                }}
                aria-hidden="true"
              >
                {initials}
                <span
                  className="absolute top-0 -right-0.5 size-3.5 rounded-full border-2"
                  style={{ background: st.dot, borderColor: 'var(--surface-base)' }}
                />
              </div>

              {/* Workspace Name & Identifiers */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2
                    id="workspace-detail-title"
                    className="display display-sm leading-snug tracking-tight"
                    style={{ color: 'var(--text-primary)', fontSize: '20px' }}
                  >
                    {row.name}
                  </h2>
                </div>

                {/* Copyable slug & ID */}
                <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopy(row.slug, 'slug')}
                    title="Click to copy slug"
                    className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 transition-colors hover:bg-[var(--surface-inset)]"
                    style={{
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)',
                    }}
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
                    style={{
                      color: 'var(--text-tertiary)',
                      border: '1px solid var(--border-subtle)',
                    }}
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
            <div className="mt-1 flex items-center gap-2 sm:mt-0 sm:self-start">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
                style={{
                  background: st.bg,
                  border: `1px solid ${st.dot}`,
                  color: st.text,
                }}
              >
                <span className="size-1.5 rounded-full" style={{ background: st.dot }} />
                <span
                  style={{
                    font: '500 11px/1 var(--font-ui)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
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

          {/*
              ⚠ HEADER ACTION STRIP · SUSPEND IS DELIBERATELY FURTHEST FROM
              SUPPORT SESSION.

              Sheet 06: "Switch in is the primary. On a tenant record the
              likeliest next action is to look inside it. Suspend sits furthest
              from it and is secondary, so the destructive action is never
              under the cursor."

              These two used to sit side by side in the same left-hand group,
              8px apart — the exact adjacency that sentence rules out, with
              the destructive one landing where the hand already is after
              clicking the likely one. Suspend now sits at the opposite edge,
              past the activity read-out.
            */}
          <div
            className="mt-5 flex items-center justify-between gap-3 border-t pt-4"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              type="button"
              onClick={() => setSessionOpen(true)}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg px-3.5 transition-all duration-150 hover:bg-[var(--surface-inset)] hover:text-[var(--text-action)] active:scale-95"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
                font: '500 12px var(--font-ui)',
              }}
            >
              <IconExternalLink size={14} stroke={1.5} aria-hidden />
              Support session
            </button>

            <div className="flex items-center gap-4">
              <div
                className="flex items-center gap-2 font-mono text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    background: 'var(--success-fg)',
                    animation: 'pulse-dot 2s ease-in-out infinite',
                  }}
                />
                <span>{row.activity}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSuspendError(null);
                  setSuspendOpen(true);
                }}
                className="inline-flex h-8.5 items-center gap-1.5 rounded-lg px-3 transition-all duration-150 active:scale-95"
                style={{
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-raised)',
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
          </div>

          {/* Segmented Navigation Tabs */}
          <div
            className="mt-6 flex items-center gap-1 rounded-2xl p-1.5"
            style={{
              background: 'var(--surface-sunken)',
              boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.02), inset 0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            {[
              { key: 'overview', label: 'Overview', icon: IconBuilding },
              { key: 'telemetry', label: 'Usage & Telemetry', icon: IconActivity },
              { key: 'billing', label: 'Billing & Invoices', icon: IconReceipt },
              { key: 'access', label: 'Team & Governance', icon: IconShieldLock },
            ].map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key as TabKey)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150"
                  style={{
                    background: isActive ? 'var(--surface-base)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    boxShadow: isActive
                      ? '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)'
                      : 'none',
                  }}
                >
                  <Icon
                    size={14}
                    stroke={1.5}
                    style={{ opacity: isActive ? 1 : 0.7 }}
                    aria-hidden
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2 · Tab Content Area (Scrollable) ──────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 pt-5 sm:p-7" style={{ scrollbarWidth: 'thin' }}>
          {loading ? (
            <div className="flex h-56 flex-col items-center justify-center gap-2">
              <span
                className="size-5 animate-spin rounded-full border-2"
                style={{ borderColor: 'var(--blue-500)', borderTopColor: 'transparent' }}
              />
              <span
                className="t-compact font-mono text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Resolving tenant telemetry…
              </span>
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-6">
              {/* Optional Alert Banner */}
              {detail.alert && (
                <div
                  className="flex gap-3.5 rounded-xl p-4"
                  style={{
                    background:
                      row.status === 'past due'
                        ? 'rgba(239, 68, 68, 0.06)'
                        : 'rgba(245, 158, 11, 0.06)',
                    border: `1px solid ${row.status === 'past due' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                  }}
                >
                  <IconAlertTriangle
                    size={18}
                    stroke={1.5}
                    className="mt-0.5 shrink-0"
                    style={{
                      color: row.status === 'past due' ? 'var(--danger-fg)' : 'var(--warning-fg)',
                    }}
                    aria-hidden
                  />
                  <div>
                    <p className="t-label" style={{ color: 'var(--text-primary)' }}>
                      {detail.alert.title}
                    </p>
                    <p
                      className="t-compact mt-0.5 text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {detail.alert.body}
                    </p>
                  </div>
                </div>
              )}

              {/* ── TAB 1 · OVERVIEW ────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <div className="flex flex-col gap-6">
                  {/* 4 Summary Metric Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      {
                        label: 'Seats in Use',
                        value: `${row.seatsUsed} / ${row.seatsLimit}`,
                        note: `${Math.max(0, row.seatsLimit - row.seatsUsed)} seats free`,
                      },
                      {
                        label: 'Monthly Events',
                        value: fmtNum(row.events),
                        note: `${fmtNum(row.eventsLimit)} limit`,
                      },
                      {
                        label: 'Monthly Run Rate',
                        value: detail.monthlyValue.split(' /')[0],
                        note: detail.plan || 'Trial tier',
                      },
                      { label: 'Data Residency', value: 'af-south-1', note: 'RLS isolated schema' },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex flex-col justify-between rounded-2xl p-4 transition-all duration-300 hover:-translate-y-px"
                        style={{
                          background: 'var(--surface-raised)',
                          border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
                        }}
                      >
                        <span
                          className="text-[10px] font-medium tracking-[0.1em] uppercase"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {item.label}
                        </span>
                        <span
                          className="mt-2 font-mono text-lg font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {item.value}
                        </span>
                        <span
                          className="mt-1 font-mono text-[11px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {item.note}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div
                    className="overflow-hidden rounded-[24px]"
                    style={{
                      background: 'var(--surface-raised)',
                      border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
                    }}
                  >
                    <div
                      className="px-5 py-4"
                      style={{
                        background: 'var(--surface-sunken)',
                        boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.02), inset 0 1px 2px rgba(0,0,0,0.02)',
                      }}
                    >
                      <span className="text-[10px] font-medium tracking-[0.1em] uppercase" style={{ color: 'var(--text-tertiary)' }}>
                        Workspace Specifications
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 relative">
                      {/* Very subtle center divider on desktop */}
                      <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[color-mix(in_srgb,var(--border-subtle)_30%,transparent)] sm:block" />
                      
                      <div>
                        {detail.facts.slice(0, 3).map((f) => (
                          <div
                            key={f.label}
                            className="flex items-center justify-between px-5 py-4"
                            style={{
                              borderTop: '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                            }}
                          >
                            <span
                              className="text-[11px] tracking-wide"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {f.label}
                            </span>
                            <span
                              className="font-mono text-[11px] font-medium"
                              style={{
                                color:
                                  f.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)',
                              }}
                            >
                              {f.value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div>
                        {detail.facts.slice(3).map((f) => (
                          <div
                            key={f.label}
                            className="flex items-center justify-between px-5 py-4"
                            style={{
                              borderTop: '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                            }}
                          >
                            <span
                              className="text-[11px] tracking-wide"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {f.label}
                            </span>
                            <span
                              className="font-mono text-[11px] font-medium"
                              style={{
                                color:
                                  f.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)',
                              }}
                            >
                              {f.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Primary Contact Row */}
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="flex w-full items-center justify-between gap-3 rounded-[24px] p-4 text-left transition-all duration-300 hover:-translate-y-px hover:shadow-sm active:scale-[0.99]"
                    style={{
                      background: 'var(--surface-raised)',
                      border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-medium"
                        style={{
                          background: 'var(--surface-raised)',
                          boxShadow: 'inset 0 0 0 1px var(--border-subtle), 0 1px 2px rgba(0,0,0,0.02)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {detail.owner.initials}
                      </div>
                      <div>
                        <p className="text-sm font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
                          {detail.owner.name}
                        </p>
                        <p
                          className="font-mono text-[11px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {detail.owner.email}
                        </p>
                      </div>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[9px] font-medium tracking-[0.1em] uppercase"
                      style={{ background: 'var(--surface-inset)', color: 'var(--text-tertiary)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)' }}
                    >
                      Primary Administrator
                    </span>
                  </button>
                </div>
              )}

              {/* ── TAB 2 · TELEMETRY & METERS ─────────────────────────── */}
              {activeTab === 'telemetry' && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    {detail.meters.map((m) => {
                      const Icon = METER_ICONS[m.icon] ?? IconCpu;
                      const pct = m.used / m.limit;
                      const color = meterColor(pct);
                      const usedStr = m.unit ? `${m.used}${m.unit}` : fmtNum(m.used);
                      const limitStr = m.unit ? `${m.limit}${m.unit}` : fmtNum(m.limit);

                      return (
                        <div
                          key={m.label}
                          className="rounded-[20px] p-4 transition-all duration-300 hover:-translate-y-px"
                          style={{
                            background: 'var(--surface-raised)',
                            border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
                          }}
                        >
                          <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className="rounded-xl p-2"
                                style={{
                                  background: 'var(--surface-sunken)',
                                  boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.02), inset 0 1px 2px rgba(0,0,0,0.02)',
                                }}
                              >
                                <Icon
                                  size={16}
                                  stroke={1.5}
                                  style={{ color: 'var(--text-secondary)' }}
                                  aria-hidden
                                />
                              </div>
                              <span
                                className="text-sm font-medium tracking-tight"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {m.label}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span
                                className="font-mono text-[13px] font-medium"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {usedStr}
                              </span>
                              <span
                                className="font-mono text-xs"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                / {limitStr}
                              </span>
                              <span
                                className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-medium tracking-wide"
                                style={{
                                  background:
                                    pct >= NEAR_LIMIT
                                      ? 'var(--warning-bg)'
                                      : 'var(--surface-inset)',
                                  color: pct >= NEAR_LIMIT ? color : 'var(--text-secondary)',
                                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                                }}
                              >
                                {Math.round(pct * 100)}%
                              </span>
                            </div>
                          </div>

                          {/* Meter Bar */}
                          <div
                            className="h-2.5 w-full overflow-hidden rounded-full"
                            style={{
                              background: 'var(--surface-sunken)',
                              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                            }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, pct * 100)}%`,
                                background: color,
                                boxShadow: `0 1px 3px ${color}40`,
                              }}
                            />
                          </div>

                          {/* Sheet 06: every number names its source, so a figure
                                on screen can be traced to a row in the schema. */}
                          <p
                            className="mt-2.5 font-mono text-[10px]"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            from {m.source}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <p
                    className="font-mono text-[11px] leading-relaxed"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    Meters resolve against the entitlement snapshot on the workspace, not the plan
                    blueprint — an override wins. A track turns ochre at 90% of its resolved
                    ceiling; a ceiling reached is a conversation about the tier above, not a
                    failure.
                  </p>
                </div>
              )}

              {/* ── TAB 3 · BILLING & INVOICES ─────────────────────────── */}
              {activeTab === 'billing' && (
                <div className="flex flex-col gap-6">
                  {/* 4 Billing KPI Cards */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {detail.billingStats.map((s) => (
                      <div
                        key={s.label}
                        className="flex flex-col justify-between rounded-[20px] p-4 transition-all duration-300 hover:-translate-y-px"
                        style={{
                          background:
                            s.tone === 'danger' ? 'rgba(239, 68, 68, 0.05)' : 'var(--surface-raised)',
                          border: `2px solid ${s.tone === 'danger' ? 'rgba(239, 68, 68, 0.25)' : 'color-mix(in srgb, var(--border-subtle) 30%, transparent)'}`,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
                        }}
                      >
                        <span
                          className="text-[10px] font-medium tracking-[0.1em] uppercase"
                          style={{
                            color:
                              s.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-tertiary)',
                          }}
                        >
                          {s.label}
                        </span>
                        <span
                          className="mt-2 font-mono text-lg font-medium"
                          style={{
                            color: s.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)',
                          }}
                        >
                          {s.value}
                        </span>
                        <span
                          className="mt-1 font-mono text-[11px]"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {s.note}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Invoice History List */}
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                        Recent Invoices
                      </h3>
                      <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        Currency: KES
                      </span>
                    </div>

                    {detail.invoices.length > 0 ? (
                      <div
                        className="overflow-hidden rounded-[24px]"
                        style={{
                          background: 'var(--surface-raised)',
                          border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                          boxShadow: '0 12px 40px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
                        }}
                      >
                        {detail.invoices.map((inv, index) => (
                          <div
                            key={inv.id}
                            className="flex items-center justify-between gap-4 p-4"
                            style={{
                              background:
                                inv.status === 'failed'
                                  ? 'rgba(239, 68, 68, 0.03)'
                                  : 'transparent',
                              borderTop: index > 0 ? '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)' : 'none',
                              boxShadow: index > 0 ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
                            }}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className="rounded-xl p-2"
                                style={{
                                  background: 'var(--surface-sunken)',
                                  boxShadow: 'inset 0 -1px 2px rgba(0,0,0,0.02), inset 0 1px 2px rgba(0,0,0,0.02)',
                                }}
                              >
                                <IconFileText
                                  size={16}
                                  stroke={1.5}
                                  style={{ color: 'var(--text-secondary)' }}
                                  aria-hidden
                                />
                              </div>
                              <div>
                                <p
                                  className="font-mono text-sm font-medium"
                                  style={{ color: 'var(--text-primary)' }}
                                >
                                  {inv.id}
                                </p>
                                <p
                                  className="mt-0.5 font-mono text-[11px]"
                                  style={{ color: 'var(--text-tertiary)' }}
                                >
                                  {inv.period} · Issued {inv.issued}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <span
                                className="font-mono text-sm font-medium"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                KES {inv.amount}
                              </span>
                              <span
                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-medium tracking-wide uppercase"
                                style={{
                                  background:
                                    inv.status === 'paid'
                                      ? 'rgba(16, 185, 129, 0.1)'
                                      : 'rgba(239, 68, 68, 0.1)',
                                  color:
                                    inv.status === 'paid'
                                      ? 'var(--success-fg)'
                                      : 'var(--danger-fg)',
                                  border: `1px solid ${inv.status === 'paid' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                                }}
                              >
                                {inv.status === 'paid' ? (
                                  <IconCheck size={12} stroke={2.5} />
                                ) : (
                                  <IconAlertTriangle size={12} stroke={2} />
                                )}
                                {inv.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className="rounded-xl p-6 text-center font-mono text-xs"
                        style={{
                          background: 'var(--surface-base)',
                          color: 'var(--text-tertiary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
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
                  <div
                    className="flex flex-col gap-6 rounded-[24px] p-6"
                    style={{
                      background: 'var(--surface-raised)',
                      border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
                    }}
                  >
                    <h3 className="text-[10px] font-medium tracking-[0.1em] uppercase" style={{ color: 'var(--text-tertiary)' }}>
                      Access Topology
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 relative">
                      <div className="px-2 pb-4 sm:pb-0">
                        <span
                          className="text-[11px] font-medium tracking-wide"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Staff Seats
                        </span>
                        <p
                          className="mt-2 font-mono text-lg font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {detail.team.staff}
                        </p>
                      </div>
                      <div className="px-2 py-4 sm:py-0 sm:px-6 relative">
                        {/* Desktop vertical engraved separator */}
                        <div className="absolute inset-y-0 left-0 hidden w-px bg-[color-mix(in_srgb,var(--border-subtle)_30%,transparent)] sm:block" />
                        <div className="absolute inset-y-0 left-px hidden w-px bg-[rgba(255,255,255,0.6)] sm:block" />
                        {/* Mobile horizontal engraved separator */}
                        <div className="absolute inset-x-0 top-0 h-px bg-[color-mix(in_srgb,var(--border-subtle)_30%,transparent)] sm:hidden" />
                        <div className="absolute inset-x-0 top-px h-px bg-[rgba(255,255,255,0.6)] sm:hidden" />
                        
                        <span
                          className="text-[11px] font-medium tracking-wide"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Privileged Admins
                        </span>
                        <p
                          className="mt-2 font-mono text-lg font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {detail.team.admins} members
                        </p>
                      </div>
                      <div className="px-2 pt-4 sm:pt-0 sm:px-6 relative">
                        {/* Desktop vertical engraved separator */}
                        <div className="absolute inset-y-0 left-0 hidden w-px bg-[color-mix(in_srgb,var(--border-subtle)_30%,transparent)] sm:block" />
                        <div className="absolute inset-y-0 left-px hidden w-px bg-[rgba(255,255,255,0.6)] sm:block" />
                        {/* Mobile horizontal engraved separator */}
                        <div className="absolute inset-x-0 top-0 h-px bg-[color-mix(in_srgb,var(--border-subtle)_30%,transparent)] sm:hidden" />
                        <div className="absolute inset-x-0 top-px h-px bg-[rgba(255,255,255,0.6)] sm:hidden" />
                        
                        <span
                          className="text-[11px] font-medium tracking-wide"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          Active Channels
                        </span>
                        <p
                          className="mt-2 font-mono text-lg font-medium"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {detail.team.channels}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Data Residency & Encryption Box */}
                  <div
                    className="flex flex-col sm:flex-row sm:items-start gap-4 rounded-[20px] p-4"
                    style={{
                      background: 'var(--surface-raised)',
                      border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
                    }}
                  >
                    <div
                      className="flex size-11 shrink-0 items-center justify-center rounded-full"
                      style={{
                        background: 'var(--surface-raised)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05), inset 0 0 0 1px var(--border-subtle), inset 0 2px 4px rgba(255,255,255,0.8)',
                      }}
                    >
                      <IconWorld
                        size={18}
                        stroke={1.5}
                        style={{ color: 'var(--text-primary)' }}
                        aria-hidden
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
                          Data Residency & Encryption
                        </p>
                        <span
                          className="rounded-full px-2.5 py-1 font-mono text-[9px] font-medium tracking-wide uppercase"
                          style={{
                            background: 'var(--success-bg)',
                            color: 'var(--success-fg)',
                            border: '1px solid var(--success-fg)',
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
                          }}
                        >
                          RLS Isolated
                        </span>
                      </div>
                      <p
                        className="mt-1 font-mono text-xs font-medium"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {detail.residency}
                      </p>
                      <p className="mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                        Tenant data is physically segmented with Row-Level Security policies.
                        Platform operators have zero visibility into conversation bodies outside
                        active support sessions.
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
          className="flex items-center justify-between border-t px-6 py-3.5"
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
              className="h-8.5 rounded-lg px-3.5 text-xs font-medium transition-colors hover:bg-[var(--surface-inset)] active:scale-95"
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
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg px-4 text-xs font-medium transition-colors hover:bg-[var(--surface-inset)] active:scale-95"
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
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg px-4 text-xs font-medium text-white transition-all active:scale-95"
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
            <>
              <ul
                className="grid list-none gap-2.5 border-t p-0 pt-4"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                {[
                  [
                    detail.impact.staff,
                    'staff lose access at their next request. Sessions are not waited out.',
                  ],
                  [
                    detail.impact.conversations,
                    'open conversations stop receiving replies. Inbound messages queue but nothing sends.',
                  ],
                  [
                    detail.impact.channels,
                    'connected channels go quiet, including the WhatsApp number their customers reply to.',
                  ],
                ].map(([n, text]) => (
                  <li
                    key={String(text)}
                    className="t-compact flex items-start gap-3"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span
                      className="shrink-0 text-right font-mono font-medium"
                      style={{ color: 'var(--danger-fg)', minWidth: '4ch' }}
                    >
                      {Number(n).toLocaleString('en-GB')}
                    </span>
                    <span>{text}</span>
                  </li>
                ))}
                <li className="t-compact mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Data is retained. Reactivation restores access immediately and is a single action.
                </li>
              </ul>

              <div
                className="grid gap-1.5 border-t pt-4"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                {/*
                ⚠ REQUIRED, AND THE CUSTOMER READS IT. 09 §7 puts suspension in the
                tenant's own activity log; a customer whose writes start failing with
                no explanation cannot tell a billing decision from an outage. The
                server requires it too, so a direct call cannot skip it.
              */}
                <label
                  htmlFor="drawer-suspend-reason"
                  className="t-label"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Reason · the customer sees this
                </label>
                <textarea
                  id="drawer-suspend-reason"
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  rows={2}
                  placeholder="Payment overdue since 12 August; invoices sent 1 and 8 August."
                  className="rounded-panel border px-3 py-2"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    background: 'var(--surface-raised)',
                    color: 'var(--text-primary)',
                    font: '400 var(--text-sm)/1.5 var(--font-ui)',
                  }}
                />
              </div>
            </>
          }
          confirmValue={row.slug}
          confirmFieldLabel={`Type "${row.slug}" to confirm`}
          confirmLabel="Suspend workspace"
          loading={suspendPending}
          error={suspendError}
          onConfirm={submitSuspend}
        />
      ) : null}

      <ProfileCardDialog
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        owner={detail?.owner ?? { initials: '', name: '', email: '' }}
      />
    </>
  );
}
