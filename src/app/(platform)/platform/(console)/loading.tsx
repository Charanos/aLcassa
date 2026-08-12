import { ConsolePage } from '@/components/console/Surface';
import {
  SkeletonGroup,
  SkeletonHeader,
  SkeletonMetric,
  SkeletonRow,
  SkeletonPanel,
} from '@/components/primitives/Skeleton';

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
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <SkeletonPanel lines={4} />
            <SkeletonPanel lines={3} />
          </div>
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
