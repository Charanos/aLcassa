'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconArrowsSort,
  IconDotsVertical,
  IconExternalLink,
  IconSearch,
  IconX,
} from '@tabler/icons-react';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconBuildings } from '@tabler/icons-react';
import { StartSessionDialog } from './StartSessionDialog';
import type { ConsoleWorkspace } from './types';
import type { WorkspaceRow, WorkspaceStatus } from '@/lib/console/data';

/**
 * The workspace list. `Workspaces.dc.html`.
 *
 * ⚠ USAGE IS A NUMBER AND A HAIRLINE, NOT A BAR CHART, which is the design's
 * own stated rule and the reason this table reads as a document rather than an
 * infographic: "forty rows of bar charts is a texture, not a reading." The
 * meter is 2px, sits under the figure, and exists to answer "roughly how full"
 * at a glance — the exact value is already there in tabular figures.
 *
 * ⚠ THE THRESHOLD IS DEFINED ONCE. The meter turns amber at 90% of the
 * resolved limit, and that is the same predicate that decides whether a row
 * counts as "needs attention" and whether Overview raises it into the queue.
 * Three surfaces disagreeing about what "near the limit" means is exactly the
 * kind of drift that makes an operator stop trusting the console.
 *
 * ⚠ IT DESTRUCTURES INTO CARDS BELOW `md`, it does not scroll sideways. An
 * eight-column table in a horizontal scroller is unusable on a phone, and the
 * whole point of the status column is that it can be scanned.
 *
 * The design file's "State" tab row is deliberately NOT ported. It is labelled
 * "Design review only · not shipped chrome" in the source, and it exists so a
 * reviewer can flip between loading, empty and error states. The real states
 * are driven by the data.
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

function meterInk(pct: number): string {
  if (pct >= 1) return 'var(--danger-fg)';
  if (pct >= NEAR_LIMIT) return 'var(--warning-fg)';
  return 'var(--blue-400)';
}

/** Initials from the first two words, so the dialog and the switcher chip
 *  agree on how a workspace is abbreviated. */
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

type Sort = 'activity' | 'name' | 'usage';

