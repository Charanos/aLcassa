/**
 * 08 §7. THE SUBSCRIPTION LIFECYCLE, AS DATA RATHER THAN AS `if` STATEMENTS.
 *
 * ```
 *         provisioning
 *              │ tenant created
 *              ▼
 *         trialing ──trial ends──▶ active
 *              │                     │
 *              │                     │ marked past due by platform
 *              │                     ▼
 *              │                 past_due ──reactivated──▶ active
 *              │                     │
 *              │                     │ not resolved
 *              ▼                     ▼
 *         cancelled ◀──────────── expired
 * ```
 *
 * ⚠ EVERY TRANSITION IS A PLATFORM ACTION. NOTHING HERE HAPPENS ON A TIMER.
 *
 * `08 §1` draws that boundary deliberately: "Status transitions happen by
 * platform action, not by payment event. Brian marks a tenant past due;
 * nothing does it automatically." A scheduled job that expired trials would
 * be billing automation arriving through the back door, and the brief
 * excludes it.
 *
 * ⚠ WHY A TABLE AND NOT A SWITCH.
 *
 * Six states permit fifteen ordered pairs and only nine of them are legal.
 * Written as conditionals at each call site, the illegal six are enforced by
 * whoever remembers — and the expensive one to get wrong is
 * `cancelled → active`, which silently restores a customer who stopped
 * paying. Written here, the whole machine is one screen and a reviewer can
 * check it against the diagram above without reading any handler.
 */

export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
  'expired',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * What each state may become, and the sentence a reader gets when it may not.
 *
 * The reasons are written for the person on the other side of the console,
 * not for a log: "a cancelled subscription cannot be reactivated" is a fact
 * about the product, and the alternative it names is the useful part.
 */
const ALLOWED: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  // 08 §7, confirmed 24 Aug 2026: the sole entry state. A trial that is not
  // converted moves to `expired` rather than lingering.
  trialing: ['active', 'expired', 'cancelled'],
  active: ['past_due', 'paused', 'cancelled'],
  // Reactivation is the whole point of this state existing separately from
  // cancelled: the customer can still see and fix their situation (06 §8).
  past_due: ['active', 'expired', 'cancelled'],
  paused: ['active', 'cancelled'],
  /**
   * ⚠ TERMINAL, AND DELIBERATELY SO.
   *
   * Reactivating a cancelled subscription in place would resurrect a
   * subscription with its old period dates and its old plan, quietly
   * restoring access for someone who left. Starting again is a new
   * subscription with a new period — which is also what makes the audit
   * trail readable a year later.
   */
  cancelled: [],
  // Expired can be revived, because it is the end of a trial or an unresolved
  // past_due rather than a decision the customer made. Assigning a plan is
  // what does it, which is why `active` is reachable and nothing else is.
  expired: ['active', 'cancelled'],
};

export type TransitionCheck = { allowed: true } | { allowed: false; reason: string };

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): TransitionCheck {
  if (from === to) {
    return { allowed: false, reason: `This subscription is already ${label(from)}.` };
  }

  if (ALLOWED[from].includes(to)) return { allowed: true };

  if (from === 'cancelled') {
    return {
      allowed: false,
      reason:
        'A cancelled subscription cannot be reactivated. Assign a plan to start a new one, which keeps the cancellation in the record rather than overwriting it.',
    };
  }

  return {
    allowed: false,
    reason: `A ${label(from)} subscription cannot become ${label(to)}. It can become ${
      ALLOWED[from].length > 0 ? ALLOWED[from].map(label).join(' or ') : 'nothing further'
    }.`,
  };
}

/** The words the interface uses, so a refusal reads as a sentence. 10 §6. */
export function label(status: SubscriptionStatus): string {
  const words: Record<SubscriptionStatus, string> = {
    trialing: 'on trial',
    active: 'active',
    past_due: 'past due',
    paused: 'paused',
    cancelled: 'cancelled',
    expired: 'expired',
  };
  return words[status];
}

/**
 * 06 §8 · 08 §7. Whether this status permits writes.
 *
 * `past_due` applies the read-only suspension behaviour rather than blocking
 * sign-in, "so a customer can see and fix their situation". A customer locked
 * out entirely opens a support ticket, and Brian is the support team.
 *
 * ⚠ THIS IS NOT THE ENFORCEMENT. The enforcement is `app.tenant_is_writable()`
 * in `00_context.sql`, which every modify policy calls. This function exists
 * so the INTERFACE can explain the refusal before a person hits it, and if
 * the two ever disagree the policy wins.
 */
export function permitsWrites(status: SubscriptionStatus): boolean {
  return status === 'trialing' || status === 'active';
}
