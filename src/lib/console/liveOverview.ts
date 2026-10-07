import 'server-only';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { watchlist } from '@/modules/platform';
import type { OverviewInsights, StatusSlice } from './data';
import { getLiveRevenue } from './liveRevenue';
import { getLiveWorkspaces } from './liveWorkspaces';
import { getSupportRegister } from './liveSupport';

/** Use the same readers as the destination pages; no fixture totals in a live briefing. */
export async function getLiveOverviewInsights(): Promise<OverviewInsights | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;
  const [rows, revenue, register, pressure] = await Promise.all([
    getLiveWorkspaces(),
    getLiveRevenue(),
    getSupportRegister(),
    watchlist({
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    }),
  ]);
  if (!rows || !revenue || !register)
    throw new Error('Overview readers did not resolve the platform session.');

  const labels = {
    active: 'Active',
    trial: 'Trial',
    'past due': 'Past due',
    suspended: 'Suspended',
    pending: 'Pending',
  };
  const counts = new Map<StatusSlice['status'], number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);
  const used = rows.reduce((sum, row) => sum + row.seatsUsed, 0);
  const limit = rows.some((row) => row.seatsLimit === 0)
    ? 0
    : rows.reduce((sum, row) => sum + row.seatsLimit, 0);
  const facts = register.facts;
  return {
    source: 'live',
    portfolio: {
      statusMix: [...counts].map(([status, count]) => ({ status, count, label: labels[status] })),
      pressure: pressure
        .flatMap((entry) =>
          entry.pressured.map((metric) => ({
            slug: entry.slug,
            name: entry.name,
            metric: metric.displayName,
            used: metric.current,
            limit: metric.limit,
            pct: Math.round(metric.ratio * 100),
          })),
        )
        .sort((a, b) => b.pct - a.pct),
      seats: { used, limit, pct: limit > 0 ? Math.round((used / limit) * 100) : 0 },
      events: null,
      growth: [],
    },
    revenue: { ...revenue },
    operations: {
      latency: [],
      queues: [],
      refusals: { count24h: 0, note: 'Not measured' },
      services: { ok: 0, degraded: 0, down: 0 },
      openIncidents: 0,
      sessions: [
        { label: 'Active now', value: String(facts.openNow), note: 'open support visits' },
        {
          label: 'Last 30 days',
          value: String(facts.visits),
          note: register.capped
            ? 'latest 500 recorded visits; register limit reached'
            : 'recorded support visits',
        },
        {
          label: 'Median duration',
          value: facts.medianMinutes === null ? '—' : `${facts.medianMinutes}m`,
          note: 'completed visits in the register window',
        },
        {
          label: 'Ended by customer',
          value: String(facts.endedByCustomer),
          note: 'visits ended by a workspace member',
        },
      ],
    },
  };
}
