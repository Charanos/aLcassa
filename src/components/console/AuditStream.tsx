'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  IconArrowUpRight,
  IconBuildings,
  IconCheck,
  IconChevronDown,
  IconCopy,
  IconExternalLink,
  IconFileText,
  IconLayoutList,
  IconSearch,
  IconShieldLock,
  IconX,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { useRovingGrid } from '@/hooks/useRovingGrid';
import { SkeletonBar } from '@/components/primitives/Skeleton';
import { AUDIT_TONE, describeEntry } from '@/lib/console/auditVocabulary';
import type { AuditEntry, AuditKind } from '@/lib/console/data';

/**
 * The audit stream. `Audit-Log.dc.html`.
 *
 * ⚠ IT READS IN SENTENCES NOW. Every row rendered its raw action key —
 * `subscription.status_changed` — while `LastActions` on the overview said, in
 * its own docblock, that `describeAction` was "one vocabulary, shared with the
 * audit page". It was not shared. The row leads with the sentence and the
 * glyph; the key is on the expanded row, where somebody searching the table
 * for it will look.
 *
 * ⚠ CHANGES BY DEFAULT, READS ONE CLICK AWAY. The ledger holds both, and in
 * the window doc 23 counted, reads outnumbered changes nearly thirty to one —
 * mostly the watchlist, read on every overview load. A stream that opened on
 * all of it buried every change under page views. The view control says how
 * many of each there are, so nothing is hidden by the default.
 *
 * ⚠ FILTERS LIVE IN THE URL. "Show me every plan change Kamau made" is a
 * question someone asks in a dispute and then needs to hand to someone else.
 * A filter held in component state cannot be linked, bookmarked or reopened.
 *
 * ⚠ ROWS EXPAND IN PLACE RATHER THAN OPENING A DRAWER. An entry is read in the
 * context of the entries around it — an operator is usually reconstructing a
 * sequence — and a drawer covers exactly the neighbours that give it meaning.
 *
 * ⚠ THE DIFF IS THE POINT, AND SO IS WHAT IT REFUSES TO SHOW. A redacted field
 * renders as `redacted → redacted`: the reader learns the value changed
 * without learning either value, and that holds because real values are never
 * selected into the read model — not because this component hides them.
 */

const KIND_META: Record<AuditKind, { label: string; icon: TablerIcon }> = {
  tenant: { label: 'Workspaces', icon: IconBuildings },
  plan: { label: 'Plans', icon: IconLayoutList },
  session: { label: 'Support', icon: IconExternalLink },
  rules: { label: 'AI rules', icon: IconFileText },
  admin: { label: 'Operators', icon: IconShieldLock },
};
const KINDS = Object.keys(KIND_META) as AuditKind[];

/** Rows rendered before the reader asks for more. A display limit only: the
 *  filters and counts always run over every entry in the window. */
const PAGE = 30;

