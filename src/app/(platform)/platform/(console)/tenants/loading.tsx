import { ConsolePage } from '@/components/console/Surface';
import {
  SkeletonFilterBar,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonRibbon,
  SkeletonBar,
} from '@/components/primitives/Skeleton';

/** Match the default grid, retaining its KPI and filter positions. */
export default function TenantsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading workspaces" className="flex flex-col gap-6">
        <SkeletonHeader withAction />
        <SkeletonRibbon />
        <SkeletonFilterBar />
        <div aria-hidden className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="min-w-0 rounded-card border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 sm:p-6"
            >
              <SkeletonBar width="72%" height={18} />
              <SkeletonBar width="54%" height={12} className="mt-3" />
              <div className="mt-6 grid grid-cols-2 gap-4">
                <SkeletonBar height={74} radius="rounded-panel" />
                <SkeletonBar height={74} radius="rounded-panel" />
              </div>
              <div className="mt-6 border-t border-[var(--border-subtle)] pt-4">
                <SkeletonBar width="52%" height={20} />
              </div>
            </div>
          ))}
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
