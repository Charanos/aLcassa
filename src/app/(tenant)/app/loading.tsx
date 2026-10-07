import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonMetric,
  SkeletonPanel,
} from '@/components/primitives/Skeleton';

/** Match skeleton geometry to the overview to limit layout shifts. */
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

      {/* Omit checklist space when onboarding is complete; reserve skeleton space for persistent overview sections. */}
      <SkeletonPanel lines={4} />
    </SkeletonGroup>
  );
}
