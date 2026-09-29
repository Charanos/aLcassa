import { ConsolePage } from '@/components/console/Surface';
import { SkeletonBar, SkeletonGroup } from '@/components/primitives/Skeleton';
import { StatusSlabSkeleton } from '@/components/console/health/StatusSlab';
import { ServicesBandSkeleton } from '@/components/console/health/ServicesBand';
import { IsolationBandSkeleton } from '@/components/console/health/IsolationBand';
import { PerformanceBandSkeleton } from '@/components/console/health/PerformanceBand';
import { QueuesIncidentsBandSkeleton } from '@/components/console/health/QueuesIncidentsBand';

/**
 * Health, loading.
 *
 * ⚠ IT COMPOSES; IT DOES NOT DRAW. Doc 22 §6: a component that renders a
 * distinct shape exports its own skeleton, next to itself, so the skeleton
 * changes when the component does. Every band on this page owns one. What is
 * drawn here is only the header, because `ConsoleHeader` is shared by every
 * console page and has no single band to live beside.
 */
export default function HealthLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading platform health" className="block">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-8">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2">
              <SkeletonBar width={138} height={22} radius="rounded-full" />
              <SkeletonBar width={64} height={22} radius="rounded-full" />
            </div>
            <SkeletonBar width={128} height={10} />
            <SkeletonBar width={148} height={38} className="mt-2.5" />
          </div>
          <SkeletonBar width={232} height={36} radius="rounded-full" />
        </div>
      </SkeletonGroup>

      <StatusSlabSkeleton />
      <ServicesBandSkeleton />
      <IsolationBandSkeleton />
      <PerformanceBandSkeleton />
      <QueuesIncidentsBandSkeleton />
    </ConsolePage>
  );
}
