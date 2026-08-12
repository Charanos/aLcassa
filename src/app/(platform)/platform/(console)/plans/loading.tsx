import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader, SkeletonPanel, SkeletonBlock } from '@/components/primitives/Skeleton';

export default function PlansLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading plans and entitlements" className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="col-span-full">
          <SkeletonHeader />
        </div>
        <SkeletonBlock height={340} />
        <SkeletonPanel lines={5} />
      </SkeletonGroup>
    </ConsolePage>
  );
}
