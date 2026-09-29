import { ConsolePage } from '@/components/console/Surface';
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonPanel,
} from '@/components/primitives/Skeleton';

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

        {/* The headroom cards. Three plans, each a card of bars. */}
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} height={400} className="rounded-slab" />
          ))}
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
