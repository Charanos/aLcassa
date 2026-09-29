import { ConsolePage } from '@/components/console/Surface';
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonPanel,
} from '@/components/primitives/Skeleton';
import { HeadroomBandSkeleton } from '@/components/console/plans/HeadroomBand';

/**
 * Plans and entitlements, loading.
 *
 * ⚠ THE GRID WAS RIGHT AND THE CONTENT WAS NOT. The page is
 * `[minmax(0,1fr)_320px]` — a comparison table on the left, a rail on the
 * right — and then a row of headroom cards beneath the whole thing, which the
 * skeleton omitted entirely. Those cards are ~420px tall each, so the page grew
 * by most of a viewport after it had already been painted.
 *
 * The left block matches the table's `rounded-slab` rather than the default
 * chip radius: at 32px the difference is visible, and a corner that changes
 * shape on arrival reads as a different element replacing the first one.
 *
 * ⚠ AND THE HEADROOM CARDS WERE STILL WRONG IN TWO WAYS after that fix, both
 * only findable by reading the band itself. It opens with a right-aligned
 * `SectionHeading` carrying a note and a link — around 100px this did not
 * reserve, so every card arrived higher than it was drawn. And its grid is
 * `auto-fit, minmax(280px, 1fr)` while this hardcoded `lg:grid-cols-3`, which
 * agrees at wide desktop and at no other width.
 *
 * The band owns its skeleton now, so both stay true when it changes.
 */
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
