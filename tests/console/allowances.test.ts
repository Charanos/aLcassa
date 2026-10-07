import { describe, expect, it } from 'vitest';
import {
  compareAllowanceUsage,
  describeAllowance,
  formatAllowanceLimit,
  sumAllowanceLimits,
} from '@/lib/console/allowances';

describe('allowance display and portfolio arithmetic', () => {
  it('keeps denied, unlimited and unavailable allowances distinct', () => {
    expect(describeAllowance(3, 0)).toEqual({
      label: '0',
      ratio: null,
      note: 'No seats allowed',
      overLimit: true,
    });
    expect(describeAllowance(3, null)).toEqual({
      label: '∞',
      ratio: null,
      note: 'Unlimited seats',
      overLimit: false,
    });
    expect(describeAllowance(3, undefined)).toEqual({
      label: '—',
      ratio: null,
      note: 'Allowance unavailable',
      overLimit: false,
    });
    for (const invalid of [-1, NaN, Infinity])
      expect(formatAllowanceLimit(invalid)).toBe('Unavailable');
  });
  it('reports finite headroom and excess without clamping the business value', () => {
    expect(describeAllowance(4, 5)).toMatchObject({
      ratio: 0.8,
      note: '1 seat available',
      overLimit: false,
    });
    expect(describeAllowance(7, 5)).toMatchObject({
      ratio: 1.4,
      note: '2 seats over the limit',
      overLimit: true,
    });
    expect(describeAllowance(0, 0).overLimit).toBe(false);
  });
  it('never substitutes used seats for an unknown or unlimited portfolio limit', () => {
    expect(sumAllowanceLimits([0, 5, 10])).toBe(15);
    expect(sumAllowanceLimits([0, null, 10])).toBeNull();
    expect(sumAllowanceLimits([null, undefined, 10])).toBeUndefined();
  });
  it('keeps non-proportional values last and denied usage visible in both sorts', () => {
    const finite = { used: 4, limit: 10 };
    for (const direction of ['asc', 'desc'] as const) {
      expect(compareAllowanceUsage({ used: 2, limit: null }, finite, direction)).toBeGreaterThan(0);
      expect(
        compareAllowanceUsage({ used: 2, limit: undefined }, finite, direction),
      ).toBeGreaterThan(0);
    }
    expect(compareAllowanceUsage({ used: 2, limit: 0 }, finite, 'desc')).toBeLessThan(0);
  });
});
