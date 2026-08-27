import 'server-only';
import { asc, eq, sql } from 'drizzle-orm';
import { planEntitlements, plans, subscriptions } from '@/db/schema';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { withoutTenantContext } from '@/lib/db';
import { watchlist, type WatchlistEntry } from '@/modules/platform';
import type { EntitlementRow, PlanHead, PlansModel } from './data';

/**
 * The M3 half of the console read model, against the real database.
 *
 * ⚠ WHY THIS IS A SEPARATE FILE, AND WHY IT FALLS BACK.
 *
 * Same reasoning as `lib/tenant/live.ts`: `data.ts` is a fixture seam, and a
 * file where some functions read a database and some invent their answer is a
 * file with nothing in a call site to say which. A page importing from
 * `./live` is reading the truth; one importing from `./data` is not yet.
 *
 * The fallback keeps the review deployment usable — `/api/demo` hands out a
 * console cookie that names no real session, so these return null and the
 * designed data is shown.
 */

/**
 * 08 §2 · design sheet 05. The plan comparison, from the real catalogue.
 *
 * ⚠ THE FIXTURE THIS REPLACES WAS SHOWING PLANS THAT DO NOT EXIST.
 *
 * It listed Trial, Starter, Growth and Scale with rows for events per month,
 * storage and SSO — the four-tier proposal replaced on 24 Aug 2026, against
 * entitlement keys that were never in the schema. Every number on that screen
 * was defensible when it was drawn and none of it was true by the time the
 * plans were confirmed, which is precisely the cost of a fixture that outlives
 * its decision.
 */
export async function getLivePlans(): Promise<PlansModel | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withoutTenantContext(ctx.requestId, async (tx) => {
    const planRows = await tx
      .select({
        id: plans.id,
        code: plans.code,
        name: plans.name,
        priceAmount: plans.priceAmount,
        currency: plans.currency,
      })
      .from(plans)
      .where(eq(plans.isActive, true))
      .orderBy(asc(plans.sortOrder), asc(plans.priceAmount));

    if (planRows.length === 0) return null;

    const entitlementRows = await tx
      .select({
        planId: planEntitlements.planId,
        key: planEntitlements.key,
        displayName: planEntitlements.displayName,
        limitValue: planEntitlements.limitValue,
        displayOrder: planEntitlements.displayOrder,
      })
      .from(planEntitlements);

    const counts = await tx
      .select({ planId: subscriptions.planId, n: sql<number>`count(*)::int` })
      .from(subscriptions)
      .groupBy(subscriptions.planId);

    const countByPlan = new Map(counts.map((row) => [row.planId, row.n]));

    const heads: PlanHead[] = planRows.map((plan) => {
      const n = countByPlan.get(plan.id) ?? 0;
      return {
        key: plan.code,
        name: plan.name,
        /**
         * 08 §2 · seed constants. Custom is "Tailored", identified by its
         * CODE and never by `priceAmount === 0` — the seed file is explicit
         * that reading zero as free is wrong, and there is no free plan.
         */
        price:
          plan.code === 'custom'
            ? 'Tailored'
            : `${plan.currency} ${plan.priceAmount.toLocaleString('en-GB')}`,
        tenants: `${n} ${n === 1 ? 'workspace' : 'workspaces'}`,
        count: n,
      };
    });

    // One row per entitlement key, one column per plan, in the order the
    // plans are shown — so a cell's position is its plan without a lookup.
    const byKey = new Map<string, { displayName: string; order: number; byPlan: Map<string, number | null> }>();

    for (const row of entitlementRows) {
      const entry = byKey.get(row.key) ?? {
        displayName: row.displayName,
        order: row.displayOrder,
        byPlan: new Map<string, number | null>(),
      };
      entry.byPlan.set(row.planId, row.limitValue);
      byKey.set(row.key, entry);
    }

    const rows: EntitlementRow[] = [...byKey.entries()]
      .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]))
      .map(([key, entry]) => ({
        label: entry.displayName,
        icon: iconFor(key),
        values: planRows.map((plan) => {
          const value = entry.byPlan.get(plan.id);
          if (value === undefined) return '—';
          // 03 §10 · 08 §2. Unlimited is the glyph, never a full bar and
          // never a large number standing in for one.
          if (value === null) return '∞';
          if (key === 'audit_retention_days') return `${value} days`;
          if (key === 'support_sla_hours') return `${value} hours`;
          return value.toLocaleString('en-GB');
        }),
      }));

    const overrideCount = await tx.execute(
      sql`select count(*)::int as n from subscription_overrides
          where expires_at is null or expires_at > now()`,
    );
    const unassigned = await tx.execute(
      sql`select count(*)::int as n from tenants t
          where t.deleted_at is null
            and not exists (select 1 from subscriptions s where s.tenant_id = t.id)`,
    );

    return {
      plans: heads,
      rows,
      overrides: firstCount(overrideCount),
      unassigned: firstCount(unassigned),
      /**
       * ⚠ EMPTY, AND NOT FABRICATED.
       *
       * The design's blast-radius dialog is driven by a PENDING edit — a
       * limit the operator has changed but not committed. Nothing is pending
       * on a freshly loaded screen, so inventing one here would put a
       * confirmation in front of a decision nobody has made. The real
       * computation is `previewPlanChange`, which runs when an edit is
       * actually proposed; editing plan limits from the console is M4's
       * screen, and this field stays inert until it exists.
       */
      pendingChange: {
        plan: '',
        field: '',
        from: '',
        to: '',
        affected: 0,
        breaching: [],
      },
    };
  });
}

/**
 * 08 §9. The watchlist, for the overview and health screens.
 *
 * Returns an empty list rather than null when nobody needs attention: "no
 * tenant is near a limit" is a real and good answer, and a caller that got
 * null could not tell it apart from "not signed in".
 */
export async function getLiveWatchlist(): Promise<WatchlistEntry[] | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return watchlist({
    userId: ctx.actorId,
    label: ctx.actorLabel,
    requestId: ctx.requestId,
    ipAddress: ctx.ipAddress,
  });
}

function firstCount(result: unknown): number {
  const rows = result as { n?: number }[];
  return rows[0]?.n ?? 0;
}

/** The design's icon set, mapped by entitlement key. An unknown key gets the
 *  neutral one rather than no icon, so a new entitlement renders. */
function iconFor(key: string): EntitlementRow['icon'] {
  const icons: Record<string, EntitlementRow['icon']> = {
    seats: 'seat',
    conversations_monthly: 'mail',
    channels: 'bolt',
    api_keys: 'key',
    kb_documents: 'db',
    ai_rules_versions: 'bot',
    audit_retention_days: 'clock',
    support_sla_hours: 'shield',
  };
  return icons[key] ?? 'shield';
}
