import { Mark } from '@/components/brand/Mark';
import { SkeletonBar, SkeletonGroup } from '@/components/primitives/Skeleton';

/** No account or workspace information is exposed before the authenticated shell resolves. */
export function WorkspaceLoading({ label }: { label: string }) {
  return (
    <main
      id="main"
      className="min-h-dvh bg-[var(--surface-base)] px-5 py-10 text-[var(--text-primary)] sm:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-center gap-3">
          <Mark size={32} />
          <p className="t-compact">{label}…</p>
        </div>
        <SkeletonGroup label={label} className="grid min-w-0 gap-6">
          <SkeletonBar width="min(18rem, 90%)" height={34} />
          <SkeletonBar width="min(30rem, 95%)" height={14} />
          <SkeletonBar height={240} radius="rounded-card" />
          <div className="grid gap-5 sm:grid-cols-2">
            <SkeletonBar height={160} radius="rounded-card" />
            <SkeletonBar height={160} radius="rounded-card" />
          </div>
        </SkeletonGroup>
      </div>
    </main>
  );
}
