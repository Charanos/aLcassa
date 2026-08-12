import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader, SkeletonPanel } from '@/components/primitives/Skeleton';

export default function SettingsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading settings" className="flex flex-col gap-4">
        <SkeletonHeader />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className="h-8 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-chip motion-reduce:animate-none motion-reduce:opacity-70"
              style={{ width: 88, background: 'var(--surface-sunken)' }}
            />
          ))}
        </div>
        <SkeletonPanel lines={5} />
        <SkeletonPanel lines={3} />
      </SkeletonGroup>
    </ConsolePage>
  );
}
