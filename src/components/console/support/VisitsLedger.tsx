'use client';

import { useEffect, useState } from 'react';
import Link from '@/components/structure/NavigationLink';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  IconArrowRight,
  IconChevronLeft,
  IconChevronRight,
  IconDoorEnter,
  IconDoorExit,
  IconClockPlus,
  IconPencil,
} from '@tabler/icons-react';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import { ConsoleDialog } from '@/components/primitives/ConsoleDialog';
import { SkeletonBar } from '@/components/primitives/Skeleton';
import { fetchSupportVisit } from '@/app/(platform)/platform/(console)/support-actions';
import type {
  SupportRegister,
  SupportVisit,
  VisitEvent,
  VisitOutcome,
} from '@/lib/console/liveSupport';
import { OUTCOME, OUTCOME_ORDER, dayLabel, minutesLabel, timeOf } from './outcomes';

/**
 * Every visit in the window. Doc 24 · Stage 5.
 *
 * ⚠ THE REASON IS SHOWN IN FULL. It was truncated to one line in a 29% column,
 * with the rest in a hover title. It is the only field on the row a person
 * wrote, and the only one the customer reads — the row wraps to fit it.
 *
 * ⚠ FILTERS LIVE IN THE URL, so "every visit to Acme this month" is a link
 * someone can send, and reopening the page lands where it was left.
 *
 * ⚠ A ROW OPENS WHAT THE VISIT DID. Entered, each change with its before and
 * after, extended, ended — the timeline answers the question a customer
 * actually asks, which is not "did you come in" but "what did you change".
 */
