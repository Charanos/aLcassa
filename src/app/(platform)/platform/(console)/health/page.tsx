import type { Metadata } from 'next';
import Link from '@/components/structure/NavigationLink';
import { IconShieldCheck, IconShieldExclamation } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { StatusSlab } from '@/components/console/health/StatusSlab';
import { ServicesBand } from '@/components/console/health/ServicesBand';
import { IsolationBand } from '@/components/console/health/IsolationBand';
import { PerformanceBand } from '@/components/console/health/PerformanceBand';
import { QueuesIncidentsBand } from '@/components/console/health/QueuesIncidentsBand';
import { getHealth, type IsolationStatus } from '@/lib/console/data';
import { getLiveIsolationStatus } from '@/lib/console/live';
import { getLiveAuditVolume } from '@/lib/console/liveWorkspaces';
import {
  HealthHero,
  HealthActivity,
  HealthMonitoring,
} from '@/components/console/health/LiveHealth';

export const metadata: Metadata = { title: 'Health' };

/** Group health by diagnosis, service history, isolation, performance and operational backlog; label unavailable measurements honestly. */
export default async function HealthPage() {
  const model = await getHealth();

  /* Null under the review bypass, where there is no session to read with. */
  const checkStarted = performance.now();
  const liveIsolation = await getLiveIsolationStatus();
  const checkDuration = performance.now() - checkStarted;
  const points = liveIsolation ? await getLiveAuditVolume() : null;
  if (liveIsolation && !points) throw new Error('The health activity window could not be read.');
  const isolation = liveIsolation ?? model.isolation;

  return (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'Health' }]}
        title="Health"
        actions={<IsolationChip isolation={isolation} live={liveIsolation !== null} />}
      />

      {liveIsolation ? (
        <>
          <HealthHero isolation={isolation} points={points ?? []} durationMs={checkDuration} />
          <IsolationBand isolation={isolation} live />
          <HealthActivity points={points ?? []} />
          <HealthMonitoring />
        </>
      ) : (
        <>
          <StatusSlab model={model} />
          <ServicesBand model={model} />
          <IsolationBand isolation={isolation} live={liveIsolation !== null} />
          <PerformanceBand
            latency={model.latency}
            latencyBudget={model.latencyBudget}
            throughput={model.throughput}
            refusals={model.refusals}
          />
          <QueuesIncidentsBand
            queues={model.queues}
            incidents={model.incidents}
            services={model.services}
            window={model.window}
          />
        </>
      )}
    </ConsolePage>
  );
}

/** The header isolation result comes from the live policy check rather than fixture availability figures. */
function IsolationChip({ isolation, live }: { isolation: IsolationStatus; live: boolean }) {
  const holding = isolation.tablesTotal > 0 && isolation.tablesPoliced === isolation.tablesTotal;
  const ink = holding ? 'var(--success-fg)' : 'var(--danger-fg)';
  const Icon = holding ? IconShieldCheck : IconShieldExclamation;
  const gap = isolation.tablesTotal - isolation.tablesPoliced;

  return (
    <Link
      href="#isolation"
      className="group inline-flex h-9 items-center gap-2.5 rounded-full pr-4 pl-3 whitespace-nowrap transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
      style={{
        border: `1px solid color-mix(in oklab, ${ink} 35%, var(--border-subtle))`,
        background: 'var(--surface-raised)',
        boxShadow: 'var(--shadow-sm), var(--glass-highlight)',
      }}
    >
      <Icon size={16} stroke={1.75} style={{ color: ink }} aria-hidden />
      <span
        style={{ font: '500 var(--type-compact)/1 var(--font-ui)', color: 'var(--text-primary)' }}
      >
        {holding
          ? 'Policy coverage complete'
          : `Policy coverage gap · ${gap} ${gap === 1 ? 'table' : 'tables'}`}
      </span>
      <span
        className="tabular-nums"
        style={{ font: '400 var(--type-chip)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
      >
        {isolation.tablesPoliced}/{isolation.tablesTotal}
        {live ? '' : ' · example'}
      </span>
    </Link>
  );
}
