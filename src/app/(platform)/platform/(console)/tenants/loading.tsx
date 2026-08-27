import { ConsolePage } from '@/components/console/Surface';
import {
  SkeletonGroup,
  SkeletonHeader,
  SkeletonMetric,
  SkeletonRow,
} from '@/components/primitives/Skeleton';

export default function TenantsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading workspaces" className="flex flex-col gap-4">
        <SkeletonHeader withAction />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonMetric key={i} />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </SkeletonGroup>
    </ConsolePage>
  );
}
