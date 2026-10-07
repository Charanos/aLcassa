import { AuditVolumeChart } from '../Charts';
import { BandLink, DataSource, Panel, SectionHeading } from '../Surface';
import { Figure } from '@/components/primitives/Figure';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';
import type { AuditVolumePoint } from '@/lib/console/data';

/**
 * VOLUME. Thirty Nairobi days of platform activity.
 *
 * ⚠ CHANGES AND READS ARE COUNTED APART, AND THE ACCENT GOES TO ONE OF THEM.
 *
 * Every service-role call is audited, reads included, and until 30 Sep 2026
 * two reads were recorded under change verbs. The band's headline was
 * "Platform actions: 297" over an accented "Bypassed Row Level Security: 287"
 * — the answer to a security reviewer's first question, and it was almost
 * entirely page views. The question is "which CHANGES bypassed row-level
 * security, and why", so that figure takes the accent, and reads are stated
 * plainly beside it as what they are.
 *
 * ⚠ EMPTY IS SAID ONCE, NOT DERIVED THREE WAYS. An empty window used to
 * produce "busiest 08-31 · 0", "Days with nothing: 30" and a note about quiet
 * weekends — three true-sounding statements about a month with nothing in it.
 */
export function VolumeBand({ points, live }: { points: AuditVolumePoint[]; live: boolean }) {
  const total = points.reduce((s, p) => s + p.total, 0);
  const reads = points.reduce((s, p) => s + p.reads, 0);
  const changes = total - reads;
  const support = points.reduce((s, p) => s + p.support, 0);
  /* The same arithmetic the chart stacks with, so the figure and the orange
     band agree to the unit. */
  const bypass = points.reduce(
    (s, p) => s + Math.max(0, Math.min(p.total - p.reads, p.serviceRole - p.reads)),
    0,
  );
  const quiet = points.filter((p) => p.total === 0).length;

  return (
    <section aria-labelledby="audit-volume">
      <SectionHeading
        id="audit-volume"
        title="Volume"
        note="Thirty Nairobi days of platform activity."
        action={
          <span className="flex flex-wrap items-center gap-3">
            <DataSource kind={live ? 'live' : 'designed'} />
            <BandLink href="/platform/support-sessions">Support sessions</BandLink>
          </span>
        }
      />

      {/* `items-start`: stretched to the taller figures panel, the chart panel
          carried a block of empty ground under the legend. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <Panel title="Activity per day" variant="elevated">
          <AuditVolumeChart data={points} />
        </Panel>

        <Panel title="In the window" variant="elevated">
          {total === 0 ? (
            <p className="t-body" style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}>
              Nothing was recorded in the last thirty days. No operator changed anything, and no
              read bypassed row-level security.
            </p>
          ) : (
            <div className="grid">
              <Figure
                label="Changes"
                value={changes.toLocaleString('en-KE')}
                strong
                note="Everything that altered a workspace, a plan, a rule or an operator."
              />
              {/*
                ⚠ THE ACCENT SITS HERE AND NOWHERE ELSE ON THIS SCREEN. 03 §4a
                gives one per surface, and this is the figure that earns it.
                It goes amber only when it is non-zero, so the colour means
                "there were some" rather than "this is the bypass row".
              */}
              <Figure
                label="Changes that bypassed RLS"
                value={bypass.toLocaleString('en-KE')}
                tone={bypass > 0 ? 'accent' : 'default'}
                note="Each carries the operator who made it and a stated reason."
              />
              <Figure
                label="Inside a support session"
                value={support.toLocaleString('en-KE')}
                note="Each one is also in the customer's own activity log."
              />
              <Figure
                label="Audited reads"
                value={reads.toLocaleString('en-KE')}
                tone="muted"
                note="Service-role reads — the watchlist, plan previews, support records. Recorded because every bypass is; nothing changed."
              />
              {quiet > 0 ? (
                <Figure
                  label="Days with nothing"
                  value={quiet}
                  note="Drawn as zero, not as a gap."
                />
              ) : null}
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}

export function VolumeBandSkeleton() {
  return (
    <SkeletonGroup label="Loading volume" className="block">
      <SkeletonSectionHeading />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <Panel title="Activity per day" variant="elevated">
          <SkeletonBar width="100%" height={200} radius="rounded-overlay" />
          <div className="mt-3 flex gap-4">
            {[92, 64, 108, 168].map((w) => (
              <SkeletonBar key={w} width={w} height={10} />
            ))}
          </div>
        </Panel>
        <Panel title="In the window" variant="elevated">
          <div className="grid gap-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i}>
                <div className="flex justify-between">
                  <SkeletonBar width={`${58 - i * 6}%`} height={13} />
                  <SkeletonBar width={44} height={16} />
                </div>
                <SkeletonBar width="88%" height={11} className="mt-2" />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </SkeletonGroup>
  );
}
