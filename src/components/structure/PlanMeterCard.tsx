'use client';

import Link from 'next/link';

/**
 * The plan-pressure card pinned to the foot of the tenant sidebar.
 *
 * ⚠ THIS IS THE ONE PLACE PLAN PRESSURE IS VISIBLE FROM EVERY SCREEN, AND
 * THAT IS THE POINT. The overview's meters only exist while the reader is on
 * the overview; an owner who is deep in Team or Credentials when the events
 * ceiling arrives would otherwise meet the limit as a refusal rather than as
 * something they watched approach. 08 §2 refuses over the entitlement instead
 * of billing overage, which makes the warning the entire remedy.
 *
 * ⚠ IT DOES NOT SHOUT UNTIL IT HAS SOMETHING TO SAY. Below the near-limit
 * threshold the figure is quiet secondary ink; ochre is reserved for the band
 * where the reader can still act — 03 §14, ochre resolves. It never goes
 * oxide: a plan that is merely full is not an error, and the card's job at
 * that point is to offer the tier above it.
 */

export type PlanMeter = {
  planName: string;
  /** Percentage of the entitlement consumed, 0–100. */
  pct: number;
  /** "470,300 of 500,000 events. 19 days left in this period." */
  detail: string;
  href: string;
};

/** 03 §14 / 08 §2. Within ten percent of the ceiling is "near limit". */
const NEAR_LIMIT = 90;

export function PlanMeterCard({ meter, collapsed }: { meter: PlanMeter; collapsed: boolean }) {
  const pct = Math.min(100, Math.max(0, meter.pct));
  const near = pct >= NEAR_LIMIT;
  const ink = near ? 'var(--warning-fg)' : 'var(--text-secondary)';
  const fill = near ? 'var(--warning-fg)' : 'var(--blue-500)';

  if (collapsed) {
    // In the rail there is no room for prose, so the bar carries it alone —
    // and `title` gives the same sentence back on hover, because a bare bar
    // with no number is decoration.
    return (
      <div className="border-t p-2.5" style={{ borderColor: 'var(--tenant-chrome-rule)' }}>
        <Link
          href={meter.href}
          title={`${meter.planName} · ${pct}% used. ${meter.detail}`}
          aria-label={`${meter.planName}, ${pct} percent of the plan used`}
          className="block rounded-chip p-1"
        >
          <div
            className="h-1 overflow-hidden rounded-full"
            style={{ background: 'var(--surface-inset)' }}
          >
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fill }} />
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="border-t p-2.5" style={{ borderColor: 'var(--tenant-chrome-rule)' }}>
      <div
        className="rounded-panel border px-3 pt-2.5 pb-3"
        style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border-subtle)' }}
      >
        <p className="mb-2 flex items-baseline justify-between gap-2">
          <span className="t-eyebrow uppercase" style={{ color: 'var(--text-tertiary)' }}>
            {meter.planName} plan
          </span>
          <span className="t-micro" style={{ color: ink }}>
            {pct}%
          </span>
        </p>

        <div
          className="h-[5px] overflow-hidden rounded-full"
          style={{ background: 'var(--surface-inset)' }}
          aria-hidden
        >
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fill }} />
        </div>

        <p className="t-caption mt-2 text-pretty" style={{ color: 'var(--text-secondary)' }}>
          {meter.detail}
        </p>

        <Link
          href={meter.href}
          className="t-compact mt-2.5 flex h-[30px] items-center justify-center rounded-chip border transition-colors hover:bg-[var(--surface-inset)]"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-primary)',
          }}
        >
          Review plan
        </Link>
      </div>
    </div>
  );
}
