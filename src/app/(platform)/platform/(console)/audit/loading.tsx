import { ConsolePage, Panel } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonBar } from '@/components/primitives/Skeleton';

/**
 * ⚠ THIS WAS EIGHT GENERIC ROWS UNDER A GENERIC HEADER — fifteen lines in
 *   front of a page that renders a header, an export control, two bands and a
 *   filtered stream.
 *
 * 03 §15 asks for "identical dimensions to the real thing", and the reason is
 * mechanical rather than aesthetic: every dimension the skeleton gets wrong is
 * a jump when the content lands. The old version was roughly a third of the
 * page's height, so the whole stream leapt upward on arrival — on the one
 * screen whose job is to be read carefully.
 *
 * It now mirrors the real structure: the header row with its export control,
 * the volume band's 2.4/1 split, the operator band's 1.6/1 split, and the
 * stream's toolbar and rows. Anything that renders text at rest renders a bar
 * of that text's height here.
 */
export default function AuditLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading the audit log" className="block">
        {/* ── Header, with the export control on the right ─────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="min-w-0 flex-1">
            <SkeletonBar width="120px" height={11} />
            <SkeletonBar width="180px" height={26} className="mt-2" />
            <SkeletonBar width="min(68ch, 100%)" height={14} className="mt-3" />
            <SkeletonBar width="min(52ch, 90%)" height={14} className="mt-1.5" />
          </div>
          <SkeletonBar width="104px" height={36} radius="rounded-full" />
        </div>

        {/* ── Volume band ──────────────────────────────────────────────── */}
        <section className="mt-7 mb-8">
          <Heading />
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
            <Panel title="Actions per day">
              <SkeletonBar width="100%" height={168} radius="rounded-overlay" />
            </Panel>
            <Panel title="In the window">
              <FigureRows n={4} />
            </Panel>
          </div>
        </section>

        {/* ── Operator band ────────────────────────────────────────────── */}
        <section className="mb-8">
          <Heading />
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Panel title="Share of the window">
              <div className="grid gap-3.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3">
                    <SkeletonBar width="28px" height={28} radius="rounded-panel" />
                    <div>
                      <SkeletonBar width="55%" height={13} />
                      <SkeletonBar
                        width="100%"
                        height={4}
                        className="mt-1.5"
                        radius="rounded-bar"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="In the window">
              <FigureRows n={4} />
            </Panel>
          </div>
        </section>

        {/* ── The stream: a toolbar, then rows ─────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2.5">
          <SkeletonBar width="220px" height={36} radius="rounded-full" />
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonBar key={i} width="74px" height={28} radius="rounded-full" />
          ))}
        </div>
        <div className="mt-4 grid gap-px" style={{ background: 'var(--border-subtle)' }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5"
              style={{ background: 'var(--surface-raised)' }}
            >
              <SkeletonBar width="28px" height={28} radius="rounded-panel" />
              <div>
                <SkeletonBar width={`${68 - (i % 4) * 9}%`} height={13} />
                <SkeletonBar width={`${44 - (i % 3) * 7}%`} height={11} className="mt-1.5" />
              </div>
              <SkeletonBar width="66px" height={11} />
            </div>
          ))}
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}

/** A band's heading: title bar, note bar, in the heading's own rhythm. */
function Heading() {
  return (
    <div className="mt-24 mb-12">
      <SkeletonBar width="128px" height={20} />
      <SkeletonBar width="220px" height={12} className="mt-2" />
    </div>
  );
}

/** The figure list both bands render on their right-hand panel. */
function FigureRows({ n }: { n: number }) {
  return (
    <div className="grid">
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          className="grid gap-1 border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <SkeletonBar width={`${52 - (i % 3) * 8}%`} height={11} />
            <SkeletonBar width="38px" height={16} />
          </div>
          <SkeletonBar width="88%" height={11} className="mt-0.5" />
        </div>
      ))}
    </div>
  );
}
