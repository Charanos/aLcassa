import { ConsolePage } from '@/components/console/Surface';
import {
  SkeletonGroup,
  SkeletonHeader,
  SkeletonMetric,
  SkeletonBlock,
  SkeletonPanel,
} from '@/components/primitives/Skeleton';

export default function HealthLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading platform health" className="flex flex-col gap-5">
        <SkeletonHeader />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetric key={i} />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <SkeletonBlock height={220} />
          <SkeletonBlock height={220} />
        </div>
        <SkeletonPanel lines={5} />
      </SkeletonGroup>
    </ConsolePage>
  );
}
