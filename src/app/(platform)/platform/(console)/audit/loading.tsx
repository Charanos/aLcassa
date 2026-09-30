import { ConsolePage } from '@/components/console/Surface';
import { SkeletonBar, SkeletonGroup } from '@/components/primitives/Skeleton';
import { VolumeBandSkeleton } from '@/components/console/audit/VolumeBand';
import { ActorBandSkeleton } from '@/components/console/audit/ActorBand';
import { AuditStreamSkeleton } from '@/components/console/AuditStream';
import { FactStripSkeleton } from '@/components/console/FactStrip';

/**
 * Audit log, loading.
 *
 * ⚠ IT COMPOSES; IT DOES NOT DRAW. Doc 22 §6. Each band exports its own
 * skeleton beside itself, so when a band changes its skeleton changes with it.
 * The version this replaced had been rebuilt by hand a week earlier and was
 * already wrong again: the page it described had different panel titles,
 * different column splits, and no integrity strip.
 */
export default function AuditLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading the audit log" className="block">
        <div className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-8">
          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center gap-2">
              <SkeletonBar width={138} height={22} radius="rounded-full" />
              <SkeletonBar width={82} height={22} radius="rounded-full" />
            </div>
            <SkeletonBar width={120} height={10} />
            <SkeletonBar width={200} height={38} className="mt-2.5" />
          </div>
          <SkeletonBar width={104} height={36} radius="rounded-full" />
        </div>

        <FactStripSkeleton />
      </SkeletonGroup>

      <VolumeBandSkeleton />
      <ActorBandSkeleton />
      <AuditStreamSkeleton />
    </ConsolePage>
  );
}
