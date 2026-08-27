/**
 * 04 §3 · 11 §6. The only file another module may import.
 *
 * ⚠ THIS MODULE IS THE STATE MACHINE AND NOTHING ELSE, AND THE SPLIT WAS NOT
 *   THE ORIGINAL PLAN.
 *
 * The administration functions — assign a plan, change a status, grant an
 * override — were written here first. The lint rule refused them, because
 * every one of them needs the service-role client and that may be imported
 * only inside `src/modules/platform`. The rule was right: those are platform
 * actions, and the exemption list has one entry precisely so it does not
 * acquire a second.
 *
 * So they live in `modules/platform/internal/subscriptions.ts`, and what
 * remains here is the part that carries no privilege: which lifecycle
 * transitions are legal, what each state is called, and whether a state
 * permits writes. Both doors read it, neither can bypass it, and it needs no
 * database access at all — which is why it can also be unit-tested without one.
 */

export {
  SUBSCRIPTION_STATUSES,
  canTransition,
  label as subscriptionStatusLabel,
  permitsWrites,
} from './transitions';
export type { SubscriptionStatus, TransitionCheck } from './transitions';
