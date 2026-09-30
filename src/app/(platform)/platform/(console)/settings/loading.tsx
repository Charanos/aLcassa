import { ConsolePage } from '@/components/console/Surface';
import { FactStripSkeleton } from '@/components/console/FactStrip';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonHeader,
  SkeletonPanel,
} from '@/components/primitives/Skeleton';

/** The page's own shape: header, fact strip, tab rail, two sections. */
export default function SettingsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading settings" className="block">
        <SkeletonHeader />
        <FactStripSkeleton />
        <div className="mt-10 grid gap-6 lg:grid-cols-[188px_minmax(0,1fr)] lg:gap-8">
          <div className="flex gap-1 overflow-hidden lg:grid lg:content-start lg:gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonBar
                key={i}
                width={i === 0 ? 120 : 104}
                height={36}
                radius="rounded-panel"
                className="shrink-0"
              />
            ))}
          </div>
          <div className="grid min-w-0 gap-5">
            <SkeletonPanel lines={4} />
            <SkeletonPanel lines={2} />
          </div>
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
