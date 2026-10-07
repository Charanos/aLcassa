import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader, SkeletonBar } from '@/components/primitives/Skeleton';
import { QueueSkeleton } from '@/components/console/overview/YourQueue';
import { PlatformTelemetrySkeleton } from '@/components/console/overview/PlatformTelemetry';
import { LastActionsSkeleton } from '@/components/console/overview/LastActions';
import { RevenueBandSkeleton } from '@/components/console/overview/RevenueBand';
import { PortfolioBandSkeleton } from '@/components/console/overview/PortfolioBand';
import { OperationsBandSkeleton } from '@/components/console/overview/OperationsBand';

/** Match loading sections to the overview using the components' adjacent skeletons. */
export default function OverviewLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading overview" className="block">
        <SkeletonHeader withAction />

        {/* Use inverted skeleton colors to match the loaded KPI surface. */}
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
                <SkeletonBar inverse width="96px" height={11} />
                <SkeletonBar inverse width="min(32ch, 100%)" height={38} className="mt-4" />
                <SkeletonBar inverse width="min(24ch, 86%)" height={38} className="mt-2.5" />
              </div>
              <div className="mt-10 grid gap-6 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <div key={i}>
                    <SkeletonBar inverse width="84px" height={10} />
                    <SkeletonBar inverse width="128px" height={30} className="mt-3.5" />
                    <SkeletonBar inverse width="90%" height={12} className="mt-3" />
                  </div>
                ))}
              </div>
            </div>

            {/* Chart column. One block at the chart's height. */}
            <div className="flex-1 p-8 lg:py-12 lg:pr-12 lg:pl-8">
              <SkeletonBar inverse width="100%" height={300} radius="rounded-overlay" />
            </div>
          </div>
        </section>

        <div className="mb-6 md:mt-24">
          <div className="flex flex-col items-end">
            <SkeletonBar width="228px" height={20} />
            <SkeletonBar width="min(58ch, 100%)" height={12} className="mt-2.5" />
          </div>
        </div>
        <div className="mb-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
          {/* Use the queue card skeleton to preserve its article and action geometry. */}
          <QueueSkeleton />
          {/* Match the supporting rail to its telemetry and audit sections. */}
          <div className="grid gap-6">
            <PlatformTelemetrySkeleton />
            <LastActionsSkeleton />
          </div>
        </div>
      </SkeletonGroup>

      {/* Include the lower-section skeletons to avoid expanding the page after its initial render. */}
      <RevenueBandSkeleton />
      <PortfolioBandSkeleton />
      <OperationsBandSkeleton />
    </ConsolePage>
  );
}
