import { IconCircleCheck } from '@tabler/icons-react';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';
import { DataSource, Panel, SectionHeading } from '../Surface';
import type { HealthModel, Incident } from '@/lib/console/data';
import { SERVICE_ICON, spell } from './shared';

/** A queue above this many waiting jobs, for five minutes, pages on-call. */
const PAGE_AT = 50;

/**
 * QUEUES AND INCIDENTS. What is waiting now, and everything that went wrong
 * inside the window the strips above cover.
 *
 * ⚠ DEPTH ALONE IS THE MOST MISREAD NUMBER ON AN OPERATIONS SCREEN. Sixty-one
 * looks like sixty-one broken things; it means sixty-one things queued. Whether
 * that is a problem depends entirely on how fast they drain — sixty-one jobs at
 * four a minute is a quarter of an hour, and the same sixty-one at four hundred
 * a minute is gone before the page finishes loading. The rate was on the row
 * as a string; it is a number now, and the row says how long the queue takes
 * to clear, which is the figure somebody actually decides on.
 *
 * ⚠ THE INCIDENT LOG IS THE OTHER END OF EVERY STRIP. The three incidents this
 * panel used to list were dated July and August, outside the thirty days the
 * strips cover, so not one coloured bar above had a row down here to explain
 * it. Every entry now falls inside the window, carries the service it hit,
 * and is the target of the bar it coloured — a click on an amber day lands
 * here, on the row, highlighted.
 */
