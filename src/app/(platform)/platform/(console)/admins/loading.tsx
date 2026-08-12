import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader, SkeletonRow } from '@/components/primitives/Skeleton';

export default function AdminsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading admins" className="flex flex-col gap-2.5">
        <SkeletonHeader withAction />
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </SkeletonGroup>
    </ConsolePage>
  );
}
