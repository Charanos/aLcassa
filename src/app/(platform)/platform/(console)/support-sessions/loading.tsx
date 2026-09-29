import { ConsolePage, Panel } from '@/components/console/Surface';
import { SkeletonGroup, SkeletonBar } from '@/components/primitives/Skeleton';

/**
 * ⚠ THIS WAS A HEADER AND EIGHT ROWS in front of a page that opens with a
 *   responsive strip of stat cards, runs a six-column history table, and
 *   closes on a shape band.
 *
 * 03 §15. Two details here are load-bearing rather than decorative:
 *
 *   THE STAT STRIP USES THE PAGE'S OWN TRACK — `auto-fit, minmax(168px, 1fr)`
 *   — so the cards wrap at exactly the widths the real strip wraps at. A
 *   skeleton with a fixed column count agrees with the page at one viewport
 *   and reflows differently at every other.
 *
 *   THE HISTORY IS A TABLE ON DESKTOP AND CARDS BELOW `md`, and the page
 *   renders both behind `hidden md:block` / `md:hidden`. The skeleton does the
 *   same, because a phone that gets the table's skeleton and then the card
 *   list has been shown the wrong page twice.
 */
export default function SupportSessionsLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading support sessions" className="block">
        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="min-w-0">
          <SkeletonBar width="196px" height={11} />
          <SkeletonBar width="206px" height={26} className="mt-2" />
          <SkeletonBar width="min(72ch, 100%)" height={14} className="mt-3" />
          <SkeletonBar width="min(54ch, 88%)" height={14} className="mt-1.5" />
        </div>

        {/* ── Stat strip, on the page's own track ──────────────────────── */}
        <div
          className="mt-5 grid gap-3.5"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-overlay p-4"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <SkeletonBar width={`${74 - (i % 3) * 11}%`} height={11} />
              <SkeletonBar width="66px" height={24} className="mt-2.5" />
              <SkeletonBar width="88%" height={11} className="mt-2" />
            </div>
          ))}
        </div>

        {/* ── History ──────────────────────────────────────────────────── */}
        <div className="mt-5">
          <Panel title="History · last 30 days" flush>
            {/* Desktop: the six-column table. */}
            <div className="hidden md:block">
              <div
                className="grid grid-cols-6 gap-3 border-b px-5 py-2.5"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonBar key={i} width={`${72 - (i % 4) * 9}%`} height={10} />
                ))}
              </div>
              <div className="grid gap-px" style={{ background: 'var(--border-subtle)' }}>
                {Array.from({ length: 8 }).map((_, r) => (
                  <div
                    key={r}
                    className="grid grid-cols-6 items-center gap-3 px-5 py-3.5"
                    style={{ background: 'var(--surface-raised)' }}
                  >
                    {Array.from({ length: 6 }).map((_, c) => (
                      <SkeletonBar key={c} width={`${86 - ((r + c) % 5) * 12}%`} height={12} />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Below md: the card list the page swaps to. */}
            <div className="grid gap-2 p-4 md:hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-panel p-3.5"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-raised)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <SkeletonBar width="56%" height={13} />
                    <SkeletonBar width="52px" height={11} />
                  </div>
                  <SkeletonBar width="82%" height={11} className="mt-2" />
                  <SkeletonBar width="44%" height={11} className="mt-1.5" />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── Shape band ───────────────────────────────────────────────── */}
        <section className="mt-8">
          <div className="mt-24 mb-12">
            <SkeletonBar width="118px" height={20} />
            <SkeletonBar width="238px" height={12} className="mt-2" />
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel title="Duration">
              <SkeletonBar width="100%" height={190} radius="rounded-overlay" />
            </Panel>
            <Panel title="In the window">
              <div className="grid">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="grid gap-1 border-b py-3 first:pt-0 last:border-b-0 last:pb-0"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <SkeletonBar width={`${56 - i * 8}%`} height={11} />
                      <SkeletonBar width="38px" height={16} />
                    </div>
                    <SkeletonBar width="86%" height={11} className="mt-0.5" />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </section>
      </SkeletonGroup>
    </ConsolePage>
  );
}
