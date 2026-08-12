import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader, SkeletonRow } from '@/components/primitives/Skeleton';

export default function SupportSessionsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading support sessions" className="flex flex-col gap-2.5">
        <SkeletonHeader />
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </SkeletonGroup>
    </ConsolePage>
  );
}
