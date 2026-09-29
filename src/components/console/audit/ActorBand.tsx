import { InitialsTile } from '@/components/primitives/InitialsTile';
import { Panel, SectionHeading } from '../Surface';
import type { AuditEntry } from '@/lib/console/data';

/**
 * WHO ACTED. The audit page's second question.
 *
 * ⚠ `VolumeBand` ANSWERS "HOW MUCH AND OF WHAT KIND". IT CANNOT ANSWER "BY
 *   WHOM", AND THAT IS THE OTHER HALF OF WHAT A SECURITY REVIEW ASKS OF AN
 *   AUDIT LOG.
 *
 * A thirty-day total of 214 platform actions reads the same whether four
 * operators made them or one operator made 211 of them, and those are opposite
 * findings. The first is a team. The second is a single point of failure, a
 * shared login, or an automation running under a person's name — and none of
 * those is visible from a histogram.
 *
 * ⚠ CONCENTRATION IS STATED AS A FIGURE RATHER THAN LEFT TO THE EYE. The share
 * bar beside each name is the same number the sentence above it quotes, so the
 * reader is not asked to estimate a proportion from a bar they have no scale
 * for. 03 §11.
 *
 * ⚠ THE REASONED COUNT IS NOT A PERCENTAGE OF EVERYTHING, and the distinction
 * is the point. Most platform actions do not take a reason — provisioning a
 * workspace is self-explanatory, and a required free-text box on every action
 * trains operators to type "." The actions that DO carry one are the ones
 * where intent cannot be read from the action itself: entering a customer's
 * workspace, moving a plan ceiling, lifting the break-glass lock. Counting
 * those against the total would produce a number that looks like poor
 * compliance and means nothing.
 *
 * A server component. Everything here is derived from the entries the page has
 * already loaded — no second query, and nothing that can disagree with the
 * stream below it.
 */
export function ActorBand({ entries }: { entries: AuditEntry[] }) {
  const total = entries.length;

  /* Grouped by the name the log actually carries, so a renamed operator shows
     as the log shows them rather than as the directory does today. */
  const byActor = new Map<string, number>();
  for (const e of entries) byActor.set(e.actor, (byActor.get(e.actor) ?? 0) + 1);

  const actors = [...byActor.entries()]
    .map(([name, count]) => ({ name, count, share: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);

  const top = actors[0];
  const reasoned = entries.filter((e) => (e.reason ?? '').trim().length > 0).length;

  /* Distinct request ids: one action per request is the shape a console
     produces; a request id appearing many times is a batch or a retry loop,
     and it is worth being able to see that it is not happening. */
  const requests = new Set(entries.map((e) => e.requestId)).size;

  return (
    <section className="mb-8">
      <SectionHeading title="Operators" note="Who made these changes" />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Share of the window">
          {actors.length === 0 ? (
            <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
              No actions in this window.
            </p>
          ) : (
            <ul className="m-0 grid list-none gap-3.5 p-0">
              {actors.slice(0, 5).map((a) => (
                <li key={a.name} className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3">
                  <InitialsTile name={a.name} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="t-compact truncate" style={{ color: 'var(--text-primary)' }}>
                        {a.name}
                      </span>
                      <span
                        className="numeric shrink-0 tabular-nums"
                        style={{
                          font: '500 var(--type-chip)/1 var(--font-mono)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {a.count} · {Math.round(a.share)}%
                      </span>
                    </div>
                    {/*
                      ⚠ THE TRACK IS ALWAYS DRAWN, the fill is the share. A bar
                      rendered only as wide as its value gives the reader no
                      scale to read it against — 60% and 100% look identical
                      when each is the widest thing in its own row.
                    */}
                    <div
                      className="mt-1.5 h-1 w-full overflow-hidden rounded-bar"
                      style={{ background: 'var(--surface-inset)' }}
                    >
                      <div
                        className="h-full rounded-bar"
                        style={{
                          width: `${Math.max(a.share, 1.5)}%`,
                          background: 'var(--text-tertiary)',
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="In the window">
          <div className="grid">
            <Figure label="Operators" value={actors.length} />
            {top ? (
              <Figure
                label="Busiest"
                value={`${Math.round(top.share)}%`}
                note={`${top.name} made ${top.count} of ${total}. One operator at or near 100% is a finding, not a statistic.`}
              />
            ) : null}
            <Figure
              label="Carried a stated reason"
              value={reasoned}
              note="Only the actions whose intent cannot be read from the action itself require one."
            />
            <Figure
              label="Distinct requests"
              value={requests}
              note="One action per request is the shape a console produces."
            />
          </div>
        </Panel>
      </div>
    </section>
  );
}

/**
 * One figure. The same rhythm `VolumeBand` uses, deliberately — two panels
 * sitting on one screen with two figure treatments is the drift doc 21 was
 * written about.
 */
function Figure({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div
      className="grid gap-1 border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-label" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span
          className="numeric shrink-0 tabular-nums"
          style={{ font: '500 var(--type-lede)/1 var(--font-mono)', color: 'var(--text-primary)' }}
        >
          {value}
        </span>
      </div>
      {note ? (
        <p className="t-caption m-0" style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
