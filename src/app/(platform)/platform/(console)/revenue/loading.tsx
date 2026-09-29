import { ConsolePage } from '@/components/console/Surface';
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonRibbon,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';

/**
 * Revenue, loading.
 *
 * ⚠ THE WORST OF THE FOUR: THE SKELETON WAS ABOUT A THIRD OF THE PAGE'S HEIGHT.
 *
 * It drew a header, four small tiles and two blocks. The screen is a header, a
 * ~300px dark KPI slab carrying five figures, a section heading (which alone is
 * `mt-24 mb-12`), a 1.5fr/1fr chart pair, a movement band, a second section
 * heading, and a 1.1fr/1.5fr pair below that. So the page roughly tripled in
 * height as it arrived — a scroll position that moves under the reader on every
 * single load, which is precisely what 03 §15's "identical dimensions to the
 * real thing" exists to prevent.
 *
 * The slab is `SkeletonRibbon` with five stats rather than four, and it is dark
 * because the slab is dark; a light stand-in flashed the whole band.
 */
export default function RevenueLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading revenue" className="flex flex-col">
        <SkeletonHeader withAction />

        <div className="mt-3">
          <SkeletonRibbon stats={5} />
        </div>

        <SkeletonSectionHeading align="right" />
        <div className="grid items-stretch gap-6 lg:grid-cols-[1.5fr_1fr]">
          <SkeletonBlock height={300} className="rounded-card" />
          <SkeletonBlock height={300} className="rounded-card" />
        </div>

        {/* The movement band: four figures in a row, on the page ground. */}
        <div className="mt-8 mb-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} height={96} className="rounded-card" />
          ))}
        </div>

        <SkeletonSectionHeading align="right" />
        <div className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_1.5fr]">
          <SkeletonBlock height={280} className="rounded-card" />
          <SkeletonBlock height={280} className="rounded-card" />
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
