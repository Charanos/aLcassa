import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader, SkeletonPanel } from '@/components/primitives/Skeleton';

export default function ProfileLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading profile" className="flex flex-col gap-4">
        <SkeletonHeader />
        <SkeletonPanel lines={4} />
        <SkeletonPanel lines={3} />
      </SkeletonGroup>
    </ConsolePage>
  );
}
