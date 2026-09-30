'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  IconArrowsSort,
  IconChevronDown,
  IconChevronUp,
  IconDotsVertical,
  IconExternalLink,
  IconX,
  IconBuildings,
  IconCalendar,
  IconUsers,
  IconBolt,
  IconActivityHeartbeat,
} from '@tabler/icons-react';
import { EmptyState } from '@/components/primitives/EmptyState';
import { InitialsTile } from '@/components/primitives/InitialsTile';
import { FilterBar } from '@/components/primitives/FilterBar';
import type { FilterOption } from '@/components/primitives/FilterBar';
import { StartSessionDialog } from './StartSessionDialog';
import { WorkspaceDetailDrawer } from './WorkspaceDetailDrawer';
import { useToast } from '@/components/primitives/Toast';
import { useRovingGrid } from '@/hooks/useRovingGrid';
import { NEAR_LIMIT, needsAttention } from '@/lib/console/attention';
import type { ConsoleWorkspace } from './types';
import type { WorkspaceRow, WorkspaceStatus } from '@/lib/console/data';

/**
 * The workspace list. `Workspaces.dc.html`.
 * Expanded, production-grade enterprise telemetry table with mobile card destructuring.
 */

const STATUS_INK: Record<WorkspaceStatus, { dot: string; ink: string }> = {
  active: { dot: 'var(--success-fg)', ink: 'var(--text-primary)' },
  trial: { dot: 'var(--blue-400)', ink: 'var(--text-primary)' },
  'past due': { dot: 'var(--danger-fg)', ink: 'var(--danger-fg)' },
  suspended: { dot: 'var(--ink-400)', ink: 'var(--text-secondary)' },
  pending: { dot: 'var(--warning-fg)', ink: 'var(--text-secondary)' },
};

/** Refined aesthetic tokens drawing from the Badge primitive taxonomy */
const STATUS_AESTHETICS: Record<WorkspaceStatus, { ink: string; tint: string; border: string }> = {
  active: {
    ink: 'var(--green-500)',
    tint: 'var(--green-100)',
    border: 'color-mix(in oklab, var(--green-500) 40%, transparent)',
  },
  trial: {
    ink: 'var(--blue-500)',
    tint: 'var(--blue-50)',
    border: 'var(--blue-200)',
  },
  'past due': {
    ink: 'var(--red-500)',
    tint: 'var(--red-100)',
    border: 'color-mix(in oklab, var(--red-500) 40%, transparent)',
  },
  suspended: {
    ink: 'var(--ink-500)',
    tint: 'var(--ink-100)',
    border: 'var(--ink-300)',
  },
  pending: {
    ink: 'var(--amber-500)',
    tint: 'var(--amber-100)',
    border: 'color-mix(in oklab, var(--amber-500) 40%, transparent)',
  },
};

/**
 * Sheet 05: "Suspended and archived recede. Both drop their name to secondary
 * ink. A tenant that is inert should not compete with one that is live for the
 * same visual weight."
 *
 * The chip already receded; the workspace NAME did not, so a suspended row
 * still pulled the eye as hard as a live one in a list of 47. This is what
 * that sentence is actually asking for.
 */
const INERT: ReadonlySet<WorkspaceStatus> = new Set<WorkspaceStatus>(['suspended']);

function nameInk(status: WorkspaceStatus): string {
  return INERT.has(status) ? 'var(--text-secondary)' : 'var(--text-primary)';
}

/**
 * The status set: what the chips offer, and what a `?status=` parameter may
 * name. Derived from `STATUS_INK` rather than typed out again — a second
 * hand-written list goes stale the first time a status is added, and it goes
 * stale silently, since an unrecognised value is simply dropped.
 */
const STATUSES = Object.keys(STATUS_INK) as WorkspaceStatus[];

const group = (n: number) => n.toLocaleString('en-GB');

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return n.toString();
}

