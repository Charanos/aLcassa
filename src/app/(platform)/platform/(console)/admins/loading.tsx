import { ConsolePage, Panel } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonBar } from '@/components/primitives/Skeleton';

/**
 * ⚠ THIS WAS A HEADER AND EIGHT IDENTICAL ROWS — fifteen lines in front of a
 *   459-line page, the worst ratio in the console.
 *
 * Admins renders a header with a lede and an inert invite control, a stack of
 * operator cards each with a 38px avatar and a capability summary, and then
 * two panels side by side: pending invitations, and the capability matrix with
 * its three narrow role columns. None of that is a row.
 *
 * 03 §15. The matrix in particular has to be right: it is a table of ticks and
 * dashes with fixed 58px columns, and a skeleton that draws full-width rows
 * there sets the page up to snap into a completely different shape.
 */
export default function AdminsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading platform operators" className="block">
        {/* ── Header, lede, and the inert invite control ───────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="min-w-0 flex-1">
            <SkeletonBar width="136px" height={11} />
            <SkeletonBar width="118px" height={26} className="mt-2" />
            <SkeletonBar width="min(66ch, 100%)" height={14} className="mt-3" />
            <SkeletonBar width="min(48ch, 84%)" height={14} className="mt-1.5" />
          </div>
          <SkeletonBar width="132px" height={36} radius="rounded-full" />
        </div>

        {/* The stated reason the control above is inert. 17 §6.4. */}
        <SkeletonBar width="min(74ch, 100%)" height={12} className="mt-3" />

        {/* ── Operator cards ───────────────────────────────────────────── */}
        <div className="mt-5 grid gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 rounded-overlay p-4"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
              }}
            >
              <SkeletonBar width="38px" height={38} radius="rounded-full" />
              <div className="min-w-0 flex-1">
                <SkeletonBar width={`${34 - (i % 3) * 5}%`} height={14} />
                <SkeletonBar width={`${52 - (i % 4) * 6}%`} height={12} className="mt-1.5" />
              </div>
              <SkeletonBar width="82px" height={20} radius="rounded-full" />
            </div>
          ))}
        </div>

        {/* ── Invitations and the capability matrix ────────────────────── */}
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
          <Panel title="Pending invitations" flush>
            <div className="grid gap-px" style={{ background: 'var(--border-subtle)' }}>
              {Array.from({ length: 2 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-3.5"
                  style={{ background: 'var(--surface-raised)' }}
                >
                  <SkeletonBar width="32px" height={32} radius="rounded-full" />
                  <div className="min-w-0 flex-1">
                    <SkeletonBar width="62%" height={13} />
                    <SkeletonBar width="40%" height={11} className="mt-1.5" />
                  </div>
                  <SkeletonBar width="54px" height={11} />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Role capabilities" flush>
            {/* Header row: a label column, then three 58px role columns. */}
            <div
              className="flex items-center gap-3 border-b px-5 py-2.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="flex-1" />
              {[0, 1, 2].map((i) => (
                <span key={i} className="grid w-[58px] place-items-center">
                  <SkeletonBar width="42px" height={10} />
                </span>
              ))}
            </div>
            <div className="grid gap-px" style={{ background: 'var(--border-subtle)' }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-5 py-2.5"
                  style={{ background: 'var(--surface-raised)' }}
                >
                  <span className="min-w-0 flex-1">
                    <SkeletonBar width={`${78 - (i % 5) * 8}%`} height={12} />
                  </span>
                  {[0, 1, 2].map((c) => (
                    <span key={c} className="grid w-[58px] place-items-center">
                      <SkeletonBar width="12px" height={12} radius="rounded-full" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}