export function AuditStream({ entries, today }: { entries: AuditEntry[]; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const view =
    (['changes', 'reads', 'all'] as const).find((v) => v === params.get('view')) ?? 'changes';
  const kinds = (params.get('kind') ?? '').split(',').filter((k): k is AuditKind => k in KIND_META);
  const actor = params.get('actor') ?? '';

  /* The search box is typed into, so it is local state first and the URL
     follows it — writing the URL on every keystroke fights the caret. */
  const [query, setQuery] = useState(params.get('q') ?? '');
  useEffect(() => {
    const id = setTimeout(() => setParam('q', query.trim() || null), 250);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed value should schedule a write
  }, [query]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const [open, setOpen] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  /* ── Counts, before and after each filter, so every control says what it
        would leave on screen. ─────────────────────────────────────────── */
  const isRead = (e: AuditEntry) => e.nature === 'read';
  const counts = {
    changes: entries.filter((e) => !isRead(e)).length,
    reads: entries.filter(isRead).length,
    all: entries.length,
  };
  const inView = useMemo(
    () =>
      entries.filter((e) => (view === 'all' ? true : view === 'reads' ? isRead(e) : !isRead(e))),
    [entries, view],
  );
  const actors = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of inView) m.set(e.actor, (m.get(e.actor) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [inView]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inView.filter((e) => {
      if (kinds.length && !kinds.includes(e.kind)) return false;
      if (actor && e.actor !== actor) return false;
      if (!q) return true;
      const said = describeEntry(e).label;
      return `${said} ${e.action} ${e.target} ${e.actor} ${e.reason ?? ''}`
        .toLowerCase()
        .includes(q);
    });
  }, [inView, kinds, actor, query]);

  const kindCount = (k: AuditKind) => inView.filter((e) => e.kind === k).length;
  const filtering = kinds.length > 0 || actor !== '' || query.trim() !== '';

  const visible = filtered.slice(0, shown);
  const groups = groupByDay(visible);

  // Sheet 13: the stream is one tab stop, not one per entry.
  const grid = useRovingGrid<HTMLButtonElement>({
    count: visible.length,
    onActivate: (i) => {
      const entry = visible[i];
      if (entry) setOpen((current) => (current === entry.id ? null : entry.id));
    },
  });

  let rowIndex = -1;

  return (
    <section aria-labelledby="audit-stream" className="mt-24">
      <h2 id="audit-stream" className="sr-only">
        Entries
      </h2>

      {/* ── Controls ────────────────────────────────────────────────── */}
      <div
        className="flex flex-col gap-3 rounded-card p-3.5"
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* The view: changes, reads, everything. */}
          <div
            role="radiogroup"
            aria-label="Show"
            className="inline-flex shrink-0 rounded-full p-0.5"
            style={{ background: 'var(--surface-inset)' }}
          >
            {(['changes', 'reads', 'all'] as const).map((v) => {
              const on = view === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setShown(PAGE);
                    setParam('view', v === 'changes' ? null : v);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--border-focus)] sm:gap-2 sm:px-3.5"
                  style={{
                    background: on ? 'var(--surface-raised)' : 'transparent',
                    boxShadow: on ? 'var(--shadow-sm)' : undefined,
                    color: on ? 'var(--text-primary)' : 'var(--text-secondary)',
                    font: '500 var(--type-compact)/1 var(--font-ui)',
                  }}
                >
                  {/* Short on a phone, where all three must fit in one row; full above. */}
                  <span className="sm:hidden">
                    {v === 'changes' ? 'Changes' : v === 'reads' ? 'Reads' : 'All'}
                  </span>
                  <span className="hidden sm:inline">
                    {v === 'changes' ? 'Changes' : v === 'reads' ? 'Audited reads' : 'Everything'}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      font: '400 var(--type-chip)/1 var(--font-mono)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {counts[v].toLocaleString('en-KE')}
                  </span>
                </button>
              );
            })}
          </div>

          <label
            className="flex h-9 min-w-0 flex-1 basis-60 items-center gap-2.5 rounded-full px-3.5"
            style={{
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
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
              type="search"
              value={query}
              onChange={(e) => {
                setShown(PAGE);
                setQuery(e.target.value);
              }}
              placeholder="Search what, who or where"
              aria-label="Search the audit log"
              className="min-w-0 flex-1 border-none bg-transparent outline-none"
              style={{
                font: '400 var(--type-compact)/1 var(--font-ui)',
                color: 'var(--text-primary)',
              }}
            />
          </label>

          {actors.length > 1 ? (
            <label className="relative inline-flex h-9 shrink-0 items-center">
              <span className="sr-only">Operator</span>
              <select
                value={actor}
                onChange={(e) => {
                  setShown(PAGE);
                  setParam('actor', e.target.value || null);
                }}
                className="h-9 appearance-none rounded-full pr-9 pl-3.5 outline-none focus-visible:outline-2 focus-visible:outline-[var(--border-focus)]"
                style={{
                  border: `1px solid ${actor ? 'var(--blue-500)' : 'var(--border-strong)'}`,
                  background: actor ? 'var(--blue-50)' : 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                  font: '400 var(--type-compact)/1 var(--font-ui)',
                }}
              >
                <option value="">Every operator</option>
                {actors.map(([name, n]) => (
                  <option key={name} value={name}>
                    {name} · {n}
                  </option>
                ))}
              </select>
              <IconChevronDown
                size={14}
                stroke={1.75}
                aria-hidden
                className="pointer-events-none absolute right-3"
                style={{ color: 'var(--text-tertiary)' }}
              />
            </label>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {KINDS.map((k) => {
            const meta = KIND_META[k];
            const Icon = meta.icon;
            const on = kinds.includes(k);
            const n = kindCount(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                disabled={n === 0 && !on}
                onClick={() => {
                  setShown(PAGE);
                  const next = on ? kinds.filter((x) => x !== k) : [...kinds, k];
                  setParam('kind', next.length ? next.join(',') : null);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-[var(--border-focus)] disabled:cursor-not-allowed disabled:opacity-45"
                style={{
                  border: `1px solid ${on ? 'var(--blue-500)' : 'var(--border-subtle)'}`,
                  background: on ? 'var(--blue-50)' : 'var(--surface-raised)',
                  color: on ? 'var(--blue-600)' : 'var(--text-secondary)',
                  font: '400 var(--type-compact)/1 var(--font-ui)',
                }}
              >
                <Icon size={14} stroke={1.5} aria-hidden />
                {meta.label}
                <span
                  className="tabular-nums"
                  style={{ font: '400 var(--type-chip)/1 var(--font-mono)', opacity: 0.75 }}
                >
                  {n}
                </span>
              </button>
            );
          })}

          <span className="ml-auto flex items-center gap-3">
            {filtering ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  const next = new URLSearchParams(params.toString());
                  ['q', 'kind', 'actor'].forEach((k) => next.delete(k));
                  const qs = next.toString();
                  router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 transition-colors hover:bg-[var(--surface-sunken)]"
                style={{
                  color: 'var(--text-secondary)',
                  font: '400 var(--type-compact)/1 var(--font-ui)',
                }}
              >
                <IconX size={13} stroke={1.75} aria-hidden />
                Clear filters
              </button>
            ) : null}
            <span
              className="t-compact whitespace-nowrap"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span
                className="tabular-nums"
                style={{ color: 'var(--text-primary)', fontWeight: 500 }}
              >
                {filtered.length.toLocaleString('en-KE')}
              </span>{' '}
              {filtered.length === 1 ? 'entry' : 'entries'}
            </span>
          </span>
        </div>
      </div>

      {/* ── Entries, by day ─────────────────────────────────────────── */}
      {/*
        `overflow-clip`, not `overflow-hidden`: hidden makes this box a scroll
        container of its own, and a sticky day header inside it then has nothing
        to stick to. Clip rounds the corners without that.
      */}
      <div
        className="mt-4 overflow-clip rounded-card"
        style={{
          border: '1px solid var(--border-subtle)',
          background: 'var(--surface-raised)',
          boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
        }}
      >
        {entries.length === 0 ? (
          <Empty
            title="Nothing recorded in the last thirty days."
            body="No operator changed anything and no read bypassed row-level security. The log is append-only, so this is the whole of it."
          />
        ) : filtered.length === 0 ? (
          <Empty
            title={
              view === 'reads' && counts.reads === 0
                ? 'No audited reads in the window.'
                : 'No entry matches these filters.'
            }
            body="The log is append-only, so nothing has been removed — the current filters are hiding everything in this view."
          />
        ) : (
          groups.map((g) => (
            <div key={g.key}>
              <div
                className="sticky top-0 z-10 flex items-baseline justify-between gap-4 border-b px-5 py-2.5 backdrop-blur"
                style={{
                  borderColor: 'var(--border-subtle)',
                  background: 'color-mix(in srgb, var(--surface-sunken) 92%, transparent)',
                }}
              >
                <span
                  className="font-mono text-2xs tracking-[0.14em] uppercase"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {dayLabel(g.key, today)}
                </span>
                <span
                  className="font-mono text-2xs tabular-nums"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {g.entries.length} {g.entries.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              {g.entries.map((e) => {
                rowIndex += 1;
                const i = rowIndex;
                const said = describeEntry(e);
                const tone = AUDIT_TONE[said.tone];
                const Glyph = said.icon;
                const isOpen = open === e.id;
                const time = e.time.includes(', ') ? e.time.split(', ')[1] : e.time;
                return (
                  <div key={e.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <button
                      type="button"
                      {...grid.getRowProps(i)}
                      onClick={() => setOpen(isOpen ? null : e.id)}
                      aria-expanded={isOpen}
                      className="grid w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3 text-left transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--border-focus)] md:grid-cols-[32px_minmax(0,1fr)_180px_56px_16px]"
                      style={{ background: isOpen ? 'var(--surface-sunken)' : undefined }}
                    >
                      <span
                        aria-hidden
                        className="grid size-8 place-items-center rounded-overlay"
                        style={{
                          background: tone.bg,
                          color: tone.ink,
                          boxShadow: `inset 0 0 0 1px ${tone.edge}`,
                        }}
                      >
                        <Glyph size={15} stroke={1.6} />
                      </span>

                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span
                            className="truncate"
                            style={{
                              font: '500 var(--type-compact)/1.35 var(--font-ui)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {said.label}
                          </span>
                          {said.nature === 'read' ? (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-3xs tracking-[0.1em] uppercase"
                              style={{
                                background: 'var(--surface-inset)',
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              read
                            </span>
                          ) : null}
                        </span>
                        <span
                          className="t-caption mt-0.5 block truncate"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {e.target}
                          <span className="md:hidden">
                            {' '}
                            · {e.actor} · {time}
                          </span>
                        </span>
                      </span>

                      <span className="hidden min-w-0 items-center gap-2 md:flex">
                        <span
                          aria-hidden
                          className="grid size-6 shrink-0 place-items-center rounded-full"
                          style={{
                            background: 'var(--surface-inset)',
                            color: 'var(--text-secondary)',
                            font: '500 var(--type-badge)/1 var(--font-mono)',
                          }}
                        >
                          {e.initials}
                        </span>
                        <span
                          className="t-caption truncate"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {e.actor}
                        </span>
                      </span>

                      <time
                        dateTime={e.at}
                        className="hidden text-right tabular-nums md:block"
                        style={{
                          font: '400 var(--type-chip)/1 var(--font-mono)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {time}
                      </time>

                      <IconChevronDown
                        size={15}
                        stroke={1.5}
                        aria-hidden
                        className="shrink-0 transition-transform"
                        style={{
                          color: 'var(--text-tertiary)',
                          transform: isOpen ? 'rotate(180deg)' : undefined,
                          transitionDuration: 'var(--duration-fast)',
                        }}
                      />
                    </button>

                    {isOpen ? <Detail entry={e} relabelled={said.relabelled} /> : null}
                  </div>
                );
              })}
            </div>
          ))
        )}

        {filtered.length > shown ? (
          <div
            className="flex items-center justify-center p-3.5"
            style={{ background: 'var(--surface-sunken)' }}
          >
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="t-compact inline-flex h-9 items-center gap-2 rounded-full px-4 transition-colors hover:bg-[var(--surface-inset)]"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }}
            >
              Show {Math.min(PAGE, filtered.length - shown)} older
              <span className="tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
                · {filtered.length - shown} left
              </span>
              <IconChevronDown size={14} stroke={1.5} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

/* ── The expanded row ─────────────────────────────────────────────────── */

function Detail({ entry: e, relabelled }: { entry: AuditEntry; relabelled: string | null }) {
  return (
    <div
      className="px-5 pt-4 pb-5 md:pl-[68px]"
      style={{ background: 'var(--surface-sunken)', borderTop: '1px solid var(--border-subtle)' }}
    >
      <dl className="m-0 grid gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
        <Fact label="Action">
          <code style={{ font: '400 var(--type-compact)/1.4 var(--font-mono)' }}>{e.action}</code>
        </Fact>
        <Fact label="Operator">
          {e.actor}
          {e.actorEmail ? (
            <span style={{ color: 'var(--text-tertiary)' }}> · {e.actorEmail}</span>
          ) : null}
        </Fact>
        <Fact label="When">{e.time} EAT</Fact>
        <Fact label="Workspace">
          {e.tenantId ? (
            <Link
              href={`/platform/tenants/${e.tenantId}`}
              className="inline-flex items-center gap-1 underline decoration-[var(--border-strong)] underline-offset-2 hover:decoration-[var(--blue-500)]"
            >
              {e.tenantName ?? 'Open workspace'}
              <IconArrowUpRight size={13} stroke={1.75} aria-hidden />
            </Link>
          ) : (
            <span style={{ color: 'var(--text-tertiary)' }}>Platform-wide</span>
          )}
        </Fact>
        <Fact label="Request">
          <CopyValue value={e.requestId} />
        </Fact>
        <Fact label="From">
          <span style={{ font: '400 var(--type-compact)/1.4 var(--font-mono)' }}>{e.ip}</span>
        </Fact>
      </dl>

      {relabelled ? (
        /* ⚠ SHOWN, NOT HIDDEN. The row above reads as what it was — a read —
           and this says what the ledger actually recorded, because the log is
           append-only and nobody should have to take the relabelling on
           trust. */
        <p
          className="t-caption mt-4 rounded-overlay px-3.5 py-2.5"
          style={{
            background: 'var(--badge-warning-bg)',
            border: '1px solid var(--badge-warning-edge)',
            color: 'var(--text-secondary)',
          }}
        >
          {relabelled}, a verb that claimed a change. It was a read; nothing changed. The row is
          left as written — this log is never edited — and read here as what it was.
        </p>
      ) : null}

      {e.diff?.length ? (
        <div
          className="mt-4 overflow-hidden rounded-overlay"
          style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' }}
        >
          <div
            className="grid px-4 py-2"
            style={{
              gridTemplateColumns: 'minmax(120px, 200px) 1fr 1fr',
              background: 'var(--surface-inset)',
              borderBottom: '1px solid var(--border-subtle)',
            }}
          >
            {['Field', 'Before', 'After'].map((h) => (
              <span
                key={h}
                className="font-mono text-2xs tracking-[0.1em] uppercase"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {h}
              </span>
            ))}
          </div>
          {e.diff.map((d) => (
            <div
              key={d.field}
              className="grid px-4 py-2.5"
              style={{
                gridTemplateColumns: 'minmax(120px, 200px) 1fr 1fr',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span
                className="truncate"
                style={{
                  font: '400 var(--type-compact)/1.4 var(--font-mono)',
                  color: 'var(--text-secondary)',
                }}
              >
                {d.field}
              </span>
              <span
                style={{
                  font: '400 var(--type-compact)/1.4 var(--font-mono)',
                  color: d.redacted ? 'var(--text-disabled)' : 'var(--danger-fg)',
                }}
              >
                {d.before}
              </span>
              <span
                style={{
                  font: '400 var(--type-compact)/1.4 var(--font-mono)',
                  color: d.redacted ? 'var(--text-disabled)' : 'var(--success-fg)',
                }}
              >
                {d.after}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {e.reason ? (
        /* The one field somebody wrote on purpose, and what a dispute will
           actually turn on. Marked with the accent rule. */
        <blockquote
          className="t-compact m-0 mt-4 rounded-r-overlay px-4 py-3"
          style={{
            borderLeft: '2px solid var(--accent-mark)',
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
          }}
        >
          {e.reason}
        </blockquote>
      ) : null}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt
        className="font-mono text-2xs tracking-[0.12em] uppercase"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </dt>
      <dd className="t-compact m-0 mt-1 truncate" style={{ color: 'var(--text-primary)' }}>
        {children}
      </dd>
    </div>
  );
}

/** A request id is copied into a log search more often than it is read. */
function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        });
      }}
      className="group inline-flex max-w-full items-center gap-1.5 text-left"
      title="Copy request id"
    >
      <code className="truncate" style={{ font: '400 var(--type-compact)/1.4 var(--font-mono)' }}>
        {value}
      </code>
      {copied ? (
        <IconCheck
          size={13}
          stroke={2}
          style={{ color: 'var(--success-fg)' }}
          aria-label="Copied"
        />
      ) : (
        <IconCopy
          size={13}
          stroke={1.6}
          className="opacity-50 group-hover:opacity-100"
          style={{ color: 'var(--text-tertiary)' }}
          aria-hidden
        />
      )}
    </button>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <p style={{ font: '500 var(--type-body)/1.4 var(--font-ui)', color: 'var(--text-primary)' }}>
        {title}
      </p>
      <p
        className="t-compact"
        style={{ color: 'var(--text-tertiary)', maxWidth: '56ch', textWrap: 'pretty' }}
      >
        {body}
      </p>
    </div>
  );
}

/* ── Days ─────────────────────────────────────────────────────────────── */

function groupByDay(entries: AuditEntry[]): Array<{ key: string; entries: AuditEntry[] }> {
  const out: Array<{ key: string; entries: AuditEntry[] }> = [];
  for (const e of entries) {
    const key = e.day ?? 'undated';
    const last = out[out.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else out.push({ key, entries: [e] });
  }
  return out;
}

/** "Today · 30 Sep", "Yesterday · 29 Sep", "Sun 28 Sep". Built from the key
 *  itself at UTC midnight, so no time zone can move it a day. */
function dayLabel(key: string, today: string): string {
  if (key === 'undated') return 'Earlier';
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  const short = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  }).format(date);
  const [ty, tm, td] = today.split('-').map(Number);
  const diff = Math.round(
    (Date.UTC(ty ?? 1970, (tm ?? 1) - 1, td ?? 1) - date.getTime()) / 86_400_000,
  );
  if (diff === 0) return `Today · ${short}`;
  if (diff === 1) return `Yesterday · ${short}`;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/** The stream's controls and a day of rows, at their real sizes. */
export function AuditStreamSkeleton() {
  return (
    <div className="mt-24" aria-hidden>
      <div
        className="flex flex-col gap-3 rounded-card p-3.5"
        style={{
          background: 'var(--surface-raised)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <SkeletonBar width={318} height={36} radius="rounded-full" />
          <SkeletonBar width="40%" height={36} radius="rounded-full" className="flex-1" />
          <SkeletonBar width={150} height={36} radius="rounded-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {[104, 78, 88, 86, 100].map((w) => (
            <SkeletonBar key={w} width={w} height={32} radius="rounded-full" />
          ))}
        </div>
      </div>
      <div
        className="mt-4 overflow-clip rounded-card"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' }}
      >
        <div className="px-5 py-3" style={{ background: 'var(--surface-sunken)' }}>
          <SkeletonBar width={128} height={10} />
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-x-4 px-5 py-3 md:grid-cols-[32px_minmax(0,1fr)_180px_56px_16px]"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <SkeletonBar width={32} height={32} radius="rounded-overlay" />
            <div>
              <SkeletonBar width={`${58 - (i % 4) * 9}%`} height={13} />
              <SkeletonBar width={`${34 - (i % 3) * 6}%`} height={11} className="mt-1.5" />
            </div>
            <SkeletonBar width={120} height={12} className="hidden md:block" />
            <SkeletonBar width={40} height={11} className="hidden md:block" />
            <SkeletonBar width={14} height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
