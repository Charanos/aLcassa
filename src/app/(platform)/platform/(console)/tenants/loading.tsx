import { ConsolePage } from '@/components/console/Surface';
import {
  SkeletonFilterBar,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonRibbon,
  SkeletonTable,
} from '@/components/primitives/Skeleton';

/**
 * Workspaces, loading.
 *
 * ⚠ IT DREW FOUR LIGHT TILES WHERE THE SCREEN HAS A DARK RIBBON, AND NO FILTER
 *   BAR AT ALL.
 *
 * Two separate failures of 03 §15's "identical dimensions" rule. The ribbon is
 * the inverted slab — four stats on near-black — so the swap flashed the top
 * third of the viewport from near-white to near-black. And the filter bar,
 * about 56px of search box and chips, simply was not drawn, so everything below
 * it jumped up by that much the moment the data landed.
 *
 * The rows were the third: `SkeletonRow` draws free-standing cards, and this
 * screen renders a table inside one rounded container.
 */
export default function TenantsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading workspaces" className="flex flex-col gap-6">
        <SkeletonHeader withAction />
        <SkeletonRibbon />
        <SkeletonFilterBar />
        <SkeletonTable rows={8} columns={5} />
      </SkeletonGroup>
    </ConsolePage>
  );
}
