import Link from '@/components/structure/NavigationLink';
import {
  IconActivityHeartbeat,
  IconClock,
  IconDatabase,
  IconShieldCheck,
} from '@tabler/icons-react';
import { FactCell, FactStrip } from '../FactStrip';
import { HealthChart } from './HealthChart';
import { Panel, SectionHeading } from '../Surface';
import type { AuditVolumePoint, IsolationStatus } from '@/lib/console/data';

/** Restore the health hierarchy using recorded operations, without implying service uptime. */
export function HealthHero({
  isolation,
  points,
  durationMs,
}: {
  isolation: IsolationStatus;
  points: AuditVolumePoint[];
  durationMs: number;
}) {
  const holding = isolation.tablesTotal > 0 && isolation.tablesPoliced === isolation.tablesTotal;
  const changes = points.reduce((sum, point) => sum + point.total - point.reads, 0);
  const total = points.reduce((sum, point) => sum + point.total, 0);
  return (
    <section
      aria-labelledby="health-diagnosis"
      className="console-fact-strip block overflow-hidden"
    >
      <div className="relative z-10 grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:p-10">
        <div>
          <p className="t-eyebrow text-[var(--chrome-fg-muted)]">Operational health</p>
          <h2
            id="health-diagnosis"
            className="display display-md mt-4 max-w-[22ch] text-[var(--chrome-fg)]"
          >
            {holding
              ? 'Policy coverage holds. Monitoring is the next step.'
              : 'Policy coverage needs attention.'}
          </h2>
          <p className="t-body mt-5 max-w-[54ch] text-[var(--chrome-fg-muted)]">
            {isolation.tablesPoliced} of {isolation.tablesTotal} workspace tables have enforced row
            security and a policy. Service availability and response-time history are not yet
            measured.
          </p>
          <Link
            href="#isolation"
            className="t-compact mt-6 inline-flex rounded-full border border-[var(--chrome-rule)] px-4 py-2 text-[var(--chrome-fg)] hover:bg-[var(--chrome-hover)]"
          >
            Review isolation
          </Link>
        </div>
        <div className="min-w-0 self-end">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="t-caption text-[var(--chrome-fg-muted)]">
                Recorded operations · 30 days
              </p>
              <p className="display display-sm mt-2 text-[var(--chrome-fg)] tabular-nums">
                {total.toLocaleString('en-KE')}
              </p>
            </div>
            <span className="t-caption text-[var(--chrome-fg-muted)]">Africa/Nairobi</span>
          </div>
          <div className="mt-4">
            <HealthChart points={points} variant="operations" inverse />
          </div>
          <p className="t-caption mt-3 text-[var(--chrome-fg-muted)]">
            Recorded operations include changes and audited reads; this is not request throughput.
          </p>
        </div>
      </div>
      <FactStrip label="Health summary">
        <FactCell
          icon={IconShieldCheck}
          label="Policy coverage"
          value={`${isolation.tablesPoliced} / ${isolation.tablesTotal}`}
          note="Workspace tables checked"
        />
        <FactCell
          icon={IconDatabase}
          label="Policy check"
          value={`${Math.round(durationMs).toLocaleString('en-KE')} ms`}
          note="Duration of this page's check"
        />
        <FactCell
          icon={IconActivityHeartbeat}
          label="Recorded changes"
          value={changes.toLocaleString('en-KE')}
          note="Thirty Nairobi calendar days"
        />
        <FactCell
          icon={IconClock}
          label="Service monitoring"
          value="Awaiting connection"
          note="Availability is not yet measured"
        />
      </FactStrip>
    </section>
  );
}

export function HealthActivity({ points }: { points: AuditVolumePoint[] }) {
  return (
    <section aria-labelledby="health-recorded-activity">
      <SectionHeading
        id="health-recorded-activity"
        title="Recorded activity"
        align="left"
        note="Thirty Nairobi calendar days. Changes and audited reads remain distinct."
        action={
          <Link href="/platform/audit" className="t-compact text-[var(--text-action)]">
            Open audit log
          </Link>
        }
      />
      <Panel
        title="Operations over time"
        footer={
          <p className="t-caption text-[var(--text-secondary)]">
            These are platform audit records. They do not measure uptime, request volume or error
            rate.
          </p>
        }
      >
        <HealthChart points={points} />
      </Panel>
    </section>
  );
}

const MONITORS = [
  {
    title: 'Service availability',
    description: 'API, authentication, storage and database uptime',
    labels: ['API', 'Authentication', 'Storage', 'Database'],
    note: 'No availability probes or uptime history are connected.',
  },
  {
    title: 'Response times',
    description: 'Response-time history and service budgets',
    labels: ['p50', 'p95', 'p99'],
    note: 'No request latency samples are connected. Performance qualification remains open.',
  },
  {
    title: 'Queues and delivery',
    description: 'Pending work, retries and delivery failures',
    labels: ['Pending', 'Retrying', 'Failed'],
    note: 'Queue depth and delivery outcomes are not reported by this console yet.',
  },
  {
    title: 'Incident history',
    description: 'Open incidents and recent service interruptions',
    labels: ['Open', 'Investigating', 'Resolved'],
    note: 'No incident feed is connected. An empty feed does not confirm that there were no incidents.',
  },
] as const;

export function HealthMonitoring() {
  return (
    <section aria-labelledby="health-monitoring">
      <SectionHeading
        id="health-monitoring"
        title="Service monitoring"
        align="right"
        note="Ready for measured service history. Unconnected sources remain explicit."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        {MONITORS.map((monitor) => (
          <Panel
            key={monitor.title}
            title={monitor.title}
            footer={<p className="t-caption text-[var(--text-secondary)]">{monitor.note}</p>}
          >
            <p className="t-caption text-[var(--text-tertiary)]">{monitor.description}</p>
            <div
              className="relative mt-5 flex min-h-36 items-center justify-center overflow-hidden rounded-panel bg-[var(--surface-sunken)]"
              style={{ boxShadow: 'var(--neu-inset)' }}
            >
              <div aria-hidden className="absolute inset-4 flex flex-col justify-between">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="border-t border-dashed border-[var(--border-subtle)]" />
                ))}
              </div>
              <p className="t-compact relative rounded-full bg-[var(--surface-raised)] px-4 py-2 text-[var(--text-secondary)]">
                Awaiting monitoring data
              </p>
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-3">
              {monitor.labels.map((label) => (
                <span key={label} className="t-caption text-[var(--text-tertiary)]">
                  {label}
                  <span className="ml-2 font-mono">—</span>
                </span>
              ))}
            </div>
          </Panel>
        ))}
      </div>
    </section>
  );
}
