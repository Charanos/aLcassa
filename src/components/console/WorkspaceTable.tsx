'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
  IconDotsVertical,
  IconExternalLink,
  IconSearch,
  IconX,
  IconBuildings,
} from '@tabler/icons-react';
import { EmptyState } from '@/components/primitives/EmptyState';
import { StartSessionDialog } from './StartSessionDialog';
import { WorkspaceDetailDrawer } from './WorkspaceDetailDrawer';
import { useToast } from '@/components/primitives/Toast';
import type { ConsoleWorkspace } from './types';
import type { WorkspaceRow, WorkspaceStatus } from '@/lib/console/data';

/**
 * The workspace list. `Workspaces.dc.html`.
 * Expanded, production-grade enterprise telemetry table with mobile card destructuring.
 */

const NEAR_LIMIT = 0.9;

const STATUS_INK: Record<WorkspaceStatus, { dot: string; ink: string }> = {
  active: { dot: 'var(--success-fg)', ink: 'var(--text-primary)' },
  trial: { dot: 'var(--blue-400)', ink: 'var(--text-primary)' },
  'past due': { dot: 'var(--danger-fg)', ink: 'var(--danger-fg)' },
  suspended: { dot: 'var(--ink-400)', ink: 'var(--text-secondary)' },
  pending: { dot: 'var(--warning-fg)', ink: 'var(--text-secondary)' },
};

const STATUSES: WorkspaceStatus[] = ['active', 'trial', 'past due', 'suspended', 'pending'];

const group = (n: number) => n.toLocaleString('en-GB');

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toString();
}

function meterInk(pct: number): string {
  if (pct >= 1) return 'var(--danger-fg)';
  if (pct >= NEAR_LIMIT) return 'var(--warning-fg)';
  return 'var(--blue-400)';
}

/** Initials from the first two words */
function toWorkspace(r: WorkspaceRow): ConsoleWorkspace {
  const initials = r.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return { id: r.id, name: r.name, slug: r.slug, plan: r.plan, initials };
}

function needsAttention(r: WorkspaceRow): boolean {
  return (
    r.status === 'past due' ||
    r.status === 'suspended' ||
    r.events / r.eventsLimit >= NEAR_LIMIT ||
    r.seatsUsed / r.seatsLimit >= NEAR_LIMIT
  );
}

type SortField = 'activity' | 'name' | 'usage' | 'seats' | 'events' | 'created';
type SortDirection = 'asc' | 'desc';

