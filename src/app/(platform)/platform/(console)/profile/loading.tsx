import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader } from '@/components/primitives/Skeleton';
import { ProfileSkeleton } from '@/components/console/profile/skeletons';

/** Compose profile skeletons beside their corresponding cards to prevent layout drift. */
export default function ProfileLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading your profile" className="flex flex-col gap-6">
        <SkeletonHeader />
        <ProfileSkeleton />
      </SkeletonGroup>
    </ConsolePage>
  );
}