export function VisitsLedger({ register }: { register: SupportRegister }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const groups: Array<{ day: string; visits: SupportVisit[] }> = [];
  for (const v of register.visits) {
    const last = groups[groups.length - 1];
    if (last?.day === v.day) last.visits.push(v);
    else groups.push({ day: v.day, visits: [v] });
  }

  return (
    <div>
      <Filters register={register} />

      {register.visits.length === 0 ? (
        <div
          className="mt-4 rounded-card px-6 py-12 text-center"
          style={{ border: '1px dashed var(--border-strong)', background: 'var(--surface-sunken)' }}
        >
          <p className="t-body" style={{ color: 'var(--text-primary)' }}>
            {!register.everUsed
              ? 'No support visit has ever been opened.'
              : register.facts.visits === 0
                ? 'No visits in the last 30 days.'
                : 'No visit matches these filters.'}
          </p>
          <p
            className="t-caption mx-auto mt-1.5 max-w-[56ch]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {!register.everUsed
              ? 'When one is, it appears here and in the customer’s own activity log in the same transaction.'
              : register.facts.visits === 0
                ? 'Older visits are kept; the register shows the last thirty days.'
                : 'The register is append-only; nothing was removed — the filters are hiding it.'}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-6">
          {groups.map((g) => (
            <section key={g.day} aria-label={dayLabel(g.day)}>
              <h3
                className="sticky top-0 z-10 -mx-1 px-1 py-2 font-mono text-2xs tracking-[0.14em] uppercase"
                style={{ color: 'var(--text-tertiary)', background: 'var(--surface-base)' }}
              >
                {dayLabel(g.day)} · {g.visits.length} {g.visits.length === 1 ? 'visit' : 'visits'}
              </h3>
              <ul
                className="m-0 list-none overflow-hidden rounded-card p-0"
                style={{
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-raised)',
                  boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
                }}
              >
                {g.visits.map((v) => (
                  <VisitRow key={v.id} visit={v} onOpen={() => setOpenId(v.id)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Pager register={register} />
      {openId ? <Timeline key={openId} sessionId={openId} onClose={() => setOpenId(null)} /> : null}
    </div>
  );
}

function VisitRow({ visit: v, onOpen }: { visit: SupportVisit; onOpen: () => void }) {
  const o = OUTCOME[v.outcome];
  /* Length against the cap: a bar that fills at thirty minutes, and runs on
     in the warning tone past it — which only an extension allows. */
  const frac = Math.min(1, v.minutes / 30);
  return (
    <li style={{ borderTop: '1px solid var(--border-subtle)' }} className="first:border-t-0">
      <button
        type="button"
        onClick={onOpen}
        className="grid w-full gap-x-5 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-[var(--surface-sunken)] md:grid-cols-[64px_minmax(0,1fr)_132px_120px] md:items-start"
      >
        <span
          className="tabular-nums"
          style={{
            font: '400 var(--type-compact)/1.5 var(--font-mono)',
            color: 'var(--text-secondary)',
          }}
        >
          {timeOf(v.startedAt)}
        </span>
        <span className="min-w-0">
          <span className="t-compact block" style={{ color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.tenantName}</span>
            {' · '}
            {v.mine ? 'you' : v.operatorName}
          </span>
          <span
            className="t-compact mt-1 block"
            style={{ color: 'var(--text-primary)', textWrap: 'pretty' }}
          >
            {v.reason ? `“${v.reason}”` : 'No reason recorded'}
          </span>
          {v.changes > 0 || v.extensions > 0 ? (
            <span className="t-caption mt-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
              {[
                v.changes > 0 ? `${v.changes} ${v.changes === 1 ? 'change' : 'changes'}` : null,
                v.extensions > 0 ? `extended ${v.extensions === 1 ? 'once' : 'twice'}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          ) : null}
        </span>
        <span className="min-w-0">
          <span className="t-compact block tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {minutesLabel(v.minutes)}
          </span>
          <span
            className="mt-1.5 block h-1 w-full max-w-[120px] overflow-hidden rounded-full"
            style={{ background: 'var(--surface-inset)' }}
            aria-hidden
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${frac * 100}%`,
                background: v.minutes > 30 ? 'var(--warning-fg)' : 'var(--blue-400)',
              }}
            />
          </span>
        </span>
        <span className="flex items-center justify-between gap-2 md:justify-end">
          <StatusBadge tone={o.tone} size="sm">
            {o.short}
          </StatusBadge>
          <IconArrowRight
            size={15}
            stroke={1.5}
            aria-hidden
            className="shrink-0"
            style={{ color: 'var(--text-tertiary)' }}
          />
        </span>
      </button>
    </li>
  );
}

function Filters({ register }: { register: SupportRegister }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const href = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    const q = next.toString();
    return q ? `${pathname}?${q}` : pathname;
  };
  const outcome = params.get('outcome');
  const operator = params.get('operator');
  const workspace = params.get('workspace');

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="How it ended">
        <Chip href={href('outcome', null)} on={!outcome}>
          All
        </Chip>
        {OUTCOME_ORDER.map((key: VisitOutcome) => (
          <Chip key={key} href={href('outcome', key)} on={outcome === key}>
            {OUTCOME[key].short}
          </Chip>
        ))}
      </div>
      {register.operators.length > 1 || register.workspaces.length > 1 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {register.operators.length > 1
            ? register.operators.map((o) => (
                <Chip
                  key={o.id}
                  href={href('operator', operator === o.id ? null : o.id)}
                  on={operator === o.id}
                >
                  {o.id === register.me ? 'You' : o.name}
                </Chip>
              ))
            : null}
          {workspace ? (
            <Chip href={href('workspace', null)} on>
              {register.workspaces.find((w) => w.slug === workspace)?.name ?? workspace} ×
            </Chip>
          ) : null}
        </div>
      ) : null}
      <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
        {register.matched} {register.matched === 1 ? 'visit' : 'visits'}
        {outcome || operator || workspace ? ' match' : ' in the last 30 days'}
        {register.capped ? ' · the most recent 500 are read' : ''}
      </p>
    </div>
  );
}

function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={on ? 'true' : undefined}
      className="t-compact inline-flex h-8 items-center rounded-full px-3 whitespace-nowrap transition-colors"
      style={{
        border: `1px solid ${on ? 'var(--text-primary)' : 'var(--border-subtle)'}`,
        background: on ? 'var(--text-primary)' : 'var(--surface-raised)',
        color: on ? 'var(--surface-raised)' : 'var(--text-secondary)',
      }}
    >
      {children}
    </Link>
  );
}

function Pager({ register }: { register: SupportRegister }) {
  const params = useSearchParams();
  const pathname = usePathname();
  if (register.pages <= 1) return null;
  const at = (page: number) => {
    const next = new URLSearchParams(params.toString());
    if (page > 1) next.set('page', String(page));
    else next.delete('page');
    const q = next.toString();
    return q ? `${pathname}?${q}` : pathname;
  };
  return (
    <nav aria-label="Pages" className="mt-5 flex items-center justify-between">
      <span className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
        Page {register.page} of {register.pages}
      </span>
      <span className="flex gap-2">
        {register.page > 1 ? (
          <Link
            href={at(register.page - 1)}
            className="t-compact inline-flex h-8 items-center gap-1 rounded-panel px-3"
            style={{ border: '1px solid var(--border-strong)' }}
          >
            <IconChevronLeft size={14} stroke={1.5} aria-hidden /> Newer
          </Link>
        ) : null}
        {register.page < register.pages ? (
          <Link
            href={at(register.page + 1)}
            className="t-compact inline-flex h-8 items-center gap-1 rounded-panel px-3"
            style={{ border: '1px solid var(--border-strong)' }}
          >
            Older <IconChevronRight size={14} stroke={1.5} aria-hidden />
          </Link>
        ) : null}
      </span>
    </nav>
  );
}

const EVENT_ICON = {
  entered: IconDoorEnter,
  change: IconPencil,
  extended: IconClockPlus,
  ended: IconDoorExit,
} as const;

function Timeline({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; visit: SupportVisit; events: VisitEvent[] }
    | { status: 'error'; error: string }
  >({ status: 'loading' });

  /* The parent mounts one Timeline per opened row, so this runs once per
     visit; a stale reply after closing is dropped rather than written into a
     dialog that is gone. */
  useEffect(() => {
    let current = true;
    void fetchSupportVisit(sessionId).then((result) => {
      if (!current) return;
      setState(
        result.ok
          ? { status: 'ready', visit: result.visit, events: result.events }
          : { status: 'error', error: result.error },
      );
    });
    return () => {
      current = false;
    };
  }, [sessionId]);

  const v = state.status === 'ready' ? state.visit : null;

  return (
    <ConsoleDialog
      open
      onOpenChange={(n) => !n && onClose()}
      eyebrow="Support visit"
      title={v ? `${v.operatorName} in ${v.tenantName}` : 'Support visit'}
      width="lg"
      description={v ? `“${v.reason}”` : undefined}
      error={state.status === 'error' ? state.error : null}
      actions={
        <button
          type="button"
          onClick={onClose}
          className="t-compact h-9 rounded-panel px-3.5"
          style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-raised)' }}
        >
          Close
        </button>
      }
    >
      {state.status === 'loading' ? (
        <div className="grid gap-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <SkeletonBar key={i} width={`${86 - i * 12}%`} height={14} />
          ))}
        </div>
      ) : state.status === 'ready' ? (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <StatusBadge tone={OUTCOME[state.visit.outcome].tone} size="sm">
              {OUTCOME[state.visit.outcome].label}
            </StatusBadge>
            <span className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
              {minutesLabel(state.visit.minutes)} ·{' '}
              {state.visit.changes === 0
                ? 'nothing changed'
                : `${state.visit.changes} ${state.visit.changes === 1 ? 'change' : 'changes'}`}
            </span>
            <Link
              href={`/platform/tenants/${state.visit.tenantSlug}`}
              className="t-caption ml-auto underline-offset-2 hover:underline"
              style={{ color: 'var(--text-action)' }}
            >
              Open the workspace
            </Link>
          </div>
          <ol className="m-0 grid list-none gap-0 p-0" aria-label="What happened">
            {state.events.map((e, i) => {
              const Icon = EVENT_ICON[e.kind];
              return (
                <li key={`${e.at}-${i}`} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {i < state.events.length - 1 ? (
                    <span
                      aria-hidden
                      className="absolute top-7 bottom-0 left-[13px] w-px"
                      style={{ background: 'var(--border-subtle)' }}
                    />
                  ) : null}
                  <span
                    className="relative grid size-7 shrink-0 place-items-center rounded-full"
                    style={{
                      background:
                        e.kind === 'change' ? 'var(--warning-bg)' : 'var(--surface-inset)',
                      color: e.kind === 'change' ? 'var(--warning-fg)' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon size={14} stroke={1.5} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="t-compact" style={{ color: 'var(--text-primary)' }}>
                      <span
                        className="mr-2 tabular-nums"
                        style={{
                          font: '400 var(--type-chip)/1 var(--font-mono)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {timeOf(e.at)}
                      </span>
                      {e.kind === 'change' ? <span className="font-mono">{e.label}</span> : e.label}
                    </p>
                    {e.detail ? (
                      <p className="t-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {e.detail}
                      </p>
                    ) : null}
                    {e.kind === 'change' && (e.before || e.after) ? (
                      <Diff before={e.before} after={e.after} />
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
    </ConsoleDialog>
  );
}

function Diff({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const keys = [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].slice(
    0,
    8,
  );
  if (keys.length === 0) return null;
  const show = (x: unknown) =>
    x === undefined || x === null ? '—' : typeof x === 'string' ? x : JSON.stringify(x);
  return (
    <dl
      className="mt-2 grid gap-1 rounded-panel px-3 py-2"
      style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}
    >
      {keys.map((k) => (
        <div key={k} className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-3">
          <dt className="truncate font-mono text-2xs" style={{ color: 'var(--text-tertiary)' }}>
            {k}
          </dt>
          <dd className="m-0 min-w-0 font-mono text-2xs" style={{ overflowWrap: 'anywhere' }}>
            <span className="line-through" style={{ color: 'var(--text-tertiary)' }}>
              {show(before?.[k])}
            </span>{' '}
            → <span style={{ color: 'var(--text-primary)' }}>{show(after?.[k])}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
