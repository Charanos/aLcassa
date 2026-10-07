import 'server-only';
import { sql } from 'drizzle-orm';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { withActorContext, type Transaction } from '@/lib/db';
import { AUDIT_ACTIONS } from '@/lib/audit';
import type { RevenueModel } from './data';
import {
  computeRevenue,
  readSubscriptionInterval,
  type ContractChange,
  type ContractRow,
  type RevenueFigures,
} from './revenue';
import { buildRevenueModel } from './revenueModel';

/**
 * REVENUE, FROM THE SUBSCRIPTIONS. Doc 25 · R1.
 *
 * ⚠ THE PAGE USED TO READ A CODE FIXTURE AND THE TRACKER SAID IT READ THE
 *   DATABASE. Every figure on `/platform/revenue` came from `portfolio.ts`,
 *   while the M4 note told the client it ran on real data. This reads every
 *   workspace, its subscription and its plan, as the signed-in operator (the
 *   D1 operator policies admit those three tables to a platform admin outside a
 *   support session), and hands the rows to the same `computeRevenue` the
 *   designed fallback uses.
 *
 * ⚠ CONTRACTED, NOT COLLECTED. Nothing in Phase 1 records a payment, so the
 *   figures are what the subscriptions commit customers to. The page and the
 *   export both say so.
 *
 * Returns null without a platform session, and the page falls back to the
 * designed portfolio with a marker saying it has.
 */

type Row = {
  tenant_id: string;
  slug: string;
  name: string;
  tenant_status: ContractRow['tenantStatus'];
  provisioned_at: Date | string;
  suspended_at: Date | string | null;
  tenant_updated_at: Date | string;
  sub_status: NonNullable<ContractRow['subscription']>['status'] | null;
  contract_amount: number | string | null;
  trial_ends_at: Date | string | null;
  past_due_since: Date | string | null;
  cancelled_at: Date | string | null;
  current_period_start: Date | string | null;
  current_period_end: Date | string | null;
  cancel_at_period_end: boolean | null;
  sub_updated_at: Date | string | null;
  plan_code: string | null;
  plan_name: string | null;
  price_amount: number | string | null;
  interval_unit: string | null;
  interval_count: number | null;
};

const at = (v: Date | string | null): Date | null => (v === null ? null : new Date(v));

/** Every workspace's contract. Exported for the notifications reader. */
export async function readContractRows(tx: Transaction): Promise<ContractRow[]> {
  const rows = (await tx.execute(sql`
    select
      t.id as tenant_id, t.slug, t.name, t.status::text as tenant_status,
      coalesce(t.provisioned_at, t.created_at) as provisioned_at,
      case when t.status in ('suspended', 'closed')
           then coalesce(t.suspended_at, t.updated_at) end as suspended_at,
      t.updated_at as tenant_updated_at,
      s.status::text as sub_status, s.contract_amount, s.trial_ends_at, s.past_due_since,
      s.cancelled_at, s.updated_at as sub_updated_at,
      s.current_period_start, s.current_period_end, s.cancel_at_period_end,
      p.code as plan_code, p.name as plan_name, p.price_amount,
      p.interval_unit, p.interval_count
    from tenants t
    left join subscriptions s on s.tenant_id = t.id
    left join plans p on p.id = s.plan_id
    where t.deleted_at is null
    order by t.name
  `)) as unknown as Row[];

  return rows.map((r) => ({
    tenantId: r.tenant_id,
    slug: r.slug,
    name: r.name,
    tenantStatus: r.tenant_status,
    provisionedAt: new Date(r.provisioned_at),
    suspendedAt: at(r.suspended_at),
    subscription: r.sub_status
      ? {
          status: r.sub_status,
          /* A subscription on a plan that has since been retired reads its plan
             as missing (plans_select admits active plans only). It is then
             unpriced, and the page names it rather than counting it as zero. */
          planCode: r.plan_code ?? 'retired',
          planName: r.plan_name ?? 'a retired plan',
          listPrice: Number(r.price_amount ?? 0),
          intervalUnit: readSubscriptionInterval(r.interval_unit),
          intervalCount: r.interval_count ?? 1,
          contractAmount: r.contract_amount === null ? null : Number(r.contract_amount),
          trialEndsAt: at(r.trial_ends_at),
          pastDueSince: at(r.past_due_since),
          stoppedAt:
            r.sub_status === 'cancelled'
              ? (at(r.cancelled_at) ?? at(r.sub_updated_at))
              : r.sub_status === 'expired' || r.sub_status === 'paused'
                ? at(r.sub_updated_at)
                : null,
          currentPeriodStart: at(r.current_period_start),
          currentPeriodEnd: at(r.current_period_end),
          cancelAtPeriodEnd: r.cancel_at_period_end ?? false,
        }
      : null,
  }));
}

/**
 * Dated changes to a contract's monthly value, from the platform log.
 *
 * `assignPlan` and `setContractAmount` record the monthly value before and
 * after in the audit row's `before` / `after`. Rows written before that began
 * carry no value and are skipped — the curve then shows the current contract
 * for the whole year, which is the stated limitation, not a guess.
 */
async function readContractChanges(tx: Transaction): Promise<ContractChange[]> {
  const rows = (await tx.execute(sql`
    select target_tenant_id as tenant_id, occurred_at,
           (before->>'monthly')::bigint as from_value,
           (after->>'monthly')::bigint as to_value
    from platform_audit_log
    where action in (${AUDIT_ACTIONS.SUBSCRIPTION_PLAN_ASSIGNED}, ${AUDIT_ACTIONS.SUBSCRIPTION_CONTRACT_SET})
      and target_tenant_id is not null
      and before ? 'monthly' and after ? 'monthly'
      and occurred_at > now() - interval '13 months'
  `)) as unknown as Array<{
    tenant_id: string;
    occurred_at: Date | string;
    from_value: number | string | null;
    to_value: number | string | null;
  }>;

  return rows.map((r) => ({
    tenantId: r.tenant_id,
    at: new Date(r.occurred_at),
    from: Number(r.from_value ?? 0),
    to: Number(r.to_value ?? 0),
  }));
}

export async function getLiveRevenueFigures(): Promise<RevenueFigures | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  return withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
    const rows = await readContractRows(tx);
    const changes = await readContractChanges(tx);
    // An authenticated empty portfolio is real data. Never replace it with examples.
    return computeRevenue(rows, new Date(), changes);
  });
}

export async function getLiveRevenue(): Promise<RevenueModel | null> {
  const figures = await getLiveRevenueFigures();
  return figures ? buildRevenueModel(figures, 'live') : null;
}