export function WorkspaceTable({
  rows,
  total,
  onStartSession,
}: {
  rows: WorkspaceRow[];
  total: number;
  /** The server action. The dialog below is what collects the reason for it. */
  onStartSession: (input: {
    tenantId: string;
    tenantName: string;
    reason: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState<WorkspaceStatus[]>([]);
  const [attention, setAttention] = useState(false);
  const [sort, setSort] = useState<Sort>('activity');
  const searchRef = useRef<HTMLInputElement>(null);

  /* The confirmation lives here rather than in the shell, so the row action
     and the header switcher both go through the same gate. 09 §4: selecting a
     workspace never navigates straight in, wherever it is selected from. */
  const [pending, setPending] = useState<ConsoleWorkspace | null>(null);

  const attentionCount = useMemo(() => rows.filter(needsAttention).length, [rows]);

  /* `/` focuses search. Standard in every console an operator has used, and
     it is guarded so it does not fire while they are typing somewhere else. */
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (q && !(r.name.toLowerCase().includes(q) || r.slug.includes(q))) return false;
      if (statuses.length && !statuses.includes(r.status)) return false;
      if (attention && !needsAttention(r)) return false;
      return true;
    });

    if (sort === 'name') return [...out].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'usage')
      return [...out].sort((a, b) => b.events / b.eventsLimit - a.events / a.eventsLimit);
    return out;
  }, [rows, query, statuses, attention, sort]);

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
      {/* ── Filter bar ───────────────────────────────────────────────── */}
      <div
        className="surface-card mt-4 flex flex-wrap items-center gap-2.5 p-3"
        style={{ borderRadius: 'var(--radius-lg)' }}
      >
        <label
          className="flex h-[34px] max-w-[380px] min-w-0 flex-1 basis-[280px] items-center gap-2.5 rounded-chip px-3"
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
            placeholder="Name or slug"
            aria-label="Search workspaces"
            className="min-w-0 flex-1 border-none bg-transparent outline-none"
            style={{ font: '400 var(--text-sm)/1 var(--font-ui)', color: 'var(--text-primary)' }}
          />
          <kbd style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>/</kbd>
        </label>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="t-eyebrow mr-0.5" style={{ color: 'var(--text-tertiary)' }}>
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
                className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 transition-colors"
                style={{
                  border: `1px solid ${on ? 'var(--blue-500)' : 'var(--border-subtle)'}`,
                  background: on ? 'var(--blue-50)' : 'var(--surface-raised)',
                  color: on ? 'var(--blue-600)' : 'var(--text-secondary)',
                  font: '400 var(--text-sm)/1 var(--font-ui)',
                }}
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ background: STATUS_INK[s].dot }}
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
          className="inline-flex h-7 items-center gap-2 rounded-full py-0 pr-1 pl-2.5 transition-colors"
          style={{
            border: `1px solid ${attention ? 'var(--blue-500)' : 'var(--border-subtle)'}`,
            background: attention ? 'var(--blue-50)' : 'var(--surface-raised)',
            color: attention ? 'var(--blue-600)' : 'var(--text-secondary)',
            font: '400 var(--text-sm)/1 var(--font-ui)',
          }}
        >
          Needs attention
          {/* The one accent in this bar. It is a COUNT of things that will cost
              money if ignored, which is the only thing on this screen that
              earns the orange. */}
          <span
            className="numeric grid h-5 min-w-5 place-items-center rounded-full px-1.5"
            style={{ background: 'var(--accent-mark)', color: '#ffffff', fontSize: 11 }}
          >
            {attentionCount}
          </span>
        </button>

        <span className="ml-auto flex items-center gap-3.5">
          <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
            <span className="numeric" style={{ color: 'var(--text-primary)' }}>
              {filtered.length}
            </span>{' '}
            of {total}
          </span>
          <span
            aria-hidden
            className="hidden sm:block"
            style={{ width: 1, height: 18, background: 'var(--border-subtle)' }}
          />
          <label className="hidden items-center gap-1.5 sm:flex">
            <IconArrowsSort
              size={15}
              stroke={1.5}
              style={{ color: 'var(--text-tertiary)' }}
              aria-hidden
            />
            <span className="visually-hidden">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="rounded-panel border-none bg-transparent outline-none"
              style={{ font: '400 var(--text-sm)/1 var(--font-ui)', color: 'var(--text-secondary)' }}
            >
              <option value="activity">Last activity</option>
              <option value="name">Name</option>
              <option value="usage">Usage</option>
            </select>
          </label>
        </span>
      </div>

      {/* ── Results ──────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="mt-4 rounded-overlay p-6"
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
                  className="t-compact inline-flex h-8 items-center gap-1.5 rounded-panel px-3"
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
          {/* Desktop: the table. */}
          <div
            className="mt-4 hidden overflow-hidden rounded-overlay md:block"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-raised)',
              boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
            }}
          >
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: '27%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '9%' }} />
                <col style={{ width: '4%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'var(--surface-sunken)' }}>
                  {['Workspace', 'Plan', 'Status', 'Seats', 'Events this month', 'Last activity', 'Created'].map(
                    (h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className="h-9 text-left"
                        style={{
                          padding: i === 0 ? '0 16px' : '0 8px',
                          borderBottom: '1px solid var(--border-subtle)',
                          font: '500 11px/1 var(--font-ui)',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                  <th style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const seatPct = r.seatsUsed / r.seatsLimit;
                  const eventPct = r.events / r.eventsLimit;
                  const st = STATUS_INK[r.status];
                  return (
                    <tr
                      key={r.id}
                      className="group transition-colors hover:bg-[var(--surface-sunken)]"
                      style={{
                        height: 'var(--row-h)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <td className="overflow-hidden" style={{ padding: '0 16px' }}>
                        {/* The whole row used to be clickable in the design.
                            A link on the NAME instead keeps the row's other
                            controls reachable, gives the browser a real href
                            to preview and open in a new tab, and is what a
                            keyboard user can actually tab to. */}
                        <Link
                          href={`/platform/tenants/${r.slug}`}
                          className="block truncate transition-colors hover:text-[var(--text-action)]"
                          style={{
                            font: '400 var(--text-sm)/1.35 var(--font-ui)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {r.name}
                        </Link>
                        <span
                          className="block truncate"
                          style={{
                            font: '400 11px/1.35 var(--font-mono)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          {r.slug}
                        </span>
                      </td>
                      <td style={{ padding: '0 8px' }}>
                        <span
                          style={{
                            font: '400 var(--text-sm)/1 var(--font-mono)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {r.plan}
                        </span>
                      </td>
                      <td style={{ padding: '0 8px' }}>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className="size-[7px] shrink-0 rounded-full"
                            style={{ background: st.dot }}
                          />
                          <span
                            style={{
                              font: '400 var(--text-sm)/1 var(--font-mono)',
                              color: st.ink,
                            }}
                          >
                            {r.status}
                          </span>
                        </span>
                      </td>
                      <td style={{ padding: '0 8px' }}>
                        <Meter
                          value={`${r.seatsUsed} / ${r.seatsLimit}`}
                          pct={seatPct}
                          max={84}
                        />
                      </td>
                      <td style={{ padding: '0 8px' }}>
                        <Meter
                          value={`${group(r.events)} / ${group(r.eventsLimit)}`}
                          pct={eventPct}
                          max={110}
                        />
                      </td>
                      <td style={{ padding: '0 8px' }}>
                        <span
                          style={{
                            font: '400 var(--text-sm)/1 var(--font-mono)',
                            color:
                              r.activity === 'never' || r.activity.includes('day')
                                ? 'var(--text-tertiary)'
                                : 'var(--text-secondary)',
                          }}
                        >
                          {r.activity}
                        </span>
                      </td>
                      <td style={{ padding: '0 8px' }}>
                        <span
                          style={{
                            font: '400 var(--text-sm)/1 var(--font-mono)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          {r.created}
                        </span>
                      </td>
                      <td style={{ padding: '0 12px 0 0', textAlign: 'right' }}>
                        {/* Revealed on hover, but focus-visible brings it back
                            for the keyboard. An action that only exists under
                            a pointer is an action a keyboard user does not
                            have. */}
                        <span className="inline-flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => setPending(toWorkspace(r))}
                            title="Start support session"
                            aria-label={`Start a support session in ${r.name}`}
                            className="grid size-7 place-items-center rounded-panel transition-colors hover:bg-[var(--surface-inset)]"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <IconExternalLink size={16} stroke={1.5} aria-hidden />
                          </button>
                          <Link
                            href={`/platform/tenants/${r.slug}`}
                            title="Open workspace"
                            aria-label={`Open ${r.name}`}
                            className="grid size-7 place-items-center rounded-panel transition-colors hover:bg-[var(--surface-inset)]"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            <IconDotsVertical size={16} stroke={1.5} aria-hidden />
                          </Link>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile: the same rows as cards. */}
          <div className="mt-4 grid gap-2.5 md:hidden">
            {filtered.map((r) => {
              const st = STATUS_INK[r.status];
              const eventPct = r.events / r.eventsLimit;
              return (
                <article
                  key={r.id}
                  className="rounded-overlay p-4"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-raised)',
                    boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/platform/tenants/${r.slug}`}
                      className="min-w-0 flex-1"
                      style={{
                        font: '500 var(--text-base)/1.35 var(--font-ui)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {r.name}
                    </Link>
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-[7px] rounded-full"
                        style={{ background: st.dot }}
                      />
                      <span
                        style={{ font: '400 11px/1 var(--font-mono)', color: st.ink }}
                      >
                        {r.status}
                      </span>
                    </span>
                  </div>
                  <p
                    className="mt-0.5"
                    style={{ font: '400 11px/1.4 var(--font-mono)', color: 'var(--text-tertiary)' }}
                  >
                    {r.slug} · {r.plan}
                  </p>

                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <dt className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                        Seats
                      </dt>
                      <dd className="mt-1">
                        <Meter
                          value={`${r.seatsUsed} / ${r.seatsLimit}`}
                          pct={r.seatsUsed / r.seatsLimit}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                        Events
                      </dt>
                      <dd className="mt-1">
                        <Meter value={`${group(r.events)}`} pct={eventPct} />
                      </dd>
                    </div>
                  </dl>

                  <div
                    className="mt-3 flex items-center justify-between gap-3 border-t pt-3"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <span
                      style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                    >
                      {r.activity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPending(toWorkspace(r))}
                      className="t-compact inline-flex h-8 items-center gap-1.5 rounded-panel px-3"
                      style={{
                        border: '1px solid var(--border-strong)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <IconExternalLink size={14} stroke={1.5} aria-hidden />
                      Support session
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <p
        className="t-compact mt-3.5"
        style={{ color: 'var(--text-tertiary)', maxWidth: '82ch' }}
      >
        Usage renders as a number and a hairline. Forty rows of bar charts is a texture, not a
        reading. The meter turns amber at 90% of the resolved limit, which is the same threshold
        that raises a workspace into <em>Needs attention</em> and into the Overview queue.
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
            if (result.ok) setPending(null);
            return result;
          }}
        />
      ) : null}
    </>
  );
}

function Meter({ value, pct, max }: { value: string; pct: number; max?: number }) {
  const clamped = Math.min(1, Math.max(0, pct));
  return (
    <>
      <span
        className="numeric block"
        style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}
      >
        {value}
      </span>
      <span
        role="meter"
        aria-valuenow={Math.round(clamped * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(clamped * 100)} percent of limit`}
        className="mt-1.5 block h-0.5 w-full overflow-hidden rounded-full"
        style={{ maxWidth: max, background: 'var(--surface-inset)' }}
      >
        <span
          className="block h-full"
          style={{ width: `${clamped * 100}%`, background: meterInk(pct) }}
        />
      </span>
    </>
  );
}
