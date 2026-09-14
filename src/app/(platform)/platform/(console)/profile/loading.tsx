import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader } from '@/components/primitives/Skeleton';
import { ProfileSkeleton } from '@/components/console/profile/skeletons';

/**
 * ⚠ THE SKELETON NOW MIRRORS THE PAGE IT STANDS IN FOR.
 *
 * This route previously rendered `SkeletonHeader` over a four-line panel and a
 * three-line panel — a single column of two boxes, in front of a two-column
 * grid of four cards. The dimensions did not match on either axis, so the
 * hand-off from skeleton to content moved the whole layout, which is the one
 * thing a skeleton exists to prevent. 03 §15.
 *
 * The bones live beside the components they imitate, in
 * `components/console/profile/skeletons.tsx`, so a change to a card's geometry
 * and a change to its skeleton are adjacent in the tree rather than a page
 * directory apart. 18 §2.
 */
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