export function WorkspaceTable({
  rows,
  total,
  onStartSession,
}: {
  rows: WorkspaceRow[];
  total: number;
  onStartSession: (input: {
    tenantId: string;
    tenantName: string;
    reason: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const pushToast = useToast();
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState<WorkspaceStatus[]>([]);
  const [attention, setAttention] = useState(false);
  const [sortField, setSortField] = useState<SortField>('activity');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const searchRef = useRef<HTMLInputElement>(null);

  const [pending,    setPending]    = useState<ConsoleWorkspace | null>(null);
  const [drawerRow,  setDrawerRow]  = useState<WorkspaceRow | null>(null);

  const attentionCount = useMemo(() => rows.filter(needsAttention).length, [rows]);

  // Overall workspace stats for the summary ribbon
  const stats = useMemo(() => {
    const totalWorkspaces = rows.length;
    const activeCount = rows.filter((r) => r.status === 'active').length;
    const totalSeats = rows.reduce((acc, r) => acc + r.seatsUsed, 0);
    const totalSeatsLimit = rows.reduce((acc, r) => acc + r.seatsLimit, 0);
    const totalEvents = rows.reduce((acc, r) => acc + r.events, 0);
    return { totalWorkspaces, activeCount, totalSeats, totalSeatsLimit, totalEvents };
  }, [rows]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (q && !(r.name.toLowerCase().includes(q) || r.slug.includes(q) || r.id.toLowerCase().includes(q))) return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (attention && !needsAttention(r)) return false;
      return true;
    });

    return [...out].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'usage' || sortField === 'events') cmp = a.events / a.eventsLimit - b.events / b.eventsLimit;
      else if (sortField === 'seats') cmp = a.seatsUsed / a.seatsLimit - b.seatsUsed / b.seatsLimit;
      else if (sortField === 'created') cmp = a.created.localeCompare(b.created);
      else cmp = a.activity.localeCompare(b.activity);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, query, statuses, attention, sortField, sortDir]);

  useEffect(() => {
    setPage(1);
  }, [query, statuses, attention, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const filtersActive = query.trim() !== '' || statuses.length > 0 || attention;

  function clearFilters() {
    setQuery('');
    setStatuses([]);
    setAttention(false);
  }

  function toggleStatus(s: WorkspaceStatus) {
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  return (
    <>
      {/* ── Summary KPI Ribbon (Inverted Command Panel) ───────────────── */}
      {/* Uses --invert-card-* tokens: dark navy slab in light mode, white in dark mode */}
      <div 
        className="mt-6 flex flex-col sm:flex-row overflow-hidden rounded-2xl"
        style={{
          background: 'var(--invert-card-bg)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
        }}
      >
        {/* Metric 1 */}
        <div className="flex-1 p-5 sm:p-6 sm:pr-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Total Workspaces</div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {stats.totalWorkspaces}
            </span>
            <span className="text-[13px] font-mono font-medium" style={{ color: 'var(--success-fg)' }}>
              {stats.activeCount} active
            </span>
          </div>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Metric 2 */}
        <div className="flex-1 p-5 sm:p-6 sm:px-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Seats Allocated</div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {group(stats.totalSeats)}
            </span>
            <span className="text-[13px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              / {group(stats.totalSeatsLimit)}
            </span>
          </div>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Metric 3 */}
        <div className="flex-1 p-5 sm:p-6 sm:px-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Monthly Events</div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {formatCompactNumber(stats.totalEvents)}
            </span>
            <span className="text-[13px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              ingested
            </span>
          </div>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Metric 4 */}
        <div 
          className="flex-1 p-5 sm:p-6 sm:pl-8 relative transition-colors duration-500"
          style={{
            background: attentionCount > 0 ? 'radial-gradient(circle at top right, rgba(250, 85, 5, 0.08), transparent 75%)' : 'transparent',
          }}
        >
          <div className="t-eyebrow" style={{ color: attentionCount > 0 ? 'var(--accent-mark)' : 'var(--invert-card-subtle)' }}>
            Needs Attention
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="font-mono text-3xl font-medium tracking-tight" style={{ color: attentionCount > 0 ? 'var(--accent-mark)' : 'var(--invert-card-fg)' }}>
              {attentionCount}
            </span>
            <span className="text-[13px] font-mono" style={{ color: attentionCount > 0 ? 'var(--accent-mark)' : 'var(--invert-card-subtle)' }}>
              {attentionCount === 1 ? 'workspace' : 'workspaces'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div
        className="surface-card mt-6 flex flex-wrap items-center gap-3 p-4"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <label
          className="flex h-10 max-w-[400px] xl:max-w-[480px] min-w-0 flex-1 basis-[280px] items-center gap-3 rounded-xl px-3.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-[var(--blue-500)]"
          style={{
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--neu-inset)',
          }}
        >
          <IconSearch
            size={16}
            stroke={1.5}
            className="shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
            aria-hidden
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, slug or ID..."
            aria-label="Search workspaces"
            className="min-w-0 flex-1 border-none bg-transparent outline-none"
            style={{ font: '400 var(--text-sm)/1 var(--font-ui)', color: 'var(--text-primary)' }}
          />
          <kbd style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>/</kbd>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <span className="t-eyebrow mr-1 tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Status
          </span>
          {STATUSES.map((s) => {
            const on = statuses.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                aria-pressed={on}
                className="inline-flex h-8.5 cursor-pointer items-center gap-2 rounded-full px-3.5 transition-all duration-200 hover:-translate-y-px"
                style={{
                  border: `1px solid ${on ? 'var(--blue-500)' : 'var(--border-strong)'}`,
                  background: on ? 'var(--blue-500)' : 'var(--surface-raised)',
                  color: on ? '#ffffff' : 'var(--text-secondary)',
                  font: '500 var(--text-sm)/1 var(--font-ui)',
                  boxShadow: on ? '0 2px 8px rgba(14, 165, 233, 0.25), inset 0 1px 1px rgba(255,255,255,0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <span
                  aria-hidden
                  className="size-[7px] rounded-full"
                  style={{ 
                    background: on ? '#ffffff' : STATUS_INK[s].dot,
                    boxShadow: on ? 'none' : `0 0 4px ${STATUS_INK[s].dot}`
                  }}
                />
                {s}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setAttention((a) => !a)}
          aria-pressed={attention}
          className="inline-flex h-8.5 cursor-pointer items-center gap-2.5 rounded-full py-0 pr-2 pl-3.5 transition-all duration-200 hover:-translate-y-px"
          style={{
            border: `1px solid ${attention ? 'var(--accent-mark)' : 'var(--border-strong)'}`,
            background: attention ? 'var(--accent-mark)' : 'var(--surface-raised)',
            color: attention ? '#ffffff' : 'var(--text-secondary)',
            font: '500 var(--text-sm)/1 var(--font-ui)',
            boxShadow: attention ? '0 2px 8px rgba(251, 146, 60, 0.3), inset 0 1px 1px rgba(255,255,255,0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          Needs attention
          <span
            className="numeric grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-medium shadow-sm transition-colors"
            style={{ 
              background: attention ? '#ffffff' : 'var(--accent-mark)', 
              color: attention ? 'var(--accent-mark)' : '#ffffff', 
              fontSize: 11 
            }}
          >
            {attentionCount}
          </span>
        </button>

        <span className="ml-auto flex items-center gap-4">
          <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
            <span className="numeric font-medium" style={{ color: 'var(--text-primary)' }}>
              {filtered.length}
            </span>{' '}
            of {total}
          </span>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="t-compact inline-flex items-center gap-1 text-[var(--text-action)] hover:underline"
            >
              <IconX size={13} stroke={1.5} />
              Reset
            </button>
          )}
        </span>
      </div>

      {/* ── Results ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="mt-6 rounded-2xl p-12 transition-all duration-300 hover:shadow-lg"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
            boxShadow: '4px 6px 20px rgba(0, 0, 0, 0.04), inset 1px 1px 0px rgba(255, 255, 255, 0.05), inset -1px -1px 0px rgba(0, 0, 0, 0.02)',
          }}
        >
          <EmptyState
            icon={IconBuildings}
            title={filtersActive ? 'No workspace matches those filters' : 'No workspaces yet'}
            body={
              filtersActive
                ? `All ${total} workspaces are still here — the current filters just exclude every one of them.`
                : 'Provision the first workspace to get started.'
            }
            action={
              filtersActive ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="t-compact inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-lg px-4"
                  style={{
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-raised)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <IconX size={14} stroke={1.5} aria-hidden />
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop: The expansive enterprise table */}
          <div
            className="mt-6 hidden overflow-x-auto rounded-2xl md:block"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-raised)',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.03), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
          >
            <table className="w-full border-collapse text-left">
              <thead>
                <tr
                  className="border-b"
                  style={{
                    background: 'var(--surface-sunken)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <th
                    scope="col"
                    className="cursor-pointer select-none py-3.5 pl-6 pr-4"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                        Workspace
                      </span>
                      {sortField === 'name' ? (
                        sortDir === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                      ) : (
                        <IconArrowsSort size={13} className="opacity-40" />
                      )}
                    </div>
                  </th>

                  <th scope="col" className="py-3.5 px-3">
                    <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Plan
                    </span>
                  </th>

                  <th scope="col" className="py-3.5 px-3">
                    <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Status
                    </span>
                  </th>

                  <th
                    scope="col"
                    className="cursor-pointer select-none py-3.5 px-3"
                    onClick={() => toggleSort('seats')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                        Seats
                      </span>
                      {sortField === 'seats' ? (
                        sortDir === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                      ) : (
                        <IconArrowsSort size={13} className="opacity-40" />
                      )}
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="cursor-pointer select-none py-3.5 px-3"
                    onClick={() => toggleSort('events')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                        Events / Month
                      </span>
                      {sortField === 'events' ? (
                        sortDir === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                      ) : (
                        <IconArrowsSort size={13} className="opacity-40" />
                      )}
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="cursor-pointer select-none py-3.5 px-3"
                    onClick={() => toggleSort('activity')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                        Activity
                      </span>
                      {sortField === 'activity' ? (
                        sortDir === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />
                      ) : (
                        <IconArrowsSort size={13} className="opacity-40" />
                      )}
                    </div>
                  </th>

                  <th scope="col" className="py-3.5 pl-3 pr-6 text-right">
                    <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                      Actions
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {paginated.map((r) => {
                  const seatPct = r.seatsUsed / r.seatsLimit;
                  const eventPct = r.events / r.eventsLimit;
                  const st = STATUS_INK[r.status];
                  const initials = toWorkspace(r).initials;
                  const isRecent = r.activity.includes('min') || r.activity === 'just now';
                  const seatsLeft = Math.max(0, r.seatsLimit - r.seatsUsed);
                  const eventsLeft = Math.max(0, r.eventsLimit - r.events);

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setDrawerRow(r)}
                      className="group cursor-pointer transition-colors duration-150 hover:bg-[var(--surface-sunken)]/60"
                    >
                      {/* Workspace & Meta */}
                      <td className="py-4.5 pl-6 pr-4">
                        <div className="flex items-center gap-3.5">
                          <div
                            className="relative flex size-10.5 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105"
                            style={{
                              background: 'linear-gradient(135deg, var(--surface-inset), var(--surface-sunken))',
                              border: '1px solid var(--border-strong)',
                              color: 'var(--text-primary)',
                              font: '600 13px var(--font-ui)',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.1)',
                            }}
                            aria-hidden="true"
                          >
                            {initials}
                            <span
                              className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2"
                              style={{
                                background: st.dot,
                                borderColor: 'var(--surface-raised)',
                                boxShadow: `0 0 4px ${st.dot}`,
                              }}
                            />
                          </div>

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDrawerRow(r); }}
                              className="block truncate text-left font-medium transition-colors hover:text-[var(--text-action)]"
                              style={{
                                fontSize: '15px',
                                lineHeight: 1.3,
                                color: 'var(--text-primary)',
                                letterSpacing: '-0.01em',
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                              }}
                            >
                              {r.name}
                            </button>
                            <div className="mt-0.5 flex items-center gap-2">
                              <span
                                className="truncate font-mono text-xs"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                {r.slug}
                              </span>
                              <span style={{ color: 'var(--border-strong)' }}>·</span>
                              <span
                                className="font-mono text-[11px]"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                {r.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-4.5 px-3">
                        <PlanBadge plan={r.plan} />
                      </td>

                      {/* Status */}
                      <td className="py-4.5 px-3">
                        <StatusBadge status={r.status} />
                      </td>

                      {/* Seats Meter */}
                      <td className="py-4.5 px-3">
                        <DetailedMeter
                          value={`${r.seatsUsed}`}
                          maxFormatted={`${r.seatsLimit}`}
                          pct={seatPct}
                          subtext={`${seatsLeft} seats left`}
                          maxTrackWidth={130}
                        />
                      </td>

                      {/* Events Meter */}
                      <td className="py-4.5 px-3">
                        <DetailedMeter
                          value={group(r.events)}
                          maxFormatted={formatCompactNumber(r.eventsLimit)}
                          pct={eventPct}
                          subtext={`${formatCompactNumber(eventsLeft)} remaining`}
                          maxTrackWidth={140}
                        />
                      </td>

                      {/* Activity & Timeline */}
                      <td className="py-4.5 px-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            {isRecent && (
                              <span
                                className="size-1.5 rounded-full"
                                style={{ background: 'var(--success-fg)', animation: 'pulse-dot 2s ease-in-out infinite' }}
                              />
                            )}
                            <span
                              style={{
                                color:
                                  r.activity === 'never' || r.activity.includes('day')
                                    ? 'var(--text-tertiary)'
                                    : 'var(--text-primary)',
                              }}
                            >
                              {r.activity}
                            </span>
                          </div>
                          <span
                            className="font-mono text-[11px]"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            Created {r.created}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4.5 pl-3 pr-6 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPending(toWorkspace(r))}
                            title="Start support session"
                            aria-label={`Start support session in ${r.name}`}
                            className="inline-flex h-8.5 items-center gap-1.5 rounded-lg px-2.5 transition-all duration-200 hover:bg-[var(--surface-inset)] hover:text-[var(--text-action)] active:scale-95"
                            style={{
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--surface-raised)',
                              color: 'var(--text-secondary)',
                              font: '500 12px var(--font-ui)',
                            }}
                          >
                            <IconExternalLink size={14} stroke={1.5} aria-hidden />
                            <span className="hidden xl:inline">Session</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDrawerRow(r)}
                            title={`View ${r.name} details`}
                            aria-label={`View ${r.name} details`}
                            className="grid size-8.5 place-items-center rounded-lg transition-all duration-200 hover:bg-[var(--surface-inset)] hover:text-[var(--text-action)] active:scale-95"
                            style={{
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--surface-raised)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <IconDotsVertical size={16} stroke={1.5} aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: Expansive Neumorphic Cards */}
          <div className="mt-6 grid gap-4 md:hidden">
            {paginated.map((r) => {
              const st = STATUS_INK[r.status];
              const eventPct = r.events / r.eventsLimit;
              const seatPct = r.seatsUsed / r.seatsLimit;
              const initials = toWorkspace(r).initials;
              const seatsLeft = Math.max(0, r.seatsLimit - r.seatsUsed);
              const eventsLeft = Math.max(0, r.eventsLimit - r.events);

              return (
                <article
                  key={r.id}
                  onClick={() => setDrawerRow(r)}
                  className="group relative cursor-pointer overflow-hidden rounded-2xl transition-all duration-400 hover:-translate-y-[2px]"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-raised)',
                    boxShadow: '4px 6px 20px rgba(0, 0, 0, 0.04), inset 1px 1px 0px rgba(255, 255, 255, 0.05), inset -1px -1px 0px rgba(0, 0, 0, 0.02)',
                  }}
                >
                  <div
                    className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-[0.08] pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at top right, ${st.dot}, transparent 70%)`,
                    }}
                  />

                  <div className="relative z-10 p-5">
                    <div className="flex items-start gap-3.5">
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl font-medium"
                        style={{
                          background: 'var(--surface-inset)',
                          border: '1px solid var(--border-strong)',
                          color: 'var(--text-secondary)',
                          fontSize: '14px',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                        }}
                        aria-hidden="true"
                      >
                        {initials}
                      </div>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setDrawerRow(r); }}
                          className="block truncate text-left font-medium transition-colors hover:text-[var(--text-action)]"
                          style={{ fontSize: '16px', lineHeight: 1.35, color: 'var(--text-primary)', letterSpacing: '-0.01em', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                        >
                          {r.name}
                        </button>
                        <p
                          className="mt-0.5 truncate font-mono text-xs"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {r.slug} · {r.id}
                        </p>
                      </div>

                      <StatusBadge status={r.status} />
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <PlanBadge plan={r.plan} />
                      <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        Created {r.created}
                      </span>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl p-3.5" style={{ background: 'var(--surface-sunken)' }}>
                      <div>
                        <dt className="t-eyebrow mb-1" style={{ color: 'var(--text-tertiary)' }}>
                          Seats
                        </dt>
                        <dd>
                          <DetailedMeter
                            value={`${r.seatsUsed}`}
                            maxFormatted={`${r.seatsLimit}`}
                            pct={seatPct}
                            subtext={`${seatsLeft} left`}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt className="t-eyebrow mb-1" style={{ color: 'var(--text-tertiary)' }}>
                          Events
                        </dt>
                        <dd>
                          <DetailedMeter
                            value={formatCompactNumber(r.events)}
                            maxFormatted={formatCompactNumber(r.eventsLimit)}
                            pct={eventPct}
                            subtext={`${formatCompactNumber(eventsLeft)} left`}
                          />
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex items-center justify-between font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      <span>Active: {r.activity}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPending(toWorkspace(r)); }}
                    className="relative z-10 flex h-11 w-full items-center justify-center gap-2 font-medium transition-colors hover:bg-[var(--surface-inset)] active:bg-[var(--surface-sunken)]"
                    style={{
                      borderTop: '1px solid var(--border-subtle)',
                      background: 'var(--surface-raised)',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                    }}
                  >
                    <IconExternalLink size={16} stroke={1.5} aria-hidden />
                    Start support session
                  </button>
                </article>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 px-2">
              <span className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} workspaces
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="t-compact h-8.5 rounded-lg px-4 transition-all duration-200 hover:bg-[var(--surface-inset)] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-raised)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      aria-current={p === page ? 'page' : undefined}
                      className="grid size-8.5 place-items-center rounded-lg font-mono text-xs font-medium transition-all duration-200"
                      style={{
                        border: p === page ? '1px solid var(--blue-500)' : '1px solid transparent',
                        background: p === page ? 'var(--blue-500)' : 'transparent',
                        color: p === page ? '#ffffff' : 'var(--text-secondary)',
                        boxShadow: p === page ? '0 2px 8px rgba(14, 165, 233, 0.25)' : 'none',
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="t-compact h-8.5 rounded-lg px-4 transition-all duration-200 hover:bg-[var(--surface-inset)] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-raised)',
                    color: 'var(--text-primary)',
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <p
        className="t-compact mt-8"
        style={{ color: 'var(--text-tertiary)', maxWidth: '82ch' }}
      >
        Usage renders as a number and an exact telemetry track. The meter turns amber at 90% of the resolved limit, which is the same threshold that raises a workspace into <em>Needs attention</em> and into the Overview queue.
      </p>

      {pending ? (
        <StartSessionDialog
          workspace={pending}
          onCancel={() => setPending(null)}
          onConfirm={async (reason) => {
            const result = await onStartSession({
              tenantId: pending.id,
              tenantName: pending.name,
              reason,
            });
            if (result.ok) {
              setPending(null);
              pushToast({
                title: `Support session started in ${pending.name}`,
                description: 'Read-only, expires in 30 minutes.',
                tone: 'success',
              });
            }
            return result;
          }}
        />
      ) : null}

      {drawerRow ? (
        <WorkspaceDetailDrawer
          row={drawerRow}
          onClose={() => setDrawerRow(null)}
          onStartSession={onStartSession}
        />
      ) : null}
    </>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  let color = 'var(--text-tertiary)';

  if (plan === 'Scale') {
    color = 'var(--text-primary)';
  } else if (plan === 'Growth') {
    color = 'var(--text-secondary)';
  } else if (plan === 'Starter') {
    color = 'var(--text-tertiary)';
  }

  return (
    <span 
      className="inline-flex items-center rounded-md px-2 py-0.5"
      style={{
        font: '500 11px/1.2 var(--font-ui)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color,
      }}
    >
      {plan || '—'}
    </span>
  );
}

function StatusBadge({ status }: { status: WorkspaceStatus }) {
  const st = STATUS_INK[status];
  const isPastDue = status === 'past due';

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-200"
      style={{
        border: `1px solid ${isPastDue ? 'var(--danger-fg)' : 'var(--border-subtle)'}`,
        background: isPastDue ? 'var(--danger-bg, rgba(239, 68, 68, 0.08))' : 'var(--surface-sunken)',
      }}
    >
      <span
        aria-hidden
        className={`size-[7px] shrink-0 rounded-full ${isPastDue ? 'animate-pulse' : ''}`}
        style={{
          background: st.dot,
          boxShadow: `0 0 6px ${st.dot}`,
        }}
      />
      <span
        style={{
          font: '600 11px/1 var(--font-ui)',
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: st.ink,
        }}
      >
        {status}
      </span>
    </span>
  );
}

function DetailedMeter({
  value,
  maxFormatted,
  pct,
  subtext,
  maxTrackWidth = 140,
}: {
  value: string;
  maxFormatted: string;
  pct: number;
  subtext?: string;
  maxTrackWidth?: number;
}) {
  const clamped = Math.min(1, Math.max(0, pct));
  const ink = meterInk(pct);
  const pctDisplay = `${Math.round(clamped * 100)}%`;
  const isHigh = pct >= NEAR_LIMIT;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-sm font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {value}{' '}
          <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
            / {maxFormatted}
          </span>
        </span>
        <span
          className="numeric rounded px-1.5 py-0.5 text-[10px] font-mono font-medium"
          style={{
            background: isHigh ? 'var(--warning-bg, rgba(245, 158, 11, 0.12))' : 'var(--surface-sunken)',
            color: isHigh ? ink : 'var(--text-secondary)',
            border: `1px solid ${isHigh ? ink : 'var(--border-subtle)'}`,
          }}
        >
          {pctDisplay}
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(clamped * 100)} percent of limit`}
        className="relative h-1.5 w-full overflow-hidden rounded-full"
        style={{
          maxWidth: maxTrackWidth,
          background: 'var(--surface-sunken)',
          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.06)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clamped * 100}%`,
            background: `linear-gradient(90deg, var(--blue-400) 0%, ${ink} 100%)`,
            boxShadow: `0 0 6px ${ink}`,
          }}
        />
      </div>

      {subtext && (
        <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
          {subtext}
        </span>
      )}
    </div>
  );
}

