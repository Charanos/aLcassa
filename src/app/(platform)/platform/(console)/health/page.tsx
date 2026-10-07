import type { Metadata } from 'next';
import Link from 'next/link';
import {
  IconShieldCheck,
  IconShieldExclamation,
  IconActivityHeartbeat,
  IconDatabase,
  IconClock,
} from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, Panel, SectionHeading } from '@/components/console/Surface';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { StatusSlab } from '@/components/console/health/StatusSlab';
import { ServicesBand } from '@/components/console/health/ServicesBand';
import { IsolationBand } from '@/components/console/health/IsolationBand';
import { PerformanceBand } from '@/components/console/health/PerformanceBand';
import { QueuesIncidentsBand } from '@/components/console/health/QueuesIncidentsBand';
import { getHealth, type IsolationStatus } from '@/lib/console/data';
import { getLiveIsolationStatus } from '@/lib/console/live';

export const metadata: Metadata = { title: 'Health' };

/**
 * Platform health. `Health.dc.html`.
 *
 * ⚠ ORDERED BY THE QUESTIONS AN OPERATOR ARRIVES WITH, NOT BY DATA SOURCE.
 *
 *   1. Is anything wrong?            → the diagnosis slab
 *   2. What has been happening?      → services, thirty days each
 *   3. Is the guarantee intact?      → isolation
 *   4. How is it running today?      → performance, against budget
 *   5. What is waiting, what broke?  → queues and the incident log
 *
 * The page used to open on a status pill hardcoded to track a fixture and a
 * paragraph typed independently of the rows beneath it. Everything here is now
 * derived from one model in which the incidents are the source — strips,
 * availability, the diagnosis sentence and the headline all come from them, so
 * no part of the page can tell a different story from another.
 *
 * ⚠ LIVE WHERE IT CAN BE, AND LABELLED WHERE IT CANNOT. Uptime, latency, queues
 * and incidents come from observability probes that arrive at M6; until then
 * they are the designed figures, and every band that shows them says so beside
 * its heading. The overview tells a signed-in operator the same thing in the
 * same words. Isolation is answerable from the database today, so it is read
 * for real — and it is the one fact promoted into the header.
 *
 * Each band owns its skeleton; `loading.tsx` composes them. Doc 22 §6.
 */
export default async function HealthPage() {
  const model = await getHealth();

  /* Null under the review bypass, where there is no session to read with. */
  const liveIsolation = await getLiveIsolationStatus();
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
          <FactStrip label="Available health checks">
            <FactCell
              icon={IconShieldCheck}
              label="Policy coverage"
              value={`${isolation.tablesPoliced} / ${isolation.tablesTotal}`}
              note="Workspace tables with enforced row security and a policy"
            />
            <FactCell
              icon={IconDatabase}
              label="Database check"
              value="Available"
              note="Policy metadata was read successfully for this page."
            />
            <FactCell
              icon={IconActivityHeartbeat}
              label="Service monitoring"
              value="Not connected"
              note="Availability and incident status are not measured here."
            />
            <FactCell
              icon={IconClock}
              label="Response times"
              value="Not measured"
              note="No connected latency history"
            />
          </FactStrip>
          <IsolationBand isolation={isolation} live />
          <SectionHeading
            title="Monitoring coverage"
            align="left"
            note="What this console can currently verify, and what still needs a reporting source."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Available now">
              <p className="t-body text-[var(--text-secondary)]">
                The database check confirms policy configuration when you open this page. It does
                not establish service uptime or prove that every access path is correctly
                authorized.
              </p>
            </Panel>
            <Panel title="Awaiting monitoring">
              <p className="t-body text-[var(--text-secondary)]">
                Service availability, response times, queue depth, and incident history need
                connected monitoring. No operational status is reported for these measures yet.
              </p>
            </Panel>
          </div>
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

/**
 * The one live fact, in the header.
 *
 * ⚠ IT REPLACED A PILL THAT READ "DEGRADED IN THE LAST 30 DAYS". That pill was
 * the first thing an operator saw, it was derived from designed figures, and
 * it carried no mark saying so — the confident status line on the one page
 * people open when they are already worried. What belongs up here is the
 * strongest thing the page can actually vouch for, and that is isolation.
 * It links to its band.
 */
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
