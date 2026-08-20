import { SkeletonGroup, SkeletonMetric, SkeletonPanel } from '@/components/primitives/Skeleton';

/** Mirrors the Overview page's shape: three stat tiles, the checklist panel,
 *  the activity panel. 03 §15: skeleton rows matching the column layout,
 *  never a spinner over the grid. */
export default function OverviewLoading() {
  return (
    <SkeletonGroup label="Loading overview" className="grid gap-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </div>
      <SkeletonPanel lines={5} />
      <SkeletonPanel lines={4} />
    </SkeletonGroup>
  );
}