/**
 * ⚠ A CEILING IS OCHRE, NOT OXIDE. Sheet 04: "A tenant at 15 of 15 has not
 * failed. It has arrived at the limit its plan describes, and the console's
 * job there is to offer the tier above it."
 *
 * This used to return `--danger-fg` at 100%, which said "something is broken"
 * about a workspace that is working exactly as its plan describes — and put a
 * red row in front of an operator whose actual next move is a sales
 * conversation. Sheet 06 sets the rest of the scale: verdigris within the
 * limit, ochre at the ceiling. There is no red on an entitlement meter at all;
 * red is reserved for a failure of correctness.
 */
function meterInk(pct: number): string {
  if (pct >= NEAR_LIMIT) return 'var(--warning-fg)';
  return 'var(--success-fg)';
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

  /*
   * ⚠ THE ATTENTION FILTER STARTS APPLIED WHEN THERE IS SOMETHING TO SEE.
   *
   * Sheet 05: "Attention is pre-filtered. The one applied filter is the one
   * the standfirst just mentioned, so the grid below is already the shortlist
   * rather than a thing to construct." The page's own opening sentence says
   * "N need attention"; landing on all 47 rows and asking the operator to
   * build that shortlist by hand contradicts the sentence they just read.
   *
   * It starts OFF when nothing needs attention, because a filter that is
   * applied and empty reads as a broken list rather than a quiet morning.
   * The chip renders pressed, the count line reads "3 of 47", and Reset is
   * beside it — the state is legible and one click from cleared.
   */
  /**
   * ⚠ THE FILTER CAN BE ARRIVED AT, NOT ONLY BUILT.
   *
   * `?status=past+due` and `?attention=1` seed these on first render, which is
   * what lets another screen SEND somebody here. Revenue's ageing band says
   * "four workspaces are behind"; without this, the link under it drops the
   * operator on all twelve rows to find those four by hand, and the band has
   * handed them a fact rather than a handle on it.
   *
   * This is the URL seeding the CLIENT filter, not server-side filtering. The
   * note at the top of `tenants/page.tsx` still stands: past roughly a thousand
   * rows the filtering itself moves into the query. Until then the array filter
   * is faster, and reading an initial value off the URL costs nothing.
   *
   * Read once, deliberately. These are the starting point of a filter the
   * operator then owns — re-syncing to the URL on every change would fight
   * them the moment they cleared a chip the link had set.
   */
  const params = useSearchParams();
  const seeded = useRef(false);
  const seed = seeded.current
    ? null
    : (() => {
        seeded.current = true;
        const raw = params.get('status');
        const wanted = raw
          ? raw
              .split(',')
              .map((s) => s.trim().toLowerCase())
              .filter((s): s is WorkspaceStatus => STATUSES.includes(s as WorkspaceStatus))
          : [];
        return { statuses: wanted, attention: params.get('attention') === '1' };
      })();

  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState<WorkspaceStatus[]>(seed?.statuses ?? []);
  const [attention, setAttention] = useState(seed?.attention ?? false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const searchRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<ConsoleWorkspace | null>(null);
  const [drawerRow, setDrawerRow] = useState<WorkspaceRow | null>(null);

  const attentionCount = useMemo(() => rows.filter(needsAttention).length, [rows]);

  /**
   * ⚠ THE COUNT LIVES ON THE CHIP, so the summary and the filter are ONE
   * control rather than two facts a reader has to reconcile.
   *
   * 17 §7 argued for a status strip above this table. There already was one —
   * these chips — and adding a second row of counts beside them would have
   * been two controls for one job, with the usual outcome: the strip and the
   * chips disagree the first time a status is added and only one is updated.
   * The count belongs on the thing that filters by it.
   *
   * It counts the WHOLE set rather than the current filter, deliberately. A
   * chip reading "trial 0" because the search box excludes them tells a reader
   * there are no trials, which is a different claim and a wrong one.
   */
  const byStatus = useMemo(() => {
    const out = new Map<WorkspaceStatus, number>();
    for (const r of rows) out.set(r.status, (out.get(r.status) ?? 0) + 1);
    return out;
  }, [rows]);

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
      if (
        q &&
        !(r.name.toLowerCase().includes(q) || r.slug.includes(q) || r.id.toLowerCase().includes(q))
      )
        return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (attention && !needsAttention(r)) return false;
      return true;
    });

    return [...out].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'usage' || sortField === 'events')
        cmp = a.events / a.eventsLimit - b.events / b.eventsLimit;
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

  // Sheet 13: the grid is one tab stop. ↑↓ move between rows, ↵ opens the
  // detail drawer, → steps into the row's own actions.
  const grid = useRovingGrid<HTMLTableRowElement>({
    count: paginated.length,
    onActivate: (i) => setDrawerRow(paginated[i] ?? null),
  });

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
      <div
        className="relative mt-6 flex flex-col overflow-hidden rounded-card shadow-2xl transition-all duration-300 sm:flex-row"
        style={{
          background: 'var(--chrome-bg-base)',
          border: '1px solid var(--chrome-rule-strong)',
          color: 'var(--invert-card-fg)',
          boxShadow:
            'var(--shadow-lg), inset 0 1px 1px color-mix(in oklab, var(--ink-0) 6%, transparent)',
        }}
      >
        {/* ── Premium Ambient Background Art ── */}
        <div className="pointer-events-none absolute inset-0 z-0 select-none" aria-hidden="true">
          <div
            className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-[0.18] blur-[120px]"
            style={{ background: 'var(--blue-500)' }}
          />
          <div
            className="absolute -right-32 -bottom-32 h-[600px] w-[600px] rounded-full opacity-[0.12] blur-[140px]"
            style={{ background: 'var(--blue-700)' }}
          />

          <div
            className="absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage:
                'radial-gradient(color-mix(in oklab, var(--ink-0) 80%, transparent) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)',
              WebkitMaskImage: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)',
            }}
          />
        </div>

        {/* Metric 1 */}
        <div className="relative z-10 flex-1 p-5 sm:p-6 sm:pr-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Total Workspaces
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span
              className="font-mono text-3xl font-medium tracking-tight"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {stats.totalWorkspaces}
            </span>
            <span className="font-mono text-sm font-medium" style={{ color: 'var(--success-fg)' }}>
              {stats.activeCount} active
            </span>
          </div>
          <div
            className="absolute top-4 right-0 bottom-4 hidden w-px sm:block"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--chrome-hover) 15%, var(--chrome-rule-strong) 50%, var(--chrome-hover) 85%, transparent)',
              boxShadow: '1px 0 0 var(--chrome-bg-base)',
            }}
          />
          <div
            className="absolute right-6 bottom-0 left-6 h-px sm:hidden"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--chrome-hover) 15%, var(--chrome-rule-strong) 50%, var(--chrome-hover) 85%, transparent)',
              boxShadow: '0 1px 0 var(--chrome-bg-base)',
            }}
          />
        </div>

        {/* Metric 2 */}
        <div className="relative z-10 flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Seats Allocated
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span
              className="font-mono text-3xl font-medium tracking-tight"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {group(stats.totalSeats)}
            </span>
            <span className="font-mono text-sm" style={{ color: 'var(--invert-card-subtle)' }}>
              / {group(stats.totalSeatsLimit)}
            </span>
          </div>
          <div
            className="absolute top-4 right-0 bottom-4 hidden w-px sm:block"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--chrome-hover) 15%, var(--chrome-rule-strong) 50%, var(--chrome-hover) 85%, transparent)',
              boxShadow: '1px 0 0 var(--chrome-bg-base)',
            }}
          />
          <div
            className="absolute right-6 bottom-0 left-6 h-px sm:hidden"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--chrome-hover) 15%, var(--chrome-rule-strong) 50%, var(--chrome-hover) 85%, transparent)',
              boxShadow: '0 1px 0 var(--chrome-bg-base)',
            }}
          />
        </div>

        {/* Metric 3 */}
        <div className="relative z-10 flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Monthly Events
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span
              className="font-mono text-3xl font-medium tracking-tight"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {formatCompactNumber(stats.totalEvents)}
            </span>
            <span className="font-mono text-sm" style={{ color: 'var(--invert-card-subtle)' }}>
              ingested
            </span>
          </div>
          <div
            className="absolute top-4 right-0 bottom-4 hidden w-px sm:block"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--chrome-hover) 15%, var(--chrome-rule-strong) 50%, var(--chrome-hover) 85%, transparent)',
              boxShadow: '1px 0 0 var(--chrome-bg-base)',
            }}
          />
          <div
            className="absolute right-6 bottom-0 left-6 h-px sm:hidden"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--chrome-hover) 15%, var(--chrome-rule-strong) 50%, var(--chrome-hover) 85%, transparent)',
              boxShadow: '0 1px 0 var(--chrome-bg-base)',
            }}
          />
        </div>

        {/* Metric 4 */}
        <div
          className="relative z-10 flex-1 p-5 transition-colors duration-500 sm:p-6 sm:pl-8"
          style={{
            background:
              attentionCount > 0
                ? 'radial-gradient(circle at top right, color-mix(in oklab, var(--accent-mark) 10%, transparent), transparent 75%)'
                : 'transparent',
          }}
        >
          <div
            className="t-eyebrow"
            style={{
              color: attentionCount > 0 ? 'var(--accent-mark)' : 'var(--invert-card-subtle)',
            }}
          >
            Needs Attention
          </div>
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span
              className="font-mono text-3xl font-medium tracking-tight"
              style={{ color: attentionCount > 0 ? 'var(--accent-mark)' : 'var(--invert-card-fg)' }}
            >
              {attentionCount}
            </span>
            <span
              className="font-mono text-sm"
              style={{
                color: attentionCount > 0 ? 'var(--accent-mark)' : 'var(--invert-card-subtle)',
              }}
            >
              {attentionCount === 1 ? 'workspace' : 'workspaces'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <FilterBar<WorkspaceStatus>
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder="Search by name, slug or ID..."
        optionsLabel="STATUS"
        options={STATUSES.map((s): FilterOption<WorkspaceStatus> => ({
          id: s,
          label: s,
          count: byStatus.get(s) ?? 0,
          activeColor: STATUS_AESTHETICS[s],
        }))}
        selectedOptions={statuses}
        onToggleOption={toggleStatus}
        customChips={
          <button
            type="button"
            onClick={() => setAttention((a) => !a)}
            aria-pressed={attention}
            className="group inline-flex h-[28px] cursor-pointer items-center gap-2.5 rounded-full py-0 pr-2 pl-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:shadow-sm"
            style={{
              border: `1px solid ${attention ? 'color-mix(in oklab, var(--amber-500) 40%, transparent)' : 'var(--border-strong)'}`,
              background: attention ? 'var(--amber-100)' : 'var(--surface-raised)',
              color: attention ? 'var(--amber-500)' : 'var(--text-primary)',
              font: '600 var(--type-chip)/1 var(--font-ui)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              boxShadow: attention ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            }}
          >
            Needs attention
            <span
              className="numeric grid h-[20px] min-w-[20px] place-items-center rounded-full px-1.5 font-medium shadow-sm transition-colors duration-300"
              style={{
                background: attention ? 'var(--amber-500)' : 'var(--amber-500)',
                color: 'var(--text-inverse)',
                fontSize: 'var(--type-micro)',
                /* 03 §5 caps weight at 500. This was 700 — two steps past a
                   ceiling the rest of the console holds, which reads as
                   "louder" rather than as "wrong" and so survived review.
                   A count on a tinted chip has contrast to carry it. */
                fontWeight: 500,
              }}
            >
              {attentionCount}
            </span>
          </button>
        }
        resultsCount={filtered.length}
        totalCount={total}
        onClear={clearFilters}
        filtersActive={filtersActive}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* ── Results ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="mt-6 rounded-card p-12"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
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
                  className="t-compact inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-overlay px-4"
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
          {/* Desktop/List: The expansive enterprise table */}
          <div
            className={`mt-6 overflow-x-auto rounded-hero transition-all duration-300 ${viewMode === 'list' ? 'block' : 'hidden'}`}
            style={{
              background: 'var(--surface-raised)',
              border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
              boxShadow: 'var(--shadow-lg), var(--glass-highlight)',
            }}
          >
            <table className="w-full border-collapse text-left">
              <thead>
                <tr
                  style={{
                    background: 'var(--surface-sunken)',
                    boxShadow: 'var(--neu-inset)',
                  }}
                >
                  <th
                    scope="col"
                    className="cursor-pointer py-3.5 pr-4 pl-6 select-none"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-2xs font-medium tracking-[0.1em] uppercase"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        Workspace
                      </span>
                      {sortField === 'name' ? (
                        sortDir === 'asc' ? (
                          <IconChevronUp size={14} />
                        ) : (
                          <IconChevronDown size={14} />
                        )
                      ) : (
                        <IconArrowsSort size={13} className="opacity-40" />
                      )}
                    </div>
                  </th>

                  <th scope="col" className="px-3 py-3.5">
                    <span
                      className="text-xs font-medium tracking-wider uppercase"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Plan
                    </span>
                  </th>

                  <th scope="col" className="px-3 py-3.5">
                    <span
                      className="text-xs font-medium tracking-wider uppercase"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Status
                    </span>
                  </th>

                  <th
                    scope="col"
                    className="cursor-pointer px-3 py-3.5 select-none"
                    onClick={() => toggleSort('seats')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-2xs font-medium tracking-[0.1em] uppercase"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        Seats
                      </span>
                      {sortField === 'seats' ? (
                        sortDir === 'asc' ? (
                          <IconChevronUp size={14} />
                        ) : (
                          <IconChevronDown size={14} />
                        )
                      ) : (
                        <IconArrowsSort size={13} className="opacity-40" />
                      )}
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="cursor-pointer px-3 py-3.5 select-none"
                    onClick={() => toggleSort('events')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-2xs font-medium tracking-[0.1em] uppercase"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        Events / Month
                      </span>
                      {sortField === 'events' ? (
                        sortDir === 'asc' ? (
                          <IconChevronUp size={14} />
                        ) : (
                          <IconChevronDown size={14} />
                        )
                      ) : (
                        <IconArrowsSort size={13} className="opacity-40" />
                      )}
                    </div>
                  </th>

                  <th
                    scope="col"
                    className="cursor-pointer px-3 py-3.5 select-none"
                    onClick={() => toggleSort('activity')}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-2xs font-medium tracking-[0.1em] uppercase"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        Activity
                      </span>
                      {sortField === 'activity' ? (
                        sortDir === 'asc' ? (
                          <IconChevronUp size={14} />
                        ) : (
                          <IconChevronDown size={14} />
                        )
                      ) : (
                        <IconArrowsSort size={13} className="opacity-40" />
                      )}
                    </div>
                  </th>

                  <th scope="col" className="py-3.5 pr-6 pl-3 text-right">
                    <span
                      className="text-2xs font-medium tracking-[0.1em] uppercase"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Actions
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginated.map((r, i) => {
                  const seatPct = r.seatsUsed / r.seatsLimit;
                  const eventPct = r.events / r.eventsLimit;
                  const st = STATUS_INK[r.status];
                  const isRecent = r.activity.includes('min') || r.activity === 'just now';
                  const seatsLeft = Math.max(0, r.seatsLimit - r.seatsUsed);
                  const eventsLeft = Math.max(0, r.eventsLimit - r.events);

                  return (
                    <tr
                      key={r.id}
                      {...grid.getRowProps(i)}
                      onClick={() => setDrawerRow(r)}
                      className={`group relative cursor-pointer transition-all duration-300 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--blue-500)] ${INERT.has(r.status) ? 'opacity-60 hover:bg-[var(--surface-sunken)] hover:opacity-100' : 'hover:bg-[var(--surface-sunken)] hover:shadow-[var(--neu-inset)]'}`}
                      style={{
                        borderTop:
                          i === 0
                            ? 'none'
                            : '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                        boxShadow: i === 0 ? 'none' : 'var(--glass-highlight)',
                      }}
                    >
                      {/* Workspace & Meta */}
                      <td className="relative py-5 pr-4 pl-6">
                        <div className="flex items-center gap-3.5">
                          <InitialsTile
                            name={r.name}
                            size="md"
                            dot={st.dot}
                            className="transition-transform duration-300 group-hover:scale-105"
                          />

                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDrawerRow(r);
                              }}
                              className="block truncate text-left font-medium transition-colors hover:text-[var(--text-action)]"
                              style={{
                                fontSize: 'var(--type-lede)',
                                lineHeight: 1.3,
                                color: nameInk(r.status),
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
                                className="font-mono text-xs"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                {r.id}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="px-3 py-5">
                        <PlanBadge plan={r.plan} />
                      </td>

                      {/* Status */}
                      <td className="px-3 py-5">
                        <StatusBadge status={r.status} />
                      </td>

                      {/* Seats Meter */}
                      <td className="px-3 py-5">
                        <DetailedMeter
                          value={`${r.seatsUsed}`}
                          maxFormatted={`${r.seatsLimit}`}
                          pct={seatPct}
                          subtext={`${seatsLeft} seats left`}
                          maxTrackWidth={130}
                        />
                      </td>

                      {/* Events Meter */}
                      <td className="px-3 py-5">
                        <DetailedMeter
                          value={group(r.events)}
                          maxFormatted={formatCompactNumber(r.eventsLimit)}
                          pct={eventPct}
                          subtext={`${formatCompactNumber(eventsLeft)} remaining`}
                          maxTrackWidth={140}
                        />
                      </td>

                      {/* Activity & Timeline */}
                      <td className="px-3 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            {isRecent && (
                              <span
                                className="size-1.5 rounded-full"
                                style={{
                                  background: 'var(--success-fg)',
                                  animation: 'pulse-dot 2s ease-in-out infinite',
                                }}
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
                            className="font-mono text-xs"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {r.created}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-5 pr-6 pl-3 text-right"
                        onClick={(e) => e.stopPropagation()}
                        data-row-actions
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' || e.key === 'ArrowLeft') {
                            e.preventDefault();
                            grid.focusIndex(i);
                          }
                        }}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPending(toWorkspace(r))}
                            title="Start support session"
                            aria-label={`Start support session in ${r.name}`}
                            className="inline-flex h-8.5 items-center gap-1.5 rounded-overlay px-2.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:border-[var(--blue-300)] hover:bg-[var(--surface-inset)] hover:text-[var(--text-action)] hover:shadow-sm active:scale-95"
                            style={{
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--surface-raised)',
                              color: 'var(--text-secondary)',
                              font: '500 var(--type-compact) var(--font-ui)',
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
                            className="grid size-8.5 place-items-center rounded-overlay transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px hover:bg-[var(--surface-inset)] hover:text-[var(--text-action)] hover:shadow-sm active:scale-95"
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

          {/* Grid/Mobile: Expansive Neumorphic Cards */}
          <div
            className={`mt-6 gap-4 ${viewMode === 'grid' ? 'grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3' : 'hidden'}`}
          >
            {paginated.map((r) => {
              const st = STATUS_INK[r.status];
              const eventPct = r.events / r.eventsLimit;
              const seatPct = r.seatsUsed / r.seatsLimit;
              const seatsLeft = Math.max(0, r.seatsLimit - r.seatsUsed);
              const eventsLeft = Math.max(0, r.eventsLimit - r.events);

              return (
                <article
                  key={r.id}
                  onClick={() => setDrawerRow(r)}
                  className="group relative cursor-pointer overflow-hidden rounded-hero transition-all duration-400 hover:-translate-y-[2px]"
                  style={{
                    background: 'var(--surface-raised)',
                    border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                    boxShadow: 'var(--shadow-lg), var(--glass-highlight)',
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-[0.08]"
                    style={{
                      background: `radial-gradient(circle at top right, ${st.dot}, transparent 70%)`,
                    }}
                  />

                  <div className="relative z-10 p-5">
                    <div className="flex items-start gap-3.5">
                      <InitialsTile
                        name={r.name}
                        size="lg"
                        dot={st.dot}
                        className="transition-transform duration-300 group-hover:scale-105"
                      />

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerRow(r);
                          }}
                          className="block truncate text-left font-medium transition-colors hover:text-[var(--text-action)]"
                          style={{
                            fontSize: 'var(--type-lede)',
                            fontWeight: 500,
                            lineHeight: 1.35,
                            color: nameInk(r.status),
                            letterSpacing: '-0.01em',
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                          }}
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
                      <span
                        className="flex items-center gap-1.5 font-mono text-xs"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        <IconCalendar size={13} stroke={1.5} />
                        {r.created}
                      </span>
                    </div>

                    <dl
                      className="mt-6 grid grid-cols-2 gap-5 rounded-card p-4"
                      style={{
                        background: 'var(--surface-sunken)',
                        boxShadow: 'var(--neu-inset)',
                      }}
                    >
                      <div>
                        <dt
                          className="mb-1.5 flex items-center gap-1.5 text-2xs font-medium tracking-[0.1em] uppercase"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <IconUsers size={12} stroke={2} />
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
                        <dt
                          className="mb-1.5 flex items-center gap-1.5 text-2xs font-medium tracking-[0.1em] uppercase"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          <IconBolt size={12} stroke={2} />
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

                    <div
                      className="mt-4 flex items-center justify-between font-mono text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      <span className="flex items-center gap-1.5">
                        <IconActivityHeartbeat size={13} stroke={1.5} />
                        Active: {r.activity}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPending(toWorkspace(r));
                    }}
                    className="relative z-10 flex h-11 w-full items-center justify-center gap-2 font-medium transition-colors hover:bg-[var(--surface-inset)] active:bg-[var(--surface-sunken)]"
                    style={{
                      borderTop:
                        '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                      boxShadow: 'var(--glass-highlight)',
                      background: 'var(--surface-raised)',
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--type-body)',
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
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)}{' '}
                of {filtered.length} workspaces
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="t-compact h-8.5 rounded-overlay px-4 transition-all duration-200 hover:bg-[var(--surface-inset)] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
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
                      className="grid size-8.5 place-items-center rounded-overlay font-mono text-xs font-medium transition-all duration-200"
                      style={{
                        border: p === page ? '1px solid var(--blue-500)' : '1px solid transparent',
                        background: p === page ? 'var(--blue-500)' : 'transparent',
                        color: p === page ? 'var(--text-inverse)' : 'var(--text-secondary)',
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
                  className="t-compact h-8.5 rounded-overlay px-4 transition-all duration-200 hover:bg-[var(--surface-inset)] hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
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

      <p className="t-compact mt-8" style={{ color: 'var(--text-tertiary)', maxWidth: '82ch' }}>
        Usage renders as a number and an exact telemetry track. The meter turns amber at 90% of the
        resolved limit, which is the same threshold that raises a workspace into{' '}
        <em>Needs attention</em> and into the Overview queue.
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
                description:
                  'Thirty minutes, in their activity log, and the owner is emailed. Open it from Support sessions.',
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
      className="inline-flex items-center rounded-panel px-2 py-0.5"
      style={{
        font: '500 var(--type-chip)/1.2 var(--font-ui)',
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
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-all duration-300 hover:shadow-sm"
      style={{
        border: `1px solid ${isPastDue ? 'var(--danger-fg)' : 'var(--border-subtle)'}`,
        background: isPastDue
          ? 'var(--danger-bg, var(--badge-danger-bg))'
          : 'var(--surface-sunken)',
        boxShadow: isPastDue ? 'inset var(--shadow-sm)' : 'var(--shadow-sm)',
      }}
    >
      <span
        aria-hidden
        className="size-[7px] shrink-0 rounded-full"
        style={{ background: st.dot }}
      />
      <span
        style={{
          font: '600 var(--type-chip)/1 var(--font-ui)',
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
        <span
          className="font-mono text-sm font-medium tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          {value}{' '}
          <span className="text-xs font-normal" style={{ color: 'var(--text-tertiary)' }}>
            / {maxFormatted}
          </span>
        </span>
        <span
          className="numeric rounded px-1.5 py-0.5 font-mono text-2xs font-medium"
          style={{
            background: isHigh
              ? 'var(--warning-bg, var(--badge-warning-bg))'
              : 'var(--surface-sunken)',
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
        className="relative h-2 w-full overflow-hidden rounded-full transition-all duration-300"
        style={{
          maxWidth: maxTrackWidth,
          background: 'var(--surface-sunken)',
          boxShadow: 'var(--neu-inset)',
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{ width: `${clamped * 100}%`, background: ink }}
        />
      </div>

      {subtext && (
        <span className="font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {subtext}
        </span>
      )}
    </div>
  );
}
