import Link from 'next/link';
import { IconCircleCheck } from '@tabler/icons-react';
import { PRESSURE_THRESHOLD, type PressureRow } from '@/lib/console/data';
import { BandLink } from './shared';

/** How many rows before the list defers to the workspace table. */
const SHOWN = 5;

/**
 * WORKSPACES AT A CEILING.
 *
 * ⚠ IT IS THE ONLY DERIVED FIGURE IN THIS BAND. The status mix and the platform
 * capacity totals are stated aggregates; this list is computed from the actual
 * workspace rows, every one at or above `PRESSURE_THRESHOLD` percent of a limit,
 * worst first. That difference matters to a reader deciding what to trust, and
 * it is why this panel names workspaces while the others name totals.
 *
 * ⚠ THE BAR IS A `meter`, AND THE SAME ENCODING AS EVERY OTHER CAPACITY DISPLAY
 * IN THIS BAND. Amber approaching, red past it. A bar built from two divs with
 * `aria-hidden` on the track — which is what this was — tells a screen reader
 * the percentage and nothing about what it is a percentage OF.
 *
 * ⚠ IT ADMITS WHEN IT IS TRUNCATING. The list showed five rows and silently
 * dropped the rest, so a platform with nine workspaces at a ceiling looked
 * exactly like one with five. Anything past the fifth is counted and linked.
 */
export function PressureList({ rows, total }: { rows: PressureRow[]; total: number }) {
  if (rows.length === 0) return <NothingAtCeiling />;

  /* Workspaces with headroom. The panel sits in a three-column grid that
     stretches every card to the tallest, so a single pressure row left a large
     void beneath it — and a void reads as a panel that failed to finish
     loading. This fills it with the fact the list is missing. */
  const resting = Math.max(0, total - rows.length);

  const shown = rows.slice(0, SHOWN);
  const hidden = rows.length - shown.length;

  return (
    <>
      <ul className="mt-2 grid gap-3.5">
        {shown.map((row) => {
          const over = row.pct >= 100;
          const ink = over ? 'var(--danger-fg)' : 'var(--warning-fg)';

          return (
            <li key={`${row.slug}-${row.metric}`}>
              <Link
                href={`/platform/tenants/${row.slug}`}
                className="group block rounded-[10px] p-3 transition-colors duration-300 hover:bg-[var(--surface-sunken)] -mx-3"
              >
                <div className="flex items-baseline justify-between gap-3 mb-2.5">
                  <span
                    className="truncate transition-colors duration-300 group-hover:text-[var(--text-action)]"
                    style={{ font: '500 13px/1 var(--font-ui)', color: 'var(--text-primary)' }}
                  >
                    {row.name}
                  </span>
                  <span
                    className="shrink-0 font-mono text-[13px] font-medium"
                    style={{ color: ink }}
                  >
                    {row.pct}%
                  </span>
                </div>

                <div
                  className="relative h-1.5 w-full overflow-hidden rounded-full"
                  style={{ background: 'var(--surface-inset)' }}
                  role="meter"
                  aria-valuenow={row.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.name}, ${row.metric}: ${row.used.toLocaleString('en-KE')} of ${row.limit.toLocaleString('en-KE')}, ${row.pct}%`}
                >
                  <div
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(100, Math.max(0, row.pct))}%`,
                      background: ink,
                      boxShadow: `0 0 10px ${ink}`,
                    }}
                  />
                </div>

                <p
                  className="mt-2.5 font-mono text-[11px] font-medium"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {row.metric} · {row.used.toLocaleString('en-KE')} of{' '}
                  {row.limit.toLocaleString('en-KE')}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {hidden > 0 ? (
        <p className="mt-4">
          <BandLink href="/platform/tenants">{hidden} more at a ceiling</BandLink>
        </p>
      ) : null}

      {/*
        ⚠ THE DENOMINATOR, THE SAME MOVE THE QUEUE MAKES.

        One workspace at a ceiling means something different against 47 than it
        does against 3, and a list without its denominator reads as a system in
        trouble. It is also what stops the panel ending in empty space: the
        grid stretches all three cards to the tallest, and a void under a short
        list looks like a panel that did not finish loading.
      */}
      {resting > 0 ? (
        <p
          className="t-caption mt-5 flex items-start gap-2 border-t pt-4"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
        >
          <IconCircleCheck
            size={14}
            stroke={1.5}
            className="mt-px shrink-0"
            style={{ color: 'var(--success-fg)' }}
            aria-hidden
          />
          <span>
            The other <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{resting}</span>{' '}
            {resting === 1 ? 'workspace has' : 'workspaces have'} headroom.
          </span>
        </p>
      ) : null}
    </>
  );
}

/**
 * ⚠ THE GOOD OUTCOME NAMES ITS THRESHOLD.
 *
 * "Nothing is within ten percent of a limit" was already better than "no
 * results" — but it stated the threshold as prose while the code held it as a
 * constant, so the two could drift the moment somebody tuned the number. It
 * reads from `PRESSURE_THRESHOLD` now, which is the same value the rows above
 * it are selected by.
 */
function NothingAtCeiling() {
  return (
    <div className="mt-3 flex flex-col items-start gap-2">
      <IconCircleCheck size={18} stroke={1.5} style={{ color: 'var(--success-fg)' }} aria-hidden />
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
        Every workspace has headroom.
      </p>
      <p
        className="t-caption"
        style={{ color: 'var(--text-secondary)', maxWidth: '34ch', textWrap: 'pretty' }}
      >
        Nothing is within {100 - PRESSURE_THRESHOLD}% of a limit. A workspace appears here before
        it is blocked, not after.
      </p>
    </div>
  );
}
