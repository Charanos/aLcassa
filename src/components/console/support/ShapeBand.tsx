import { Panel } from '../Surface';
import type { SupportRegister } from '@/lib/console/liveSupport';
import { OUTCOME, minutesLabel } from './outcomes';

/**
 * WHAT SUPPORT ACCESS COSTS. 17 §7 · doc 24.
 *
 * A register answers "did you come in, and when". The shape answers the
 * question that follows: how long do you stay, and how do visits end — what
 * normal looks like, and therefore what abnormal would.
 *
 * ⚠ THE LAST LENGTH BUCKET IS "PAST THE CAP", which only an extension allows.
 * It is drawn in the warning tone because every visit in it is one the
 * operator chose to prolong, in front of the customer, and it should be rare.
 *
 * ⚠ IT SAYS "NO VISITS" RATHER THAN DRAWING EMPTY AXES — which is what it did,
 * as four zero bars under a heading promising a distribution.
 *
 * CSS, not a chart library: four bars and a list is arithmetic.
 */

const BUCKETS = [
  { label: 'Under 5 min', test: (m: number) => m < 5 },
  { label: '5–15 min', test: (m: number) => m >= 5 && m < 15 },
  { label: '15–30 min', test: (m: number) => m >= 15 && m <= 30 },
  { label: 'Past the cap', test: (m: number) => m > 30, warn: true },
] as const;

export function ShapeBand({ register }: { register: SupportRegister }) {
  const shape = register.shape;
  if (shape.length === 0) {
    return (
      <Panel title="Shape of a visit" variant="elevated">
        <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
          No visit has ended in the last thirty days, so there is nothing to draw yet.
        </p>
      </Panel>
    );
  }

  const buckets = BUCKETS.map((b) => ({
    ...b,
    count: shape.filter((s) => b.test(s.minutes)).length,
  }));
  const tallest = Math.max(...buckets.map((b) => b.count), 1);
  const outcomes = (Object.keys(OUTCOME) as Array<keyof typeof OUTCOME>)
    .filter((k) => k !== 'open')
    .map((k) => ({ key: k, ...OUTCOME[k], count: shape.filter((s) => s.outcome === k).length }))
    .filter((o) => o.count > 0);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-2">
      <Panel
        title="How long a visit lasts"
        variant="elevated"
        action={
          register.facts.medianMinutes !== null ? (
            <span
              className="whitespace-nowrap"
              style={{
                font: '400 var(--type-chip)/1 var(--font-mono)',
                color: 'var(--text-tertiary)',
              }}
            >
              median {minutesLabel(register.facts.medianMinutes)}
            </span>
          ) : null
        }
      >
        <div className="grid gap-3">
          {buckets.map((b) => (
            <div key={b.label} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                  {b.label}
                </span>
                <span
                  className="t-compact shrink-0 tabular-nums"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {b.count}
                </span>
              </div>
              <div
                className="h-2 w-full overflow-hidden rounded-full"
                style={{ background: 'var(--surface-inset)' }}
                role="img"
                aria-label={`${b.count} ${b.count === 1 ? 'visit' : 'visits'} ${b.label.toLowerCase()}`}
              >
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${(b.count / tallest) * 100}%`,
                    background: 'warn' in b ? 'var(--warning-fg)' : 'var(--blue-400)',
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="How visits end" variant="elevated">
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {outcomes.map((o) => (
            <li key={o.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{
                    background:
                      o.tone === 'warning'
                        ? 'var(--warning-fg)'
                        : o.tone === 'danger'
                          ? 'var(--danger-fg)'
                          : 'var(--ink-400)',
                  }}
                />
                <span
                  className="t-compact"
                  style={{
                    color: o.tone === 'warning' ? 'var(--warning-fg)' : 'var(--text-secondary)',
                  }}
                >
                  {o.label}
                </span>
              </span>
              <span className="t-compact tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {o.count}
              </span>
            </li>
          ))}
        </ul>
        <p className="t-caption mt-4" style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}>
          A customer ending a visit is a signal worth reading, not a fault. It is the ceiling
          working.
        </p>
      </Panel>
    </div>
  );
}
