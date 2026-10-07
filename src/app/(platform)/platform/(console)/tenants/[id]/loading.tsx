import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonBar, SkeletonPanel } from '@/components/primitives/Skeleton';
import { FactStripSkeleton } from '@/components/console/FactStrip';

/**
 * Mirrors the workspace detail page: breadcrumb, title row, the tab strip
 * (six tabs, same widths as `TABS` in `tenants/[id]/page.tsx`), then the
 * Overview tab's own shape — four metric tiles and a specs panel — since
 * that is the tab every fresh navigation lands on.
 */
export default function WorkspaceDetailLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading workspace" className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <span
            aria-hidden
            className="h-3 w-40 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-chip motion-reduce:animate-none motion-reduce:opacity-70"
            style={{ background: 'var(--surface-sunken)' }}
          />
          <SkeletonBar width="min(18rem, 100%)" height={28} />
        </div>

        <div
          className="flex gap-3 overflow-hidden border-b pb-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {[72, 64, 56, 76, 68, 68].map((width, i) => (
            <span
              key={i}
              aria-hidden
              className="mb-2.5 h-6 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-chip motion-reduce:animate-none motion-reduce:opacity-70"
              style={{ width, background: 'var(--surface-sunken)' }}
            />
          ))}
        </div>

        <FactStripSkeleton />
        <SkeletonPanel lines={5} />
      </SkeletonGroup>
    </ConsolePage>
  );
}
