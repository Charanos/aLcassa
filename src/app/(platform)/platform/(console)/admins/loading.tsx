import { ConsolePage } from '@/components/console/Surface';
import { SkeletonBar, SkeletonGroup } from '@/components/primitives/Skeleton';
import { FactStripSkeleton } from '@/components/console/FactStrip';
import { OperatorsBandSkeleton } from '@/components/console/admins/OperatorsBand';
import { CapabilitiesBandSkeleton } from '@/components/console/admins/CapabilitiesBand';

/**
 * Admins, loading. Composes the bands' own skeletons (doc 22 §6); draws only
 * the shared header, which has no single band to live beside.
 */
export default function AdminsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading platform operators" className="block">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-8">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2">
              <SkeletonBar width={138} height={22} radius="rounded-full" />
              <SkeletonBar width={68} height={22} radius="rounded-full" />
            </div>
            <SkeletonBar width={128} height={10} />
            <SkeletonBar width={150} height={38} className="mt-2.5" />
          </div>
          <div className="flex flex-col items-end gap-2">
            <SkeletonBar width={132} height={36} radius="rounded-full" />
            <SkeletonBar width={220} height={11} />
          </div>
        </div>
        <FactStripSkeleton />
      </SkeletonGroup>
      <OperatorsBandSkeleton />
      <CapabilitiesBandSkeleton />
    </ConsolePage>
  );
}