export function QueuesIncidentsBand({
  queues,
  incidents,
  services,
  window,
}: Pick<HealthModel, 'queues' | 'incidents' | 'services' | 'window'>) {
  const waiting = queues.reduce((s, q) => s + q.depth, 0);
  const ordered = [...incidents].sort((a, b) => b.at.localeCompare(a.at));
  const open = incidents.filter((i) => i.status !== 'resolved').length;
  const nameOf = (key: Incident['service']) => services.find((s) => s.key === key)?.name ?? key;

  return (
    <section aria-labelledby="health-queues">
      <SectionHeading
        id="health-queues"
        title="Queues & incidents"
        note="What is waiting now, and everything that went wrong this month."
        align="right"
        action={<DataSource kind="designed" detail="probes at M6" />}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
        {/* ── Queues ──────────────────────────────────────────────────── */}
        <Panel
          title="Background queues"
          variant="elevated"
          action={
            <span
              className="font-mono text-2xs tracking-[0.1em] uppercase tabular-nums"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {waiting.toLocaleString('en-KE')} waiting
            </span>
          }
          footer={
            <p
              className="t-caption border-t pt-4"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-tertiary)',
                textWrap: 'pretty',
              }}
            >
              Depth is jobs <em>waiting</em>, not jobs failed. A queue above {PAGE_AT} for five
              minutes pages the on-call engineer.
            </p>
          }
        >
          <ul className="m-0 grid list-none p-0">
            {queues.map((q, i) => {
              const hot = q.depth > PAGE_AT;
              return (
                <li
                  key={q.name}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-panel px-3 py-3"
                  style={{
                    background: hot ? 'var(--badge-warning-bg)' : undefined,
                    borderBottom:
                      i === queues.length - 1 ? undefined : '1px solid var(--border-subtle)',
                  }}
                >
                  <span
                    className="truncate"
                    style={{
                      font: '500 var(--type-compact)/1.3 var(--font-mono)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {q.name}
                  </span>
                  <span
                    className="row-span-2 grid h-7 min-w-10 place-items-center self-center rounded-full px-2.5 tabular-nums"
                    style={{
                      font: '500 var(--type-chip)/1 var(--font-mono)',
                      background: hot
                        ? 'var(--warning-fg)'
                        : q.depth > 0
                          ? 'var(--surface-inset)'
                          : 'transparent',
                      color: hot
                        ? 'var(--text-inverse)'
                        : q.depth > 0
                          ? 'var(--text-primary)'
                          : 'var(--text-tertiary)',
                      border: q.depth === 0 ? '1px solid var(--border-subtle)' : undefined,
                    }}
                    aria-label={`${q.depth} waiting`}
                  >
                    {q.depth}
                  </span>
                  <span
                    className="t-caption tabular-nums"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {q.perMinute.toLocaleString('en-KE')}/min ·{' '}
                    <span style={{ color: hot ? 'var(--warning-fg)' : 'var(--text-secondary)' }}>
                      {drain(q.depth, q.perMinute)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>

        {/* ── Incidents ───────────────────────────────────────────────── */}
        <Panel
          title={`Incidents · last ${window.length} days`}
          variant="elevated"
          action={
            incidents.length === 0 ? null : open > 0 ? (
              <StatusBadge tone="danger" size="sm" dot pulse>
                {spell(open)} open
              </StatusBadge>
            ) : (
              <StatusBadge tone="success" size="sm" dot>
                All resolved
              </StatusBadge>
            )
          }
        >
          {ordered.length === 0 ? (
            <div className="flex flex-col items-start gap-2 py-6">
              <IconCircleCheck
                size={22}
                stroke={1.5}
                style={{ color: 'var(--success-fg)' }}
                aria-hidden
              />
              <p className="t-body" style={{ color: 'var(--text-primary)' }}>
                No incidents in {spell(window.length)} days.
              </p>
            </div>
          ) : (
            <ol className="relative m-0 grid list-none gap-1 p-0">
              {/* The rail. Drawn once, behind every entry's marker. */}
              <span
                aria-hidden
                className="absolute top-3 bottom-3 left-[7px] w-px"
                style={{ background: 'var(--border-subtle)' }}
              />
              {ordered.map((inc) => {
                const Icon = SERVICE_ICON[inc.service];
                const ink = inc.impact === 'outage' ? 'var(--danger-fg)' : 'var(--warning-fg)';
                return (
                  <li
                    key={inc.id}
                    id={inc.id}
                    className="relative grid scroll-mt-28 grid-cols-[15px_minmax(0,1fr)] gap-x-4 rounded-overlay py-3.5 pr-3 transition-colors target:bg-[var(--badge-warning-bg)]"
                  >
                    <span
                      aria-hidden
                      className="relative z-10 mt-1.5 size-[15px] rounded-full"
                      style={{
                        background: 'var(--surface-sunken)',
                        boxShadow: `inset 0 0 0 3.5px ${ink}`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                        <h4
                          className="min-w-0"
                          style={{
                            font: '500 var(--type-body)/1.4 var(--font-ui)',
                            color: 'var(--text-primary)',
                            textWrap: 'pretty',
                          }}
                        >
                          {inc.title}
                        </h4>
                        <time
                          dateTime={inc.at}
                          className="shrink-0 tabular-nums"
                          style={{
                            font: '400 var(--type-chip)/1.4 var(--font-mono)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          {inc.when}
                        </time>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <span
                          className="inline-flex items-center gap-1.5 font-mono text-2xs tracking-[0.08em] uppercase"
                          style={{ color: ink }}
                        >
                          {inc.sev}
                        </span>
                        <Dot />
                        <span
                          className="t-caption inline-flex items-center gap-1.5"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          <Icon size={13} stroke={1.75} aria-hidden />
                          {nameOf(inc.service)}
                        </span>
                        <Dot />
                        <span
                          className="t-caption tabular-nums"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {inc.impact === 'outage' ? 'Outage' : 'Degraded'} · {inc.minutes} min
                        </span>
                        <Dot />
                        <span
                          className="t-caption"
                          style={{
                            color:
                              inc.status === 'resolved' ? 'var(--success-fg)' : 'var(--danger-fg)',
                          }}
                        >
                          {inc.status === 'resolved'
                            ? 'Resolved'
                            : inc.status === 'monitoring'
                              ? 'Monitoring'
                              : 'Open'}
                        </span>
                      </div>

                      <p
                        className="t-compact mt-2"
                        style={{
                          color: 'var(--text-secondary)',
                          textWrap: 'pretty',
                        }}
                      >
                        {inc.detail}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </div>
    </section>
  );
}

/** "empty", "clears in under a minute", "clears in ~15 min". */
function drain(depth: number, perMinute: number): string {
  if (depth === 0) return 'empty';
  if (perMinute <= 0) return 'not draining';
  const minutes = depth / perMinute;
  if (minutes < 1) return 'clears in under a minute';
  if (minutes < 90) return `clears in ~${Math.round(minutes)} min`;
  return `clears in ~${Math.round(minutes / 60)} h`;
}

function Dot() {
  return (
    <span
      aria-hidden
      className="size-0.75 rounded-full"
      style={{ background: 'var(--border-strong)' }}
    />
  );
}

export function QueuesIncidentsBandSkeleton() {
  return (
    <SkeletonGroup label="Loading queues and incidents" className="block">
      <SkeletonSectionHeading align="right" />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
        <Panel title="Background queues" variant="elevated">
          <div className="grid gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-3 py-3">
                <div className="flex-1">
                  <SkeletonBar width={`${62 - (i % 3) * 9}%`} height={13} />
                  <SkeletonBar width="44%" height={11} className="mt-1.5" />
                </div>
                <SkeletonBar width={40} height={28} radius="rounded-full" />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Incidents" variant="elevated">
          <div className="grid gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[15px_minmax(0,1fr)] gap-x-4 py-3.5">
                <SkeletonBar width={15} height={15} radius="rounded-full" className="mt-1.5" />
                <div>
                  <div className="flex justify-between gap-4">
                    <SkeletonBar width={`${64 - (i % 3) * 10}%`} height={15} />
                    <SkeletonBar width={96} height={11} />
                  </div>
                  <SkeletonBar width="52%" height={11} className="mt-2" />
                  <SkeletonBar width="88%" height={12} className="mt-2" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </SkeletonGroup>
  );
}
