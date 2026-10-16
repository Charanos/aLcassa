import 'server-only';
import { sql } from 'drizzle-orm';
import { usageCounters } from '@/db/schema';
import { withTenantContext } from '@/lib/db';
import type { ResolvedContext } from '@/lib/db/context';
import { cacheDelete, cacheGet, cacheSet, CACHE_TTL, CACHE_USES } from '@/lib/cache';
import type {
  Entitlement,
  EntitlementDecision,
  EntitlementKey,
  EntitlementSnapshot,
} from './types';

/**
 * 08 §3 · ADR-005 · 01 D-04.
 *
 * ONE GUARD. BOTH DOORS.
 *
 * This is the substantive answer to the open question the brief raised.
 * Authentication and tenant resolution legitimately differ between the session
 * door and the service door. Plan-limit enforcement does not.
 *
 * AMENDED 24 Aug 2026, per 01 D-14 and 04 ADR-012's amendment to ADR-005: the
 * service door is moving to a FastAPI service, so "both paths call
 * checkEntitlement" is no longer literally true once that lands. This
 * function remains the specification and the session-door implementation;
 * FastAPI implements the same specification independently, against the same
 * `plan_entitlements` and `usage_counters` tables and the same Redis snapshot
 * shape below. Sameness is proven by the cross-language conformance suite in
 * 07 §12 rather than by both doors calling this function.
 *
 * The contract test in 07 §12 drives the same scenario through both doors and
 * asserts the same outcome. That test is the evidence, which is why this can be
 * presented to Brian as settled rather than as an intention, and why the M3
 * gate demonstrates it on screen rather than reporting it in a document.
 */
export async function checkEntitlement(
  ctx: ResolvedContext,
  key: EntitlementKey,
  delta = 1,
): Promise<EntitlementDecision> {
  const snapshot = await getEntitlementSnapshot(ctx);
  const entitlement = snapshot.byKey[key];

  // 08 §3, resolution order step 3: deny. There is no implicit default, because
  // an implicit default is how an unlimited resource ships by accident.
  if (!entitlement) {
    return { allowed: false, code: 'entitlement.feature_unavailable' };
  }

  if (entitlement.kind === 'feature') {
    return entitlement.enabled
      ? { allowed: true }
      : { allowed: false, code: 'entitlement.feature_unavailable' };
  }

  if (entitlement.limit === null) {
    return { allowed: true }; // unlimited
  }

  const projected = entitlement.current + delta;

  if (projected > entitlement.limit) {
    return {
      allowed: false,
      code: 'entitlement.limit_reached',
      details: { key, limit: entitlement.limit, current: entitlement.current },
    };
  }

  return { allowed: true, approachingLimit: projected / entitlement.limit >= 0.8 };
}

/**
 * Redis, falling back to Postgres. The fallback is not a safety net, it is the
 * ordinary path on every miss, which is why a cache outage changes latency and
 * nothing else. 08 §6.
 */
export async function getEntitlementSnapshot(ctx: ResolvedContext): Promise<EntitlementSnapshot> {
  const cacheKey = CACHE_USES.entitlements(ctx.tenantId);

  const hit = await cacheGet<EntitlementSnapshot>(cacheKey);
  if (hit) return hit;

  const snapshot = await loadSnapshot(ctx);
  await cacheSet(cacheKey, snapshot, CACHE_TTL.entitlements);
  return snapshot;
}

/**
 * 08 §3, resolution order:
 *   1. a live subscription_overrides row, if one exists and has not expired
 *   2. the plan_entitlements row for the tenant's current plan
 *   3. deny
 */
