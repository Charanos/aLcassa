import { ConsolePage } from '@/components/console/Surface';
import { FactStripSkeleton } from '@/components/console/FactStrip';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonPanel,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';

/** Inside a workspace: header, the support notice, facts, usage, people. */
export default function InsideLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Opening the workspace" className="block">
        <SkeletonHeader />
        <SkeletonBar width="100%" height={56} radius="rounded-card" className="mb-8" />
        <FactStripSkeleton />
        <SkeletonSectionHeading />
        <SkeletonPanel lines={4} />
        <SkeletonSectionHeading />
        <div className="grid gap-5 lg:grid-cols-2">
          <SkeletonPanel lines={5} />
          <SkeletonPanel lines={3} />
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
