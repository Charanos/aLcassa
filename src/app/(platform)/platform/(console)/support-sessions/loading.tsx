import { ConsolePage } from '@/components/console/Surface';
import { FactStripSkeleton } from '@/components/console/FactStrip';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';

/** The register's own shape: header, fact strip, filters, day-grouped visits. */
export default function SupportSessionsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading support sessions" className="block">
        <SkeletonHeader withAction />
        <FactStripSkeleton />
        <SkeletonSectionHeading />
        <div className="flex flex-wrap gap-1.5">
          {[48, 56, 64, 72, 60, 80].map((w, i) => (
            <SkeletonBar key={i} width={w} height={32} radius="rounded-full" />
          ))}
        </div>
        <div className="mt-6 grid gap-6">
          {[3, 2].map((rows, g) => (
            <div key={g}>
              <SkeletonBar width={140} height={10} />
              <div
                className="mt-3 overflow-hidden rounded-card"
                style={{
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-raised)',
                }}
              >
                {Array.from({ length: rows }).map((_, i) => (
                  <div
                    key={i}
                    className="grid gap-3 px-5 py-4 md:grid-cols-[64px_minmax(0,1fr)_132px_120px]"
                    style={{ borderTop: i ? '1px solid var(--border-subtle)' : undefined }}
                  >
                    <SkeletonBar width={44} height={12} />
                    <div>
                      <SkeletonBar width="40%" height={12} />
                      <SkeletonBar width="78%" height={12} className="mt-2" />
                    </div>
                    <SkeletonBar width={80} height={12} />
                    <SkeletonBar width={72} height={20} radius="rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
