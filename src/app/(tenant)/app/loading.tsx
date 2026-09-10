import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonMetric,
  SkeletonPanel,
} from '@/components/primitives/Skeleton';

/**
 * 03 §15: skeleton rows matching the real layout, never a spinner over the
 * grid.
 *
 * ⚠ THIS FILE HAD DRIFTED OUT OF SYNC WITH THE PAGE IT STANDS IN FOR, which
 * is the one failure mode a skeleton has. It described the overview as it was
 * BEFORE the dashboard rebuild — three stat tiles, then two panels — while
 * the page now renders a masthead, FOUR tiles, a 30-day chart, a two-column
 * queue-and-sidebar row and the activity list.
 *
 * A skeleton whose shape does not match causes the exact jolt it exists to
 * prevent: the reader settles on a three-column rhythm, the real content
 * arrives in four, and everything below jumps. The rule in 03 §15 is
 * "identical dimensions to the real thing" for that reason, and a skeleton is
 * the easiest file in a codebase to forget when the page beside it changes.
 * If `OverviewPage` gains or loses a section, this changes with it.
 */
export default function OverviewLoading() {
  return (
    <SkeletonGroup label="Loading overview" className="grid gap-5">
      {/* Masthead: eyebrow, display greeting, summary line, two actions. */}
      <SkeletonHeader withAction />

      {/* Four stat tiles on the same auto-fit track the real row uses, so the
          wrap point is identical at every width. */}
      <div
        className="grid gap-3.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(212px, 1fr))' }}
      >
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </div>

      {/* Conversation volume. 220px is the chart's own height — see
          `VolumeChart`'s default — so the fold below it does not move. */}
      <SkeletonBlock height={220} />

      {/* Queue beside channels and meters, at the real breakpoint. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.95fr)]">
        <SkeletonPanel lines={5} />
        <div className="grid gap-4">
          <SkeletonPanel lines={4} />
          <SkeletonPanel lines={3} />
        </div>
      </div>

      {/*
        ⚠ NO CHECKLIST SKELETON, DELIBERATELY. The setup checklist renders
        only while setup is unfinished and vanishes permanently once it is
        done — so for most readers on most visits there is nothing there.
        Reserving space for it would make the majority case flash an empty
        band; not reserving it costs the minority case one shift on a screen
        they see for a few days. The rule is one screenful, and this is the
        screenful almost everybody gets.
      */}
      <SkeletonPanel lines={4} />
    </SkeletonGroup>
  );
}
