import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader, SkeletonRow } from '@/components/primitives/Skeleton';

export default function AuditLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading audit stream" className="flex flex-col gap-2.5">
        <SkeletonHeader />
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </SkeletonGroup>
    </ConsolePage>
  );
}
