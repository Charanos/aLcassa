import { ConsolePage } from '@/components/console/Surface';
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonPanel,
} from '@/components/primitives/Skeleton';
import { HeadroomBandSkeleton } from '@/components/console/plans/HeadroomBand';

/** Match the plans skeleton to the comparison table, supporting rail and headroom cards. */
export default function PlansLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading plans and entitlements" className="flex flex-col">
        <SkeletonHeader />

        <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <SkeletonBlock height={420} className="rounded-slab" />
          <div className="grid gap-4">
            <SkeletonPanel lines={4} />
            <SkeletonPanel lines={3} />
          </div>
        </div>
      </SkeletonGroup>

      <HeadroomBandSkeleton />
    </ConsolePage>
  );
}
