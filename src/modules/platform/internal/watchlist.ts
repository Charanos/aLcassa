import 'server-only';
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';
import {
  planEntitlements,
  plans,
  subscriptionOverrides,
  subscriptions,
  tenants,
  usageCounters,
} from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService } from '@/lib/db/serviceClient';
import type { PlatformActor } from './subscriptions';

/**
 * 08 §9. THE WATCHLIST.
 *
 * "Tenants above 80% on any limit, and tenants past due. Sorted by how close
 * they are. That list is the closest thing this Phase 1 has to a revenue
 * feature, and it costs one query."
 *
 * ⚠ IT IS A CROSS-TENANT READ, WHICH IS WHY IT IS A SERVICE-ROLE CALL.
 *
 * `serviceClient.ts` permits exactly four operations and "list tenants" is
 * one of them, on the grounds that it "reads across all tenants by
 * definition". This is that operation with a predicate on it. What it must
 * never become is a way to read tenant CONTENT across tenants — it returns
 * counts and limits, never a member, a message or a credential, and that
 * boundary is the difference between a commercial dashboard and a hole.
 *
 * ⚠ THE 80% THRESHOLD IS THE SAME NUMBER THE INTERFACE USES.
 *
 * `03 §10` turns a `LimitBar` ochre at 80%, and `08 §3` says the console
 * picks the tenant up at the same point. Two constants that are supposed to
 * be one is how a tenant comes to be amber on their own screen and absent
 * from the list that would have prompted a conversation.
 */

/** 08 §3 · 03 §10. Ochre on the bar, and on the watchlist, at the same point. */
export const ATTENTION_THRESHOLD = 0.8;

export type WatchlistEntry = {
  tenantId: string;
  slug: string;
  name: string;
  status: string;
  planCode: string;
  /** The single closest limit, which is what the row is sorted by. */
  nearest: {
    key: string;
    displayName: string;
    current: number;
    limit: number;
    ratio: number;
  } | null;
  /** Every limit at or above the threshold, so a row can be expanded. */
  pressured: Array<{ key: string; displayName: string; current: number; limit: number; ratio: number }>;
  /** 08 §7. Past due is on the list regardless of usage: it is a commercial
   *  signal on its own, and the reason the list is not called "usage". */
  pastDue: boolean;
};

export async function watchlist(actor: PlatformActor): Promise<WatchlistEntry[]> {
  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.SUBSCRIPTION_STATUS_CHANGED,
      entityType: 'watchlist',
      reason: 'console watchlist read',
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      /**
       * One query, as 08 §9 promises.
       *
       * The override join is what makes the number honest: a tenant granted
       * 15 seats on a 10-seat plan is at 12/15, not 12/10, and putting them
       * on a watchlist for a limit they were explicitly given room past is
       * how a commercial prompt becomes noise. `coalesce` prefers the
       * override, matching the resolution order in 08 §3.
       */
      const rows = await tx
        .select({
          tenantId: tenants.id,
          slug: tenants.slug,
          name: tenants.name,
          status: subscriptions.status,
          planCode: plans.code,
          key: planEntitlements.key,
          displayName: planEntitlements.displayName,
          limitValue: sql<number | null>`coalesce(${subscriptionOverrides.limitValue}, ${planEntitlements.limitValue})`,
          currentValue: sql<number>`coalesce(${usageCounters.currentValue}, 0)`,
        })
        .from(tenants)
        .innerJoin(subscriptions, eq(subscriptions.tenantId, tenants.id))
        .innerJoin(plans, eq(plans.id, subscriptions.planId))
        .innerJoin(planEntitlements, eq(planEntitlements.planId, plans.id))
        .leftJoin(
          usageCounters,
          and(eq(usageCounters.tenantId, tenants.id), eq(usageCounters.key, planEntitlements.key)),
        )
        .leftJoin(
          subscriptionOverrides,
          and(
            eq(subscriptionOverrides.tenantId, tenants.id),
            eq(subscriptionOverrides.key, planEntitlements.key),
            or(
              isNull(subscriptionOverrides.expiresAt),
              gt(subscriptionOverrides.expiresAt, new Date()),
            ),
          ),
        )
        .where(isNull(tenants.deletedAt));

      const byTenant = new Map<string, WatchlistEntry>();

      for (const row of rows) {
        const entry =
          byTenant.get(row.tenantId) ??
          ({
            tenantId: row.tenantId,
            slug: row.slug,
            name: row.name,
            status: row.status,
            planCode: row.planCode,
            nearest: null,
            pressured: [],
            pastDue: row.status === 'past_due',
          } satisfies WatchlistEntry);

        byTenant.set(row.tenantId, entry);

        // null is unlimited and can never be under pressure. A ratio against
        // it would be a division by nothing, and a full bar for an unlimited
        // plan is a lie (03 §10).
        if (row.limitValue === null || row.limitValue <= 0) continue;

        const ratio = row.currentValue / row.limitValue;
        if (ratio < ATTENTION_THRESHOLD) continue;

        const pressured = {
          key: row.key,
          displayName: row.displayName,
          current: row.currentValue,
          limit: row.limitValue,
          ratio,
        };
        entry.pressured.push(pressured);
        if (!entry.nearest || ratio > entry.nearest.ratio) entry.nearest = pressured;
      }

      return (
        [...byTenant.values()]
          .filter((entry) => entry.pastDue || entry.pressured.length > 0)
          /**
           * "Sorted by how close they are." Past due sorts above usage
           * pressure regardless of ratio: a tenant who has stopped paying is
           * a more urgent conversation than one approaching a ceiling, and a
           * list that buried them under six tenants at 84% of their seats
           * would be sorted correctly and read wrongly.
           */
          .sort((a, b) => {
            if (a.pastDue !== b.pastDue) return a.pastDue ? -1 : 1;
            return (b.nearest?.ratio ?? 0) - (a.nearest?.ratio ?? 0);
          })
      );
    },
  );
}
