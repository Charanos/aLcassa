import { describe, expect, it } from 'vitest';
import {
  addMonths,
  computeRevenue,
  currentPeriod,
  monthlyValue,
  periodsDue,
  type ContractRow,
} from '@/lib/console/revenue';

const now = new Date('2026-10-06T09:00:00Z');
function row(
  id: string,
  status: NonNullable<ContractRow['subscription']>['status'] = 'active',
): ContractRow {
  return {
    tenantId: id,
    slug: id,
    name: id,
    tenantStatus: 'active',
    provisionedAt: new Date('2026-01-31T09:00:00Z'),
    suspendedAt: null,
    subscription: {
      status,
      planCode: 'pro',
      planName: 'Pro',
      listPrice: 12000,
      intervalUnit: 'month',
      intervalCount: 1,
      contractAmount: null,
      trialEndsAt: null,
      pastDueSince: null,
      stoppedAt: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    },
  };
}

describe('subscription value', () => {
  it('preserves empty portfolios without invented contracts or amounts', () => {
    const figures = computeRevenue([], now);
    expect(figures.mrr).toBe(0);
    expect(figures.arr).toBe(0);
    expect(figures.averagePerPaying).toBe(0);
    expect(figures.collections).toEqual([]);
    expect(figures.byPlan).toEqual([]);
    expect(figures.series).toHaveLength(12);
    expect(figures.series.every((point) => point.mrr === 0 && point.net === 0)).toBe(true);
  });

  it('normalizes annual prices and honors negotiated monthly prices including zero', () => {
    const subscription = row('annual').subscription!;
    expect(monthlyValue({ ...subscription, intervalUnit: 'year', listPrice: 144000 })).toBe(12000);
    expect(monthlyValue({ ...subscription, contractAmount: 7000 })).toBe(7000);
    expect(monthlyValue({ ...subscription, planCode: 'custom', contractAmount: 0 })).toBe(0);
    expect(monthlyValue({ ...subscription, planCode: 'custom' })).toBeNull();
  });

  it('keeps trials, suspended contracts and unpriced contracts out of current value', () => {
    const trial = row('trial', 'trialing');
    const suspended: ContractRow = { ...row('suspended'), tenantStatus: 'suspended' };
    const unpriced = row('unpriced');
    unpriced.subscription!.planCode = 'custom';
    const missing = { ...row('missing'), subscription: null };
    const figures = computeRevenue([row('active'), trial, suspended, unpriced, missing], now);
    expect(figures.mrr).toBe(12000);
    expect(figures.arr).toBe(144000);
    expect(figures.paying).toBe(1);
    expect(figures.trials).toEqual({ count: 1, ended: 0, value: 12000 });
    expect(figures.unpriced.map((contract) => contract.slug)).toEqual(['unpriced']);
    expect(figures.unsubscribed.map((contract) => contract.slug)).toEqual(['missing']);
  });

  it('limits estimated arrears at suspension and reconciles age buckets', () => {
    const overdue = row('overdue', 'past_due');
    overdue.subscription!.pastDueSince = new Date('2026-07-31T09:00:00Z');
    overdue.tenantStatus = 'suspended';
    overdue.suspendedAt = new Date('2026-09-15T09:00:00Z');
    const figures = computeRevenue([overdue], now);
    expect(figures.mrr).toBe(0);
    expect(figures.unpaid).toBe(24000);
    expect(figures.collections[0]!.arrears!.periods).toBe(2);
    expect(figures.ageing.reduce((sum, bucket) => sum + bucket.amount, 0)).toBe(24000);
  });
});

describe('calendar renewal boundaries', () => {
  it('clamps month-end anchors without skipping February or changing the time', () => {
    const anchor = new Date('2026-01-31T09:14:15.123Z');
    expect(addMonths(anchor, 1).toISOString()).toBe('2026-02-28T09:14:15.123Z');
    expect(addMonths(anchor, 2).toISOString()).toBe('2026-03-31T09:14:15.123Z');
    expect(anchor.toISOString()).toBe('2026-01-31T09:14:15.123Z');
    expect(addMonths(new Date('2024-01-31T00:00:00Z'), 1).toISOString()).toBe(
      '2024-02-29T00:00:00.000Z',
    );
  });

  it('starts the next period exactly at its boundary and counts due dates once', () => {
    const anchor = new Date('2026-01-31T09:00:00Z');
    const boundary = new Date('2026-02-28T09:00:00Z');
    const period = currentPeriod(anchor, boundary);
    expect(period.start).toEqual(boundary);
    expect(period.end).toEqual(new Date('2026-03-31T09:00:00Z'));
    expect(periodsDue(anchor, new Date(boundary.getTime() - 1))).toBe(1);
    expect(periodsDue(anchor, boundary)).toBe(2);
    expect(periodsDue(boundary, anchor)).toBe(0);
  });
});
