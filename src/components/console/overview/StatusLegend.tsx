import { statusHue } from '../statusHue';
import type { StatusSlice } from '@/lib/console/data';

/**
 * THE STATUS DONUT'S LEGEND.
 *
 * ⚠ IT IS NOT DECORATION. `03 §24` permits the donut beside it to use semantic
 * hues — green, blue, red — rather than the one-hue ramp every other ordered
 * chart uses, on one condition: **every slice is named in words here**. A
 * reader who cannot separate the colours reads this list and loses nothing.
 *
 * Delete this list and the chart above it is in breach. That is why it is a
 * component with its own file rather than markup inside the band.
 *
 * ⚠ THE DOTS WERE ALL GREY FOR ONE COMMIT, and the cause is worth keeping. The
 * colours were imported from `Charts.tsx`, a `'use client'` module — and a
 * server component importing a value from a client module receives a
 * client-reference proxy rather than the value. Every lookup returned
 * `undefined` and fell through to the neutral. It typechecked, linted and
 * built. See `statusHue.ts`.
 *
 * ⚠ NO HOVER STATE, BECAUSE A ROW DOES NOTHING. The rows carried a background
 * change on hover, which promises a click. The workspace table filters client
 * side and reads no status from the URL, so a link here would land on an
 * unfiltered list — the dead-control defect wearing a row. The panel's own
 * "Open workspaces" link is the honest route, and it is already in the band
 * heading.
 */
export function StatusLegend({ slices, total }: { slices: StatusSlice[]; total: number }) {
  const present = slices.filter((s) => s.count > 0);
  /*
    ⚠ ZERO IS A RESULT, AND IT IS USUALLY THE GOOD ONE. "No workspace is past
    due" is worth a line — it says the check ran. Listing those statuses as
    rows reading 0 would be five rows where three carry no information, so they
    are collapsed into one sentence beneath instead.
  */
  const absent = slices.filter((s) => s.count === 0);

  return (
    <>
      <ul className="mt-5 grid gap-1">
        {present.map((slice) => {
          const share = total > 0 ? Math.round((slice.count / total) * 100) : 0;
          return (
            <li key={slice.status} className="flex items-center justify-between gap-3 px-0.5 py-2">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: statusHue(slice.status) }}
                />
                <span
                  className="font-ui truncate text-[13px] font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {slice.label}
                </span>
              </span>

              <span className="flex shrink-0 items-baseline gap-2">
                {/*
                  ⚠ THE SHARE EARNS ITS PLACE BECAUSE THE DONUT CANNOT BE READ
                  PRECISELY. A ring shows that active dominates; it cannot show
                  that it is 87%. The count alone makes a reader do the division
                  against a total printed in the panel title.
                */}
                <span className="font-mono text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                  {share}%
                </span>
                <span
                  className="font-mono text-[13px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {slice.count}
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      {absent.length > 0 ? (
        <p
          className="t-caption mt-3 border-t pt-3"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
        >
          None {listed(absent.map((s) => s.label.toLowerCase()))}.
        </p>
      ) : null}
    </>
  );
}

/** "past due", "past due or pending", "past due, pending or archived". */
function listed(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}
