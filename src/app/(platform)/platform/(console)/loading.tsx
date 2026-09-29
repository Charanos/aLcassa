import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader } from '@/components/primitives/Skeleton';
import { QueueSkeleton } from '@/components/console/overview/YourQueue';
import { PlatformTelemetrySkeleton } from '@/components/console/overview/PlatformTelemetry';
import { LastActionsSkeleton } from '@/components/console/overview/LastActions';
import { RevenueBandSkeleton } from '@/components/console/overview/RevenueBand';
import { PortfolioBandSkeleton } from '@/components/console/overview/PortfolioBand';
import { OperationsBandSkeleton } from '@/components/console/overview/OperationsBand';

/**
 * Overview's loading state.
 *
 * ⚠ ITS LINE COUNT IS LOW ON PURPOSE AND THAT IS NOT A DEFECT. Doc 21 ranked
 * skeletons by lines-against-page and put this one near the bottom at 0.13 —
 * but almost every shape here is owned by the component it stands in for and
 * imported, which is the better arrangement and the one the metric punishes. A
 * skeleton living beside its component changes when the component changes; one
 * written out here drifts the first time somebody edits the real thing.
 *
 * Re-reading it by eye rather than by number turned up two real faults, which
 * is what the audit asked for:
 *
 * ⚠ 1 · THE SITUATION SLAB WAS DRAWN AS FOUR SMALL METRIC TILES. The page
 * opens on a full-bleed inverse-chrome section — a briefing column with a 38px
 * display headline and a row of signal cards, beside a chart column — and the
 * skeleton drew a 2×2 grid of little boxes roughly a fifth of its height. This
 * is the first thing on the screen and it was the least like itself.
 *
 * ⚠ 2 · `RevenueBand` HAD NO SKELETON AT ALL. The note below explains that the
 * lower bands are here so the page does not grow when data lands; it covered
 * two of the three. The band exists now, beside its component.
 *
 * Sheet 13: skeletons pulse, they do not sweep, and only where a real request
 * is outstanding.
 */
export default function OverviewLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading overview" className="block">
        <SkeletonHeader withAction />

        {/*
          ⚠ THE SLAB IS DARK WHILE IT LOADS, BECAUSE IT IS DARK WHEN IT ARRIVES.
          A pale skeleton that resolves into an inverse-chrome section is two
          different pages in sequence. The bars inside it are lightened against
          the slab rather than tinted from `--surface-inset`, which would be
          invisible on this ground.
        */}
        <section
          className="relative mt-6 overflow-hidden rounded-card"
          style={{
            background: 'var(--chrome-bg-base)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: 'var(--shadow-lg)',
          }}
          aria-hidden
        >
          <div className="flex flex-col lg:flex-row">
            {/* Briefing column: eyebrow, display headline, signal cards. */}
            <div className="flex flex-1 flex-col justify-between p-8 lg:p-12 lg:pr-8">
              <div>
                <Invert w="96px" h={11} />
                <Invert w="min(32ch, 100%)" h={38} className="mt-4" />
                <Invert w="min(24ch, 86%)" h={38} className="mt-2.5" />
              </div>
              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i}>
                    <Invert w="84px" h={10} />
                    <Invert w="128px" h={30} className="mt-3.5" />
                    <Invert w="90%" h={12} className="mt-3" />
                  </div>
                ))}
              </div>
            </div>

            {/* Chart column. One block at the chart's height. */}
            <div className="flex-1 p-8 lg:py-12 lg:pr-12 lg:pl-8">
              <Invert w="100%" h={300} radius="rounded-overlay" />
            </div>
          </div>
        </section>

        {/* ── "Command & Telemetry", right-aligned, then the queue + rail ── */}
        <div className="mb-6 md:mt-24">
          <div className="flex flex-col items-end">
            <Bar w="228px" h={20} />
            <Bar w="min(58ch, 100%)" h={12} className="mt-2.5" />
          </div>
        </div>
        <div className="mb-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          {/*
            ⚠ THE QUEUE'S OWN SKELETON, NOT A GENERIC ROW. 03 §15 requires
            identical dimensions to the real thing, and a queue card is a
            three-line article with a badge and two controls — nothing like the
            data-grid row this used to draw.
          */}
          <QueueSkeleton />
          {/*
            ⚠ THE RAIL'S OWN SKELETONS TOO, and it is sticky on the real page.
            Two generic panels were standing in for a four-row telemetry table
            and a five-row audit tail.
          */}
          <div className="grid gap-6">
            <PlatformTelemetrySkeleton />
            <LastActionsSkeleton />
          </div>
        </div>
      </SkeletonGroup>

      {/*
        ⚠ THE LOWER BANDS TOO. Without them the page painted its header, slab,
        queue and rail at full height and then GREW by three more bands when the
        data landed — a scroll position that moves under the reader on every
        load. Each band mirrors its own grid, and each skeleton lives beside the
        band it belongs to.
      */}
      <RevenueBandSkeleton />
      <PortfolioBandSkeleton />
      <OperationsBandSkeleton />
    </ConsolePage>
  );
}

/** A bar on the page's own ground. */
function Bar({
  w,
  h,
  className = '',
  radius = 'rounded-chip',
}: {
  w: string;
  h: number;
  className?: string;
  radius?: string;
}) {
  return (
    <div
      className={`animate-[skeleton-pulse_1400ms_ease-in-out_infinite] ${radius} motion-reduce:animate-none motion-reduce:opacity-70 ${className}`}
      style={{ width: w, height: h, background: 'var(--surface-inset)' }}
    />
  );
}

/** A bar on the inverse slab, lightened rather than tinted. */
function Invert({
  w,
  h,
  className = '',
  radius = 'rounded-chip',
}: {
  w: string;
  h: number;
  className?: string;
  radius?: string;
}) {
  return (
    <div
      className={`animate-[skeleton-pulse_1400ms_ease-in-out_infinite] ${radius} motion-reduce:animate-none motion-reduce:opacity-70 ${className}`}
      style={{ width: w, height: h, background: 'rgba(255,255,255,0.07)' }}
    />
  );
}
