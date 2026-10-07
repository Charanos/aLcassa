import type { Collection, Kpi, RevenueModel, WorkspaceContract } from './data';
import { kes, shortKes, type Contract, type RevenueFigures, type Standing } from './revenue';

/**
 * The revenue screen's model, from contracted-value figures. Doc 25 · R1.
 *
 * One builder for both sources — the live reader passes figures computed over
 * the database, the designed fallback passes figures computed over the seeded
 * portfolio — so the two screens cannot word or round anything differently.
 */
export function buildRevenueModel(f: RevenueFigures, source: RevenueModel['source']): RevenueModel {
  const last = f.series[f.series.length - 1];
  const previous = f.series[f.series.length - 2];
  const change = last && previous ? last.mrr - previous.mrr : 0;
  const changePct =
    previous && previous.mrr > 0 ? Math.round((Math.abs(change) / previous.mrr) * 1000) / 10 : 0;

  const kpis: Kpi[] = [
    {
      label: 'Monthly subscription value',
      value: shortKes(f.mrr),
      note: `KES per month · ${f.paying} contracted ${f.paying === 1 ? 'workspace' : 'workspaces'}`,
      delta: previous && previous.mrr > 0 ? `${changePct}%` : '—',
      direction: change >= 0 ? 'up' : 'down',
      good: change >= 0,
      icon: 'coin',
    },
    {
      label: 'Annual subscription value',
      value: shortKes(f.arr),
      note: 'KES · this month’s contracts × 12',
      delta: '—',
      direction: 'up',
      good: true,
      icon: 'trend',
    },
    {
      label: 'Average per workspace',
      value: shortKes(f.averagePerPaying),
      note: `KES per month · ${f.paying} contracted ${f.paying === 1 ? 'workspace' : 'workspaces'}`,
      delta: '—',
      direction: 'up',
      good: true,
      icon: 'users',
    },
    {
      label: 'Potential trial value',
      value: shortKes(f.trials.value),
      note:
        f.trials.count === 0
          ? 'no workspaces on trial'
          : `KES a month if ${f.trials.count === 1 ? 'the trial converts' : `all ${f.trials.count} trials convert`}${f.trials.ended ? ` · ${f.trials.ended} ended, undecided` : ''}`,
      delta: '—',
      direction: 'up',
      good: true,
      icon: 'clock',
    },
    {
      label: 'Estimated amount due',
      value: shortKes(f.unpaid),
      note:
        f.pastDueCount === 0 ? 'nothing past due' : `KES fallen due · ${f.pastDueCount} past due`,
      delta: '—',
      direction: 'up',
      good: f.unpaid === 0,
      icon: 'down',
      ...(f.unpaid > 0 ? { tone: 'danger' as const } : {}),
    },
  ];

  const collections: Collection[] = f.collections.map((c) => ({
    id: c.tenantId,
    slug: c.slug,
    name: c.name,
    plan: c.subscription?.planName ?? '—',
    monthly: (c.monthly ?? 0).toLocaleString('en-GB'),
    amount: (c.arrears?.amount ?? 0).toLocaleString('en-GB'),
    periods: c.arrears?.periods ?? 0,
    days: c.arrears?.days ?? 0,
    state: c.standing === 'stopped' ? 'suspended' : 'past due',
  }));

  const caveats: string[] = [];
  for (const c of f.unpriced) {
    caveats.push(
      `${c.name} is on ${c.subscription?.planName ?? 'a plan'} with no contract price recorded, so it is left out of every figure here. Set its price on the workspace's billing tab.`,
    );
  }
  for (const c of f.unsubscribed) {
    caveats.push(`${c.name} has no subscription record, so it is counted nowhere on this page.`);
  }

  return {
    kpis,
    mrr: f.series.map((m) => ({ month: m.month, mrr: m.mrr, net: m.net })),
    movement: f.series.map((m) => ({
      month: m.month,
      new: m.new,
      expansion: m.expansion,
      contraction: m.contraction,
      churn: m.churn,
    })),
    planMix: f.byPlan.map((p) => ({
      name: p.name,
      value: p.value,
      tenants: `${p.count} ${p.count === 1 ? 'workspace' : 'workspaces'}`,
      display: kes(p.value),
    })),
    ageing: f.ageing,
    currency: 'KES',
    outstanding: shortKes(f.unpaid),
    collections,
    caveats,
    source,
  };
}

const NAIROBI_DAY = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Nairobi',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const day = (at: Date | null): string | null => (at ? NAIROBI_DAY.format(at) : null);

/** One contract, formatted for a workspace's billing tab. */
export function toWorkspaceContract(c: Contract): WorkspaceContract | null {
  const sub = c.subscription;
  if (!sub) return null;

  const basis: WorkspaceContract['basis'] =
    c.monthly === null ? 'unpriced' : sub.contractAmount !== null ? 'negotiated' : 'list';

  const standing: Record<Standing, [string, WorkspaceContract['standingTone']]> = {
    billing: [sub.cancelAtPeriodEnd ? 'Billing until the period ends' : 'Billing', 'success'],
    past_due: [`Past due · ${c.arrears?.days ?? 0} days`, 'danger'],
    trial: ['On trial', 'neutral'],
    trial_ended: ['Trial ended · awaiting a decision', 'warning'],
    stopped: [c.tenantStatus === 'suspended' ? 'Suspended · not billed' : 'Not billed', 'warning'],
    none: ['No subscription', 'danger'],
  };
  const [label, tone] = standing[c.standing];

  return {
    planCode: sub.planCode,
    planName: sub.planName,
    basis,
    monthly: c.monthly,
    subscriptionStatus: sub.status,
    standing: label,
    standingTone: tone,
    periodStart: day(sub.currentPeriodStart),
    periodEnd: day(sub.currentPeriodEnd),
    trialEnds: day(sub.trialEndsAt),
    pastDueSince: day(sub.pastDueSince),
    arrears: c.arrears,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
  };
}