async function loadSnapshot(ctx: ResolvedContext): Promise<EntitlementSnapshot> {
  return withTenantContext(ctx, async (tx) => {
    type PlanRow = {
      key: string;
      kind: 'limit' | 'feature';
      displayName: string;
      limitValue: number | null;
      featureEnabled: boolean | null;
    };
    type OverrideRow = {
      key: string;
      limitValue: number | null;
      featureEnabled: boolean | null;
      reason: string;
      expiresAt: string | null;
    };
    const [data] = await tx.execute<{
      subscription: {
        status: EntitlementSnapshot['subscriptionStatus'];
        planId: string;
        planCode: string;
      } | null;
      planRows: PlanRow[];
      overrideRows: OverrideRow[];
      usageRows: { key: string; currentValue: number }[];
    }>(sql`with current_subscription as (
      select s.status,s.plan_id,p.code from public.subscriptions s join public.plans p on p.id=s.plan_id limit 1
    ) select
      (select jsonb_build_object('status',status,'planId',plan_id,'planCode',code) from current_subscription) as subscription,
      coalesce((select jsonb_agg(jsonb_build_object('key',key,'kind',kind,'displayName',display_name,
        'limitValue',limit_value,'featureEnabled',feature_enabled)) from public.plan_entitlements
        where plan_id=(select plan_id from current_subscription)),'[]'::jsonb) as "planRows",
      coalesce((select jsonb_agg(jsonb_build_object('key',key,'limitValue',limit_value,
        'featureEnabled',feature_enabled,'reason',reason,'expiresAt',expires_at)) from public.subscription_overrides
        where expires_at is null or expires_at>now()),'[]'::jsonb) as "overrideRows",
      coalesce((select jsonb_agg(jsonb_build_object('key',key,'currentValue',current_value))
        from public.usage_counters),'[]'::jsonb) as "usageRows"`);
    if (!data) throw new Error('Workspace allowances could not be read.');
    const { subscription, planRows, overrideRows, usageRows } = data;

    if (!subscription) {
      // A tenant without a subscription has no entitlements rather than
      // unlimited ones. Step 3 of the resolution order, made concrete.
      return {
        tenantId: ctx.tenantId,
        planCode: 'none',
        subscriptionStatus: 'none',
        byKey: {},
        compiledAt: new Date().toISOString(),
      };
    }

    const usageByKey = new Map(usageRows.map((row) => [row.key, row.currentValue]));
    const overrideByKey = new Map(overrideRows.map((row) => [row.key, row]));

    const byKey: Partial<Record<EntitlementKey, Entitlement>> = {};

    // Live overrides remain grants even when the plan omits that key.
    const effectiveRows = [
      ...planRows,
      ...overrideRows
        .filter((row) => !planRows.some((plan) => plan.key === row.key))
        .map((row) => ({
          key: row.key,
          kind: row.featureEnabled !== null ? ('feature' as const) : ('limit' as const),
          displayName: row.key === 'api_keys' ? 'API keys' : row.key.replaceAll('_', ' '),
          limitValue: row.limitValue,
          featureEnabled: row.featureEnabled,
        })),
    ];
    for (const row of effectiveRows) {
      const key = row.key as EntitlementKey;
      const override = overrideByKey.get(row.key);

      const entitlement: Entitlement = {
        key,
        displayName: row.displayName,
        kind: row.kind,
        limit: override ? (override.limitValue ?? null) : (row.limitValue ?? null),
        current: usageByKey.get(row.key) ?? 0,
        enabled: override
          ? (override.featureEnabled ?? row.featureEnabled ?? false)
          : (row.featureEnabled ?? false),
        override: override
          ? {
              reason: override.reason,
              expiresAt: override.expiresAt ? new Date(override.expiresAt).toISOString() : null,
            }
          : null,
      };

      byKey[key] = entitlement;
    }

    return {
      tenantId: ctx.tenantId,
      planCode: subscription.planCode,
      subscriptionStatus: subscription.status,
      byKey,
      compiledAt: new Date().toISOString(),
    };
  });
}

/**
 * Called by whatever changed the numbers: a plan assignment, an override, or a
 * counter increment inside an operation's transaction. Explicit invalidation on
 * write, never left to expiry. 08 §6.
 */
export async function invalidateEntitlements(tenantId: string): Promise<void> {
  await cacheDelete(CACHE_USES.entitlements(tenantId));
}

/**
 * The guard, as a thrown error rather than a returned decision, for the common
 * case in a handler. `checkEntitlement` stays available for the cases that need
 * to branch on `approachingLimit`.
 */
export async function assertEntitlement(
  ctx: ResolvedContext,
  key: EntitlementKey,
  delta = 1,
): Promise<void> {
  const decision = await checkEntitlement(ctx, key, delta);
  if (decision.allowed) return;

  const { AppError } = await import('@/lib/errors');
  throw new AppError(decision.code, {
    ...(decision.details
      ? {
          details: [
            {
              field: decision.details.key,
              code: decision.code,
              message: `Limit ${String(decision.details.limit)}, currently ${String(decision.details.current)}.`,
            },
          ],
        }
      : {}),
  });
}

/**
 * 08 §3 · 05 I-13. The counter is incremented inside the same transaction as
 * the operation that consumed the resource, with a row lock. Never a periodic
 * recount as the source of truth: the nightly reconciliation job rebuilds each
 * counter from its source rows and ALERTS on divergence rather than silently
 * correcting it, because a silent correction hides the bug that caused it.
 */
export async function incrementUsage(
  tx: Parameters<Parameters<typeof withTenantContext>[1]>[0],
  tenantId: string,
  key: EntitlementKey,
  delta = 1,
): Promise<void> {
  const { sql } = await import('drizzle-orm');

  await tx
    .insert(usageCounters)
    .values({ tenantId, key, currentValue: delta, peakValue: Math.max(delta, 0) })
    .onConflictDoUpdate({
      target: [usageCounters.tenantId, usageCounters.key],
      set: {
        currentValue: sql`${usageCounters.currentValue} + ${delta}`,
        peakValue: sql`greatest(${usageCounters.peakValue}, ${usageCounters.currentValue} + ${delta})`,
        updatedAt: new Date(),
      },
    });
}
