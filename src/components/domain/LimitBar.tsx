/**
 * 03 §10. "The visual that makes entitlements legible" — used on the tenant
 * subscription page, the platform tenant detail, and (eventually) the health
 * watchlist.
 *
 * ⚠ THE THRESHOLD IS OCHRE, NOT OXIDE, UNTIL THE LIMIT IS ACTUALLY REACHED.
 * 03 §4a / 08 §3: "A ceiling is ochre, not oxide. A tenant at 15 of 15 seats
 * has not failed. It has arrived at the limit its plan describes." Oxide is
 * reserved for the moment `current` actually reaches `limit` — the only
 * state in this component that means something has genuinely stopped
 * working, not merely that an upgrade conversation is due.
 *
 * Unlimited entitlements (`limit: null`) never render a bar at all. A full
 * bar for an unlimited plan is a lie about what "full" means.
 */

export type LimitBarProps = {
  label: string;
  current: number;
  /** `null` renders the infinity glyph instead of a bar. */
  limit: number | null;
  unit?: string;
};

const THRESHOLD = 0.8;

export function LimitBar({ label, current, limit, unit = '' }: LimitBarProps) {
  if (limit === null) {
    return (
      <div data-slot="limit-bar" data-state="unlimited">
        <div className="flex items-baseline justify-between gap-3">
          <span className="t-data text-[var(--ink-secondary)]">{label}</span>
          <span className="t-data text-[var(--ink-primary)]" style={{ fontSize: '1rem' }}>
            {current}
            {unit} / ∞
          </span>
        </div>
      </div>
    );
  }

  const pct = limit > 0 ? current / limit : current > 0 ? 1 : 0;
  const clamped = Math.min(1, Math.max(0, pct));
  const atLimit = pct >= 1;
  const nearLimit = pct >= THRESHOLD;

  const fillColor = atLimit
    ? 'var(--oxide-ink)'
    : nearLimit
      ? 'var(--ochre-ink)'
      : 'var(--copper-solid)';
  const numeralColor = atLimit
    ? 'var(--oxide-ink)'
    : nearLimit
      ? 'var(--ochre-ink)'
      : 'var(--ink-primary)';

  return (
    <div
      data-slot="limit-bar"
      data-state={atLimit ? 'at-limit' : nearLimit ? 'near-limit' : 'within-limit'}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-data text-[var(--ink-secondary)]">{label}</span>
        <span className="t-data" style={{ color: numeralColor }}>
          {current}
          {unit} / {limit}
          {unit}
        </span>
      </div>

      <div
        role="meter"
        aria-valuenow={current}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={`${label}: ${current} of ${limit}`}
        className="hatch relative mt-1.5 h-1.5 w-full overflow-hidden"
        style={{ border: atLimit ? '1px solid var(--oxide-ink)' : undefined }}
      >
        <div className="h-full" style={{ width: `${clamped * 100}%`, background: fillColor }} />
        {/* The 80% threshold tick — a fixed reference mark, not tied to this
            entitlement's own current usage. */}
        <div
          aria-hidden
          className="absolute top-0 bottom-0"
          style={{ left: `${THRESHOLD * 100}%`, width: 1, background: 'var(--rule-strong)' }}
        />
      </div>
    </div>
  );
}
