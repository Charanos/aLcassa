import { ConsolePage, Panel } from '@/components/console/Surface';
import { SkeletonGroup } from '@/components/primitives/Skeleton';

/**
 * ⚠ THIS WAS FOUR METRIC TILES, TWO 220px BLOCKS AND A FIVE-LINE PANEL — a
 *   layout the page has never had.
 *
 * Health renders a header with a live status pill, a diagnosis sentence, a
 * responsive grid of six service cards each carrying a thirty-bar uptime
 * strip, the isolation panel, two queue panels and an incident list. The old
 * skeleton described none of that, so the page did not so much load as replace
 * itself — and this is the screen an operator opens when they already suspect
 * something is wrong, which is the worst possible moment to make the layout
 * jump under them.
 *
 * 03 §15: identical dimensions to the real thing. The service grid below uses
 * the same `auto-fit, minmax(190px, 1fr)` track the page uses, so the card
 * count reflows identically at every width rather than agreeing only at the
 * one the skeleton was written at.
 */
export default function HealthLoading() {
  return (
    <ConsolePage>
      <SkeletonGroup label="Loading platform health" className="block">
        {/* ── Header, with the status pill on the right ────────────────── */}
        <div
          className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:gap-6"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="min-w-0 flex-1">
            <Bar w="128px" h={11} />
            <Bar w="128px" h={26} className="mt-2" />
          </div>
          <Bar w="198px" h={32} radius="rounded-full" />
        </div>

        {/* The diagnosis sentence, which is prose and wraps. */}
        <Bar w="min(82ch, 100%)" h={14} className="mt-4" />
        <Bar w="min(58ch, 88%)" h={14} className="mt-1.5" />

        {/* ── Service cards ────────────────────────────────────────────── */}
        <div
          className="mt-5 grid gap-3.5"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="min-w-0 rounded-overlay p-4"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <Bar w="28px" h={28} radius="rounded-panel" />
                <Bar w="58%" h={13} />
                <span className="flex-1" />
                <Bar w="7px" h={7} radius="rounded-full" />
              </div>
              <Bar w="72px" h={24} className="mt-3" />
              <Bar w="86%" h={12} className="mt-1.5" />
              {/* The thirty-bar uptime strip, at its real height. */}
              <div className="mt-3 flex gap-0.5">
                {Array.from({ length: 30 }).map((_, d) => (
                  <span
                    key={d}
                    className="h-[18px] flex-1 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-bar motion-reduce:animate-none motion-reduce:opacity-70"
                    style={{ background: 'var(--surface-inset)' }}
                  />
                ))}
              </div>
              <Bar w="94px" h={11} className="mt-2" />
            </div>
          ))}
        </div>

        {/* ── Isolation: four figures across ───────────────────────────── */}
        <div className="mt-3.5">
          <Panel title="Cross-tenant isolation suite">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Bar w={`${74 - (i % 3) * 10}%`} h={11} />
                  <Bar w="56px" h={22} className="mt-2" />
                  <Bar w="92%" h={11} className="mt-2" />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── Queues, then incidents ───────────────────────────────────── */}
        <div className="mt-3.5 grid gap-3.5 lg:grid-cols-2">
          <Panel title="Background queues">
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-4">
                  <Bar w={`${58 - (i % 3) * 9}%`} h={13} />
                  <Bar w="44px" h={13} />
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Recent incidents" flush>
            <div className="grid gap-px" style={{ background: 'var(--border-subtle)' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="px-5 py-3.5"
                  style={{ background: 'var(--surface-raised)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <Bar w={`${62 - i * 8}%`} h={13} />
                    <Bar w="62px" h={11} />
                  </div>
                  <Bar w="84%" h={11} className="mt-2" />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </SkeletonGroup>
    </ConsolePage>
  );
}

/**
 * One pulsing bar. Flat tint rather than nothing under reduced motion — a
 * skeleton that vanishes when the animation is switched off is a blank screen.
 */
function Bar({
  w,
  h,
  className = '',
  radius = 'rounded-chip',
}: {
  w: string;
  h: number;
  className?: string;
  radius?: string;
}) {
  return (
    <div
      className={`animate-[skeleton-pulse_1400ms_ease-in-out_infinite] ${radius} motion-reduce:animate-none motion-reduce:opacity-70 ${className}`}
      style={{ width: w, height: h, background: 'var(--surface-inset)' }}
    />
  );
}
