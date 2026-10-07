/** Null is explicitly unlimited; undefined is unavailable; zero denies capacity. */
export type AllowanceLimit = number | null | undefined;

export function formatAllowanceLimit(limit: AllowanceLimit): string {
  if (limit === null) return 'Unlimited';
  if (limit === undefined || !Number.isFinite(limit) || limit < 0) return 'Unavailable';
  return limit.toLocaleString('en-GB');
}

export function describeAllowance(used: number, limit: AllowanceLimit) {
  const label = formatAllowanceLimit(limit);
  if (label === 'Unavailable') {
    return { label: '—', ratio: null, note: 'Allowance unavailable', overLimit: false };
  }
  if (limit === null) {
    return { label: '∞', ratio: null, note: 'Unlimited seats', overLimit: false };
  }
  if (limit === 0) {
    return { label: '0', ratio: null, note: 'No seats allowed', overLimit: used > 0 };
  }
  // Unavailable values returned above; this narrowing keeps arithmetic explicit.
  if (limit === undefined) throw new Error('Unreachable allowance state');
  const difference = Math.abs(limit - used);
  const noun = difference === 1 ? 'seat' : 'seats';
  return {
    label,
    ratio: used / limit,
    note: used > limit ? `${difference} ${noun} over the limit` : `${difference} ${noun} available`,
    overLimit: used > limit,
  };
}

export function sumAllowanceLimits(limits: AllowanceLimit[]): AllowanceLimit {
  if (limits.some((limit) => formatAllowanceLimit(limit) === 'Unavailable')) return undefined;
  if (limits.includes(null)) return null;
  return limits.reduce<number>((sum, limit) => sum + (limit ?? 0), 0);
}

/** Unavailable/non-proportional values stay last in either direction. */
export function compareAllowanceUsage(
  a: { used: number; limit: AllowanceLimit },
  b: { used: number; limit: AllowanceLimit },
  direction: 'asc' | 'desc',
): number {
  const left = describeAllowance(a.used, a.limit);
  const right = describeAllowance(b.used, b.limit);
  const leftScore = left.overLimit && a.limit === 0 ? 1 : left.ratio;
  const rightScore = right.overLimit && b.limit === 0 ? 1 : right.ratio;
  if (leftScore === null || rightScore === null) {
    if (leftScore === rightScore) return 0;
    return leftScore === null ? 1 : -1;
  }
  const delta = leftScore - rightScore;
  return direction === 'asc' ? delta : -delta;
}
