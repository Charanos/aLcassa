import { ConsolePage } from '@/components/console/Surface';
import {
  SkeletonGroup,
  SkeletonHeader,
  SkeletonMetric,
} from '@/components/primitives/Skeleton';
import { QueueSkeleton } from '@/components/console/overview/YourQueue';
import { PlatformTelemetrySkeleton } from '@/components/console/overview/PlatformTelemetry';
import { LastActionsSkeleton } from '@/components/console/overview/LastActions';

/**
 * Overview's loading state. Mirrors the real layout: a header, the inverted
 * signal band (four SkeletonMetric tiles), the queue as a column of rows at
 * 1.9fr, and a right rail of reference panels at 1fr. Sheet 13: skeletons
 * pulse, they do not sweep, and only where a real request is outstanding.
 */
export default function OverviewLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading overview" className="flex flex-col gap-7">
        <SkeletonHeader withAction />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetric key={i} />
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.9fr_1fr]">
          {/*
            ⚠ THE QUEUE'S OWN SKELETON, NOT A GENERIC ROW. 03 §15 requires
            identical dimensions to the real thing, and a queue card is a
            three-line article with a badge and two controls — nothing like the
            data-grid row this used to draw. A skeleton of the wrong shape is a
            layout shift with extra steps.
          */}
          <QueueSkeleton />
          {/*
            ⚠ THE RAIL'S OWN SKELETONS TOO. Two generic panels were standing in
            for a four-row telemetry table and a five-row audit tail — the same
            wrong-shape problem the queue had, on the column beside it.
          */}
          <div className="flex flex-col gap-4">
            <PlatformTelemetrySkeleton />
            <LastActionsSkeleton />
          </div>
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
