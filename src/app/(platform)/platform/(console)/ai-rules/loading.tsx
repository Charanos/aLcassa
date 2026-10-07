import { ConsolePage } from '@/components/console/Surface';
import { FactStripSkeleton } from '@/components/console/FactStrip';
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonPanel,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';

/** Match the rules skeleton to the editor and version-history columns. */
export default function AiRulesLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading AI rules" className="flex flex-col">
        <SkeletonHeader withAction />
        <FactStripSkeleton />
        <SkeletonSectionHeading align="right" />
        <SkeletonBlock height={520} className="rounded-card" />
        <SkeletonSectionHeading align="left" />
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <SkeletonPanel lines={5} />
          <SkeletonPanel lines={3} />
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
