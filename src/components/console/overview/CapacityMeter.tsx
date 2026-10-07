import { PRESSURE_THRESHOLD } from '@/lib/console/data';
import { formatAllowanceLimit, type AllowanceLimit } from '@/lib/console/allowances';

/**
 * ONE CAPACITY METER, USED BY BOTH.
 *
 * ⚠ THIS WAS TWO NEAR-IDENTICAL FORTY-LINE BLOCKS — seats and events, copied
 * and then diverged. The copy is the defect: the next threshold change, label
 * tweak or accessibility fix lands in one and not the other, and nobody
 * notices until the two meters disagree on screen about what "full" looks like.
 *
 * ⚠ THE COLOUR WAS DECORATIVE AND IS NOW SEMANTIC. Seats drew in `--blue-400`
 * and events in `--success-fg`, for no reason either meter could state — both
 * show the same quantity, capacity consumed, and green does not mean "events".
 * In a system where every colour has exactly one meaning (`03 §3`), a series
 * coloured by WHICH metric it is rather than by how full it is spends a
 * meaning on nothing.
 *
 * One encoding now, shared with the pressure list in the same band so all three
 * capacity displays agree:
 *
 *   under the threshold  → `--blue-400`, the neutral "in use" ink
 *   at or above it       → `--warning-fg`, approaching a ceiling
 *   at or over 100%      → `--danger-fg`, past it
 *
 * ⚠ IT IS A `meter`, DECLARED. A bar built from two divs tells a screen reader
 * nothing at all. `role="meter"` with its value, min and max is the one element
 * that describes exactly this, and it costs four attributes.
 */
export function CapacityMeter({
  title,
  used,
  limit,
  pct,
  unit,
}: {
  title: string;
  used: number;
  limit: AllowanceLimit;
  pct: number;
  /** Plural noun for the accessible label: "seats", "events". */
  unit: string;
}) {
  /*
    ⚠ AN UNLIMITED CEILING IS A REAL STATE AND HAD NO RENDERING. A platform
    total of zero produced "NaN%" and a bar of unknown width. It reads as a
    figure rather than as a fault now.
  */
  const bounded = typeof limit === 'number' && limit > 0;
  const allowance = formatAllowanceLimit(limit);
  const ink = !bounded
    ? 'var(--text-tertiary)'
    : pct >= 100
      ? 'var(--danger-fg)'
      : pct >= PRESSURE_THRESHOLD
        ? 'var(--warning-fg)'
        : 'var(--blue-400)';

  return (
    <div className="mt-2.5">
      <div className="mb-3 flex items-end justify-between gap-3">
        <p
          className="font-mono text-2xl font-medium tracking-tight"
          style={{
            color: bounded ? 'var(--text-primary)' : 'var(--text-tertiary)',
            lineHeight: 0.9,
          }}
        >
          {bounded ? `${pct}%` : '—'}
        </p>
        <p
          className="pb-0.5 font-mono text-sm font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {used.toLocaleString('en-KE')}
          {bounded
            ? ` / ${limit.toLocaleString('en-KE')}`
            : limit === null
              ? ` ${unit}, includes unlimited allowances`
              : limit === 0
                ? ` ${unit}, none allowed`
                : ` ${unit}, allowance unavailable`}
        </p>
      </div>

      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--surface-inset)' }}
        role={bounded ? 'meter' : 'img'}
        aria-valuenow={bounded ? pct : undefined}
        aria-valuemin={bounded ? 0 : undefined}
        aria-valuemax={bounded ? 100 : undefined}
        aria-label={
          bounded
            ? `${title}: ${used.toLocaleString('en-KE')} of ${limit.toLocaleString('en-KE')} ${unit}, ${pct}%`
            : `${title}: ${used.toLocaleString('en-KE')} ${unit}; allowance ${allowance.toLowerCase()}`
        }
      >
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${Math.min(100, Math.max(0, pct))}%`,
            background: ink,
            boxShadow: bounded ? `0 0 10px ${ink}` : 'none',
          }}
        />
        {/*
          ⚠ NO WHITE WASH AT THE TIP. A gradient to 60% white over the last four
          pixels lightens exactly the end a reader measures against — and it was
          a raw value, duplicated here and in the pressure list. The bar carries
          its own soft glow; the tip does not need a second treatment on top.
        */}
      </div>
    </div>
  );
}
