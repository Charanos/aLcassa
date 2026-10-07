import { InitialsTile } from '@/components/primitives/InitialsTile';
import { Figure } from '@/components/primitives/Figure';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';
import { Panel, SectionHeading } from '../Surface';
import type { AuditEntry } from '@/lib/console/data';

/**
 * OPERATORS. Who made the changes.
 *
 * ⚠ `VolumeBand` ANSWERS "HOW MUCH, AND OF WHAT KIND". IT CANNOT ANSWER "BY
 *   WHOM", and that is the other half of what a security review asks. A month
 *   of changes reads the same whether four operators made them or one made all
 *   but three, and those are opposite findings — a team, or a single point of
 *   failure, a shared login, an automation under a person's name.
 *
 * ⚠ SHARE OF CHANGES, NOT OF ENTRIES. Audited reads are mostly page views: the
 * watchlist is read every time an operator opens the overview. Counting them
 * crowned whoever browsed most as the busiest operator, which is a measure of
 * attention rather than of action. Reads are counted, beside the share, and
 * kept out of it.
 *
 * ⚠ NAMES, NOT LABELS. The log writes actors as `Name <email>`; the band drew
 * the label whole, so initials came out "K<" and every row carried an address
 * at full length. The address is on the expanded row in the stream below.
 *
 * Derived entirely from entries the page has already loaded — no second query,
 * nothing that can disagree with the stream beneath it.
 */
export function ActorBand({ entries }: { entries: AuditEntry[] }) {
  const changes = entries.filter((e) => e.nature !== 'read');
  const reads = entries.length - changes.length;

  const byActor = new Map<string, number>();
  for (const e of changes) byActor.set(e.actor, (byActor.get(e.actor) ?? 0) + 1);
  const actors = [...byActor.entries()]
    .map(([name, count]) => ({ name, count, share: (count / Math.max(changes.length, 1)) * 100 }))
    .sort((a, b) => b.count - a.count);

  const top = actors[0];
  const reasoned = changes.filter((e) => (e.reason ?? '').trim().length > 0).length;

  return (
    <section aria-labelledby="audit-operators">
      <SectionHeading
        id="audit-operators"
        title="Operators"
        note="Who made the changes."
        align="left"
      />

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Share of changes" variant="elevated">
          {actors.length === 0 ? (
            <p className="t-body" style={{ color: 'var(--text-secondary)' }}>
              No operator changed anything in the window.
            </p>
          ) : (
            <ul className="m-0 grid list-none gap-4 p-0">
              {actors.slice(0, 6).map((a) => (
                <li
                  key={a.name}
                  className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3.5"
                >
                  <InitialsTile name={a.name} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="t-compact truncate" style={{ color: 'var(--text-primary)' }}>
                        {a.name}
                      </span>
                      <span
                        className="shrink-0 tabular-nums"
                        style={{
                          font: '500 var(--type-chip)/1 var(--font-mono)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {a.count.toLocaleString('en-KE')} · {Math.round(a.share)}%
                      </span>
                    </div>
                    {/* The track is always drawn so the fill has a scale to be
                        read against; 60% and 100% look alike when each bar is
                        the widest thing in its own row. */}
                    <div
                      className="mt-2 h-1 w-full overflow-hidden rounded-full"
                      style={{ background: 'var(--surface-inset)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(a.share, 1.5)}%`,
                          background: 'var(--ink-400)',
                        }}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="In the window" variant="elevated">
          <div className="grid">
            <Figure label="Operators who changed something" value={actors.length} strong />
            {top ? (
              <Figure
                label="Busiest"
                value={`${Math.round(top.share)}%`}
                tone={actors.length > 1 && top.share >= 90 ? 'warning' : 'default'}
                note={`${top.name} made ${top.count.toLocaleString('en-KE')} of ${changes.length.toLocaleString('en-KE')}. One operator at or near every change is a finding, not a statistic.`}
              />
            ) : null}
            <Figure
              label="Changes with a stated reason"
              value={
                reasoned === changes.length
                  ? `All ${changes.length}`
                  : `${reasoned} of ${changes.length}`
              }
              note="Only changes whose intent cannot be read from the change itself require one."
            />
            <Figure
              label="Audited reads"
              value={reads.toLocaleString('en-KE')}
              tone="muted"
              note="Kept out of the share above: they count attention, not action."
            />
          </div>
        </Panel>
      </div>
    </section>
  );
}

export function ActorBandSkeleton() {
  return (
    <SkeletonGroup label="Loading operators" className="block">
      <SkeletonSectionHeading align="right" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel title="Share of changes" variant="elevated">
          <div className="grid gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3.5">
                <SkeletonBar width={28} height={28} radius="rounded-panel" />
                <div>
                  <SkeletonBar width={`${52 - i * 7}%`} height={13} />
                  <SkeletonBar width="100%" height={4} radius="rounded-full" className="mt-2" />
                </div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="In the window" variant="elevated">
          <div className="grid gap-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between">
                <SkeletonBar width={`${60 - i * 7}%`} height={13} />
                <SkeletonBar width={48} height={16} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </SkeletonGroup>
  );
}
