import { ConsolePage } from '@/components/console/Surface';
import { FactStripSkeleton } from '@/components/console/FactStrip';
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonPanel,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';

/**
 * Master AI rules, loading.
 *
 * ⚠ THREE STACKED PANELS WHERE THE SCREEN IS A TWO-COLUMN GRID. The real
 * layout is `[minmax(0,1fr)_320px]`: the six-field rule set on the left, a
 * version rail and an inheritance panel on the right. Stacking three
 * full-width panels made the skeleton roughly twice the height of the thing it
 * stands in for, so the page collapsed upward on arrival rather than settling.
 *
 * The left block is one tall bone rather than six small ones: the fields are
 * prose of unknown length, and six equal rectangles would claim a regularity
 * the real content does not have.
 */
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
