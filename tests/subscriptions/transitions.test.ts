import { describe, expect, it } from 'vitest';
import {
  SUBSCRIPTION_STATUSES,
  canTransition,
  permitsWrites,
  subscriptionStatusLabel,
  type SubscriptionStatus,
} from '../../src/modules/subscriptions';

/**
 * 08 §7. The lifecycle, checked against the diagram in the document.
 *
 * ⚠ THIS FILE ENUMERATES ALL 36 ORDERED PAIRS RATHER THAN SPOT-CHECKING.
 *
 * Six states give thirty-six pairs and only nine are legal. A test that
 * asserts the nine proves the machine allows what it should; it does not
 * prove it forbids the other twenty-seven, and the expensive mistake is in
 * the second set — `cancelled → active` silently restores a customer who
 * stopped paying. So the table below is exhaustive and the assertions run
 * over every cell, which also means adding a state to the enum without
 * deciding its transitions fails here rather than shipping.
 */

/** The nine legal moves, read off the diagram in 08 §7. */
const LEGAL: ReadonlyArray<[SubscriptionStatus, SubscriptionStatus]> = [
  ['trialing', 'active'],
  ['trialing', 'expired'],
  ['trialing', 'cancelled'],
  ['active', 'past_due'],
  ['active', 'paused'],
  ['active', 'cancelled'],
  ['past_due', 'active'],
  ['past_due', 'expired'],
  ['past_due', 'cancelled'],
  ['paused', 'active'],
  ['paused', 'cancelled'],
  ['expired', 'active'],
  ['expired', 'cancelled'],
];

const isLegal = (from: SubscriptionStatus, to: SubscriptionStatus) =>
  LEGAL.some(([f, t]) => f === from && t === to);

describe('subscription lifecycle', () => {
  it('covers every state in the enum', () => {
    // A state added without a row in the transition table would silently
    // permit nothing and refuse with a confusing message. This fails first.
    expect(SUBSCRIPTION_STATUSES.length).toBe(6);
  });

  describe.each(SUBSCRIPTION_STATUSES)('from %s', (from) => {
    it.each(SUBSCRIPTION_STATUSES)(`to %s`, (to) => {
      const result = canTransition(from, to);

      if (from === to) {
        expect(result.allowed, 'a state should not transition to itself').toBe(false);
        return;
      }

      expect(
        result.allowed,
        `${from} → ${to} should be ${isLegal(from, to) ? 'allowed' : 'refused'} per 08 §7`,
      ).toBe(isLegal(from, to));
    });
  });

  /** The one that matters most, stated on its own so a failure names itself. */
  it('never reactivates a cancelled subscription', () => {
    for (const to of SUBSCRIPTION_STATUSES) {
      const result = canTransition('cancelled', to);
      expect(result.allowed, `cancelled → ${to} must be refused`).toBe(false);
    }
  });

  it('explains a refusal in a sentence a person can act on', () => {
    const result = canTransition('cancelled', 'active');
    expect(result.allowed).toBe(false);
    if (result.allowed) return;

    // Not "invalid transition". The refusal names the alternative.
    expect(result.reason).toContain('Assign a plan to start a new one');
  });

  it('names the legal moves when refusing one that is not', () => {
    const result = canTransition('paused', 'past_due');
    expect(result.allowed).toBe(false);
    if (result.allowed) return;
    expect(result.reason).toContain('active');
    expect(result.reason).toContain('cancelled');
  });
});

describe('write permission by status', () => {
  /**
   * 06 §8 · 08 §7. `past_due` is READ-ONLY, not locked out. A customer who
   * cannot sign in cannot fix their billing, and Brian is the support team.
   */
  it('permits writes only while trialing or active', () => {
    expect(permitsWrites('trialing')).toBe(true);
    expect(permitsWrites('active')).toBe(true);

    expect(permitsWrites('past_due')).toBe(false);
    expect(permitsWrites('paused')).toBe(false);
    expect(permitsWrites('cancelled')).toBe(false);
    expect(permitsWrites('expired')).toBe(false);
  });
});

describe('status labels', () => {
  it('gives every status a phrase that reads inside a sentence', () => {
    for (const status of SUBSCRIPTION_STATUSES) {
      const label = subscriptionStatusLabel(status);
      expect(label.length).toBeGreaterThan(0);
      // The labels are interpolated into "A {label} subscription cannot…",
      // so an underscore would surface raw in the interface.
      expect(label).not.toContain('_');
    }
  });

  it('reads past_due as past due rather than as an identifier', () => {
    expect(subscriptionStatusLabel('past_due')).toBe('past due');
    expect(subscriptionStatusLabel('trialing')).toBe('on trial');
  });
});
