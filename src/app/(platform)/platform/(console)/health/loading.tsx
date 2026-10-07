import { ConsolePage } from '@/components/console/Surface';
import { FactStripSkeleton } from '@/components/console/FactStrip';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';
import { IsolationBandSkeleton } from '@/components/console/health/IsolationBand';

/** Preserve the measured Health hero and chart hierarchy while records resolve. */
export default function HealthLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading platform health" className="block">
        <SkeletonHeader withAction />
        <section className="console-fact-strip block overflow-hidden" aria-hidden>
          <div className="relative z-10 grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:p-10">
            <div className="min-w-0">
              <SkeletonBar inverse width="40%" height={11} />
              <SkeletonBar inverse width="95%" height={38} className="mt-5" />
              <SkeletonBar inverse width="76%" height={38} className="mt-3" />
              <SkeletonBar inverse width="92%" height={14} className="mt-5" />
              <SkeletonBar inverse width="64%" height={14} className="mt-2" />
              <SkeletonBar inverse width={132} height={36} radius="rounded-full" className="mt-6" />
            </div>
            <div className="min-w-0 self-end">
              <SkeletonBar inverse width="55%" height={12} />
              <SkeletonBar inverse width={100} height={38} className="mt-3" />
              <SkeletonBar inverse height={176} radius="rounded-panel" className="mt-6" />
              <SkeletonBar inverse width="70%" height={12} className="mt-4" />
            </div>
          </div>
          <FactStripSkeleton />
        </section>
      </SkeletonGroup>
      <IsolationBandSkeleton />
      <SkeletonGroup label="Loading recorded activity" className="block">
        <SkeletonSectionHeading />
        <SkeletonBar height={300} radius="rounded-card" />
      </SkeletonGroup>
      <SkeletonGroup label="Loading service monitoring" className="block">
        <SkeletonSectionHeading align="right" />
        <div className="grid gap-5 xl:grid-cols-2">
          {[0, 1, 2, 3].map((key) => (
            <SkeletonBar key={key} height={240} radius="rounded-card" />
          ))}
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
