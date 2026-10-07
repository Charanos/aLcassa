import { StatusBadge } from '@/components/primitives/StatusBadge';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';
import { LatencyChart, ThroughputChart } from '../Charts';
import { DataSource, Panel, SectionHeading } from '../Surface';
import type { HealthModel } from '@/lib/console/data';

/**
 * PERFORMANCE. The last twenty-four hours, against the same budgets the
 * service cards above are held to.
 *
 * ⚠ THE LATENCY CHART WAS DRAWN OVER ITS OWN TITLE. `LatencyChart` renders
 * `absolute inset-0` and needs a sized, positioned parent; it was dropped
 * straight into a `Panel`, whose nearest positioned ancestor is the panel's
 * own section — whose only in-flow content is the title row. So the chart
 * filled a box the height of its heading, on top of the heading. It sits in a
 * 288px frame now, the way `MovementBand` places the same kind of chart.
 *
 * ⚠ AND IT HAD NO BUDGET. The API card says 200ms; the chart that plots the
 * API's p95 did not draw 200ms anywhere, so "148ms at noon" was a shape rather
 * than a finding. The budget is a dashed line now, and the sentence under the
 * chart states the headroom in words.
 *
 * ⚠ "SPIKE AT 17:00" WAS A STRING IN THE PAGE. It happened to match the
 * fixture. It is computed now — the worst hour against the day's median — and
 * only called a spike when it is one, so a quiet day does not get a warning
 * chip because a literal said so.
 */
export function PerformanceBand({
  latency,
  latencyBudget,
  throughput,
  refusals,
}: Pick<HealthModel, 'latency' | 'latencyBudget' | 'throughput' | 'refusals'>) {
  /* ── Latency: the p95 peak against its budget ───────────────────────── */
  const peak = latency.reduce(
    (a, b) => (b.p95 > a.p95 ? b : a),
    latency[0] ?? { t: '—', p95: 0, p50: 0, p99: 0 },
  );
  const headroom = latencyBudget > 0 ? Math.round((1 - peak.p95 / latencyBudget) * 100) : 0;
  const tailPeak = Math.max(...latency.map((l) => l.p99));

  /* ── Throughput: the worst hour against the day's median ────────────── */
  const rates = throughput.map((h) => h.errors).sort((a, b) => a - b);
  const median = rates[Math.floor(rates.length / 2)] ?? 0;
  const worst = throughput.reduce(
    (a, b) => (b.errors > a.errors ? b : a),
    throughput[0] ?? { t: '—', errors: 0, requests: 0 },
  );
  /* Five times the median is a spike; less is the day's ordinary noise. */
  const spike = median > 0 && worst.errors >= median * 5 ? worst : null;
  const requests = throughput.reduce((s, h) => s + h.requests, 0);

  return (
    <section aria-labelledby="health-performance">
      <SectionHeading
        id="health-performance"
        title="Performance"
        note="The last twenty-four hours, against the same budgets."
        action={<DataSource kind="designed" detail="probes at M6" />}
      />

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          title="Response latency"
          variant="elevated"
          action={
            <span className="flex flex-wrap items-center justify-end gap-x-3.5 gap-y-1.5">
              <Legend swatch="var(--blue-200)" dashed>
                p50
              </Legend>
              <Legend swatch="var(--blue-500)">p95</Legend>
              <Legend swatch="var(--ink-300)">p99</Legend>
              <Legend swatch="var(--warning-fg)" dashed>
                budget
              </Legend>
            </span>
          }
          footer={
            <p className="t-compact" style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}>
              p95 peaked at <Num>{peak.p95}ms</Num> at <Num>{peak.t}</Num> —{' '}
              {headroom >= 0 ? (
                <>
                  <Num>{headroom}%</Num> under the {latencyBudget}ms budget.
                </>
              ) : (
                <span style={{ color: 'var(--danger-fg)' }}>
                  <Num>{-headroom}%</Num> over the {latencyBudget}ms budget.
                </span>
              )}{' '}
              <span style={{ color: 'var(--text-tertiary)' }}>
                The slowest one request in a hundred reached {tailPeak}ms.
              </span>
            </p>
          }
        >
          <div className="relative h-72">
            <LatencyChart data={latency} budget={latencyBudget} />
          </div>
        </Panel>

        <Panel
          title="Throughput & errors"
          variant="elevated"
          action={
            spike ? (
              <StatusBadge tone="warning" size="sm" dot>
                {spike.errors}% errors at {spike.t}
              </StatusBadge>
            ) : (
              <StatusBadge tone="success" size="sm" dot>
                No spike
              </StatusBadge>
            )
          }
          footer={
            <p
              className="t-caption border-t pt-4"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-tertiary)',
                textWrap: 'pretty',
              }}
            >
              Refusals — entitlement ceilings and rate limits turned away on purpose — are the guard
              working, not failing, so they are held out of the error rate above.
            </p>
          }
        >
          <ThroughputChart data={throughput} />
          <dl className="m-0 mt-5 grid grid-cols-3 gap-4">
            <MiniFigure label="Requests" value={compact(requests)} />
            <MiniFigure label="Median errors" value={`${median}%`} />
            <MiniFigure label="Refusals" value={refusals.count24h.toLocaleString('en-KE')} />
          </dl>
          {spike ? (
            <p className="t-caption mt-3" style={{ color: 'var(--text-secondary)' }}>
              The {spike.t} hour ran at <Num>{Math.round(spike.errors / median)}×</Num> the
              day&rsquo;s median error rate.
            </p>
          ) : null}
        </Panel>
      </div>
    </section>
  );
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function Num({ children }: { children: React.ReactNode }) {
  return (
    <span className="tabular-nums" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
      {children}
    </span>
  );
}

function MiniFigure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt
        className="truncate font-mono text-2xs tracking-[0.12em] uppercase"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </dt>
      <dd
        className="m-0 mt-1.5 tabular-nums"
        style={{ font: '500 var(--type-lede)/1 var(--font-mono)', color: 'var(--text-primary)' }}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * A legend key. Dashed keys for dashed lines — the budget and p50 are drawn
 * dashed on the chart, and a solid swatch for a dashed line is a legend that
 * disagrees with the thing it explains.
 */
function Legend({
  swatch,
  dashed,
  children,
}: {
  swatch: string;
  dashed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{ font: '400 var(--type-chip)/1 var(--font-mono)', color: 'var(--text-secondary)' }}
    >
      <span
        aria-hidden
        className="h-0.5 w-3"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${swatch} 0 3px, transparent 3px 5px)`
            : swatch,
        }}
      />
      {children}
    </span>
  );
}

export function PerformanceBandSkeleton() {
  return (
    <SkeletonGroup label="Loading performance" className="block">
      <SkeletonSectionHeading />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Response latency" variant="elevated">
          <SkeletonBar width="100%" height={288} radius="rounded-overlay" />
          <SkeletonBar width="78%" height={13} className="mt-4" />
        </Panel>
        <Panel title="Throughput & errors" variant="elevated">
          <SkeletonBar width="100%" height={200} radius="rounded-overlay" />
          <div className="mt-5 grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i}>
                <SkeletonBar width="70%" height={10} />
                <SkeletonBar width="60%" height={16} className="mt-1.5" />
              </div>
            ))}
          </div>
          <SkeletonBar width="92%" height={12} className="mt-5" />
        </Panel>
      </div>
    </SkeletonGroup>
  );
}
