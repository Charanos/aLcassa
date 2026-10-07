import { ConsolePage } from '@/components/console/Surface';
import { FactStripSkeleton } from '@/components/console/FactStrip';
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';

export default function RevenueLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading subscription value" className="flex flex-col">
        <SkeletonHeader withAction />
        <SkeletonBlock height={112} className="mb-8" />
        <FactStripSkeleton />
        <SkeletonSectionHeading />
        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <SkeletonBlock height={340} className="rounded-card" />
          <SkeletonBlock height={340} className="rounded-card" />
        </div>
        <SkeletonSectionHeading />
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <SkeletonBlock height={300} className="rounded-card" />
          <SkeletonBlock height={300} className="rounded-card" />
        </div>
        <SkeletonSectionHeading />
        <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
          <SkeletonBlock height={320} className="rounded-card" />
          <SkeletonBlock height={320} className="rounded-card" />
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
