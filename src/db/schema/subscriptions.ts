import {
  bigint,
  boolean,
  char,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { pk, timestamps, version } from './_shared';
import { tenantRef, tenants } from './tenancy';

/**
 * 05 §5 · 08. Entitlements are DATA. Adding a fourth tier between Business and
 * Custom is inserting a plan and eight entitlement rows, with no deployment.
 * That is what makes "plan changes mid-build" a non-risk on this engagement.
 */

export const plans = pgTable('plans', {
  id: pk(),
  code: text('code').notNull().unique(), // pro | business | custom. Confirmed 24 Aug 2026, no free plan.
  name: text('name').notNull(),
  description: text('description'),
  // 07 §1. Money is { amount, currency } in minor units on the wire, and minor
  // units here. Never a formatted string, in either place.
  priceAmount: bigint('price_amount', { mode: 'number' }).notNull().default(0),
  currency: char('currency', { length: 3 }).notNull().default('KES'),
  intervalUnit: text('interval_unit').notNull().default('month'),
  intervalCount: integer('interval_count').notNull().default(1),
  trialDays: integer('trial_days').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
});

export const entitlementKind = pgEnum('entitlement_kind', ['limit', 'feature']);

export const planEntitlements = pgTable(
  'plan_entitlements',
  {
    id: pk(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id, { onDelete: 'cascade' }),
    key: text('key').notNull(), // seats | channels | api_keys | ...
    kind: entitlementKind('kind').notNull(),
    limitValue: integer('limit_value'), // NULL MEANS UNLIMITED, rendered as ∞
    featureEnabled: boolean('feature_enabled'),
    displayName: text('display_name').notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('plan_entitlements_unique').on(t.planId, t.key)],
);

export const subscriptionStatus = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'paused',
  'cancelled',
  'expired',
]);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: pk(),
    tenantId: uuid('tenant_id')
      .notNull()
      .unique() // I-14. One active subscription per tenant, by index not by hope.
      .references(() => tenants.id, { onDelete: 'restrict' }),
    planId: uuid('plan_id')
      .notNull()
      .references(() => plans.id),
    status: subscriptionStatus('status').notNull(),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    // 08 §7. Cancellation at period end is a flag, not an immediate state
    // change: the tenant keeps access until currentPeriodEnd and the interface
    // shows the date.
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),

    /**
     * 08 §1. THE PAYMENT STUBS. Three nullable columns, never populated in
     * Phase 1, so that connecting a gateway later is a service and a webhook
     * rather than a migration and a data backfill. "No billing automation"
     * means no Stripe, no Paystack, no M-Pesa, no invoices, no dunning, no
     * proration and no tax; it does not mean pretending payment will never
     * exist.
     */
    externalCustomerRef: text('external_customer_ref'),
    externalSubscriptionRef: text('external_subscription_ref'),
    paymentProvider: text('payment_provider'),

    version,
    ...timestamps,
  },
  (t) => [index('subscriptions_renewal_idx').on(t.status, t.currentPeriodEnd)],
);

/**
 * 05 §5. Not in the brief, and it costs one table.
 *
 * Without it, the first time Brian wants to give a customer 15 seats on a
 * 10-seat Business plan his only options are inventing a bespoke plan or
 * editing the shared plan and affecting everyone. Both are worse. The reason field is
 * mandatory and it appears in the tenant's own audit log, because a customer
 * who has been granted extra seats should know it and should know it may expire.
 */
export const subscriptionOverrides = pgTable(
  'subscription_overrides',
  {
    id: pk(),
    tenantId: tenantRef(),
    key: text('key').notNull(),
    limitValue: integer('limit_value'),
    featureEnabled: boolean('feature_enabled'),
    reason: text('reason').notNull(),
    grantedBy: uuid('granted_by').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex('sub_overrides_unique').on(t.tenantId, t.key)],
);

/**
 * 08 §3 · I-13. Incremented inside the same transaction as the operation that
 * consumed the resource, with a row lock. The nightly reconciliation job
 * rebuilds each counter from its source rows and ALERTS on divergence rather
 * than silently correcting it, because silent correction hides the bug.
 */
export const usageCounters = pgTable(
  'usage_counters',
  {
    id: pk(),
    tenantId: tenantRef(),
    key: text('key').notNull(),
    currentValue: integer('current_value').notNull().default(0),
    peakValue: integer('peak_value').notNull().default(0),
    lastRecalculatedAt: timestamp('last_recalculated_at', { withTimezone: true }),
    version,
    ...timestamps,
  },
  (t) => [uniqueIndex('usage_counters_unique').on(t.tenantId, t.key)],
);

export type Plan = typeof plans.$inferSelect;
export type PlanEntitlement = typeof planEntitlements.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type SubscriptionOverride = typeof subscriptionOverrides.$inferSelect;
export type UsageCounter = typeof usageCounters.$inferSelect;
export type SubscriptionStatus = (typeof subscriptionStatus.enumValues)[number];
