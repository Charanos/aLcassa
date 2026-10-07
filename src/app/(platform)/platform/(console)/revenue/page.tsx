import type { Metadata } from 'next';
import {
  IconClock,
  IconCoin,
  IconDownload,
  IconTrendingDown,
  IconTrendingUp,
  IconUsers,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import {
  BandLink,
  ConsoleHeader,
  ConsolePage,
  DataSource,
  ExportLink,
  Panel,
  SectionHeading,
} from '@/components/console/Surface';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { AgeingChart, MrrChart, PlanMixChart } from '@/components/console/Charts';
import { CollectionQueueTable } from '@/components/console/CollectionQueueTable';
import { MovementBand } from '@/components/console/revenue/MovementBand';
import { getRevenue, type Kpi } from '@/lib/console/data';
import { getLiveRevenue } from '@/lib/console/liveRevenue';

export const metadata: Metadata = { title: 'Subscription value' };

const KPI_ICON: Record<Kpi['icon'], TablerIcon> = {
  coin: IconCoin,
  trend: IconTrendingUp,
  users: IconUsers,
  down: IconTrendingDown,
  clock: IconClock,
};
const KES = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

export default async function RevenuePage() {
  // Only a preview without a platform session may use examples. An empty account
  // remains empty, and database failures reach the page's error boundary.
  const m = (await getLiveRevenue()) ?? (await getRevenue());

  return (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform', href: '/platform' }, { label: 'Subscription value' }]}
        title="Subscription value"
        rule
        actions={
          <ExportLink resource="revenue">
            <IconDownload size={15} stroke={1.5} aria-hidden />
            Export CSV
          </ExportLink>
        }
      />
      <div className="mb-8 space-y-3">
        <DataSource kind={m.source} />
        <p className="t-body max-w-[72ch]" style={{ color: 'var(--text-secondary)' }}>
          The value of workspace subscriptions, normalized to a monthly amount. These figures
          describe contracts and estimated amounts due; they do not confirm payments received.
        </p>
        {m.source === 'designed' && (
          <p className="t-caption" style={{ color: 'var(--warning-fg)' }}>
            Example data for preview. These figures do not describe your account.
          </p>
        )}
        {m.caveats.length > 0 && (
          <aside
            aria-label="Data requiring attention"
            className="rounded-panel border p-4"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <p className="t-body font-medium">Some workspaces are excluded</p>
            <ul className="t-caption mt-2 list-disc space-y-2 pl-5">
              {m.caveats.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </aside>
        )}
      </div>
      <FactStrip label="Subscription value summary">
        {m.kpis.slice(0, 4).map((kpi) => (
          <FactCell
            key={kpi.label}
            icon={KPI_ICON[kpi.icon]}
            label={kpi.label}
            value={kpi.value}
            note={kpi.note}
          />
        ))}
      </FactStrip>

      <SectionHeading title="Subscription trends" note="All amounts in KES" />
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Monthly subscription value">
          <div className="min-h-[280px]">
            <MrrChart data={m.mrr} />
          </div>
          <p className="t-caption mt-4" style={{ color: 'var(--text-secondary)' }}>
            Historical values are estimated from subscription dates and recorded price changes.
          </p>
          <details className="t-caption mt-4">
            <summary className="cursor-pointer">View monthly values</summary>
            <table className="mt-3 w-full text-left">
              <caption className="sr-only">Monthly subscription value and net change, KES</caption>
              <thead>
                <tr>
                  {['Month', 'Value', 'Net change'].map((label) => (
                    <th scope="col" key={label} className="p-2 font-medium">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.mrr.map((point) => (
                  <tr key={point.month}>
                    <th scope="row" className="p-2 font-normal">
                      {point.month}
                    </th>
                    <td className="p-2 tabular-nums">{KES.format(point.mrr)}</td>
                    <td className="p-2 tabular-nums">{KES.format(point.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </Panel>
        <Panel
          title="Value by plan"
          action={<BandLink href="/platform/plans">View plans</BandLink>}
        >
          {m.planMix.length > 0 ? (
            <>
              <div className="min-h-[220px]">
                <PlanMixChart data={m.planMix} />
              </div>
              <ul className="t-caption mt-4 space-y-3">
                {m.planMix.map((plan) => (
                  <li key={plan.name} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {plan.name} · {plan.tenants}
                    </span>
                    <span className="tabular-nums">{plan.display}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="t-body" style={{ color: 'var(--text-secondary)' }}>
              No priced subscriptions to show.
            </p>
          )}
        </Panel>
      </div>
      <MovementBand movement={m.movement} />

      <SectionHeading
        title="Payment follow-up"
        note="Estimates from subscription prices and past-due dates"
      />
      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        <Panel title="Estimated amounts due by age">
          <p className="t-body mb-4">
            Total estimated due: <span className="numeric">KES {m.outstanding}</span>
          </p>
          <div className="min-h-[220px]">
            <AgeingChart data={m.ageing} />
          </div>
          <ul className="t-caption mt-4 space-y-2">
            {m.ageing.map((bucket) => (
              <li key={bucket.bucket} className="flex justify-between gap-3">
                <span>{bucket.bucket}</span>
                <span className="tabular-nums">KES {KES.format(bucket.amount)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Workspaces requiring follow-up" flush>
          <CollectionQueueTable collections={m.collections} />
        </Panel>
      </div>
      <p className="t-caption mt-4 max-w-[80ch]" style={{ color: 'var(--text-secondary)' }}>
        Amounts due are estimates of monthly periods since each past-due date. They are not invoice
        balances. Open a workspace to review its subscription before following up.
      </p>
    </ConsolePage>
  );
}
