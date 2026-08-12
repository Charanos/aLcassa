import { ConsolePage } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonHeader, SkeletonPanel } from '@/components/primitives/Skeleton';

export default function AiRulesLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading AI rules" className="flex flex-col gap-4">
        <SkeletonHeader withAction />
        <SkeletonPanel lines={4} />
        <SkeletonPanel lines={4} />
        <SkeletonPanel lines={3} />
      </SkeletonGroup>
    </ConsolePage>
  );
}
