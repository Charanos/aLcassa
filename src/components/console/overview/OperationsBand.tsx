import { LatencyChart } from '../Charts';
import { FactRow, Panel, SectionHeading } from '../Surface';
import { BandLink } from './shared';
import type { OverviewInsights } from '@/lib/console/data';

export function OperationsBand({
  operations,
}: {
  operations: OverviewInsights['operations'];
}) {
  const { services } = operations;
  const allWell = services.degraded === 0 && services.down === 0;

  return (
    <section className="mb-10">
      <SectionHeading
        title="Operations & Ledgers"
        note="Global latency metrics, service health, queue depths, and the support session accountability register."
        action={<BandLink href="/platform/health">Open health</BandLink>}
        align="left"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Panel title="Response latency · p50 / p95 / p99">
          <LatencyChart data={operations.latency} />
        </Panel>

        <div className="grid gap-5">
          <Panel title="Services">
            <div className="relative overflow-hidden rounded-xl bg-[var(--surface-sunken)] px-4 py-3.5 transition-colors duration-300 hover:bg-[var(--surface-inset)]">
              {/* Health ambient glow */}
              <div
                className="pointer-events-none absolute left-0 top-0 h-full w-1 opacity-60"
                style={{
                  background: allWell
                    ? 'linear-gradient(to bottom, var(--success-fg), transparent)'
                    : 'linear-gradient(to bottom, var(--warning-fg), transparent)',
                }}
                aria-hidden
              />
              <p
                className="t-compact relative z-10 font-medium"
                style={{ color: 'var(--text-primary)' }}
              >
                {allWell
                  ? `All ${services.ok} services are inside their budget.`
                  : `${services.down > 0 ? `${services.down} down, ` : ''}${services.degraded} degraded of ${services.ok + services.degraded + services.down}.`}
              </p>
              {operations.openIncidents > 0 ? (
                <p className="mt-1.5 relative z-10 font-medium text-[13px]" style={{ color: 'var(--warning-fg)' }}>
                  {operations.openIncidents} incident
                  {operations.openIncidents === 1 ? '' : 's'} still open.
                </p>
              ) : null}
              <p className="mt-2.5 relative z-10 font-medium text-[12px] opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                {operations.refusals.count24h.toLocaleString('en-KE')} refusals in 24h ·{' '}
                {operations.refusals.note}
              </p>
            </div>
          </Panel>

          <Panel title="Queue depth" flush>
            <div className="px-5">
              {operations.queues.slice(0, 4).map((q, i, list) => (
                <FactRow
                  key={q.name}
                  label={q.name}
                  value={`${q.depth.toLocaleString('en-KE')} · ${q.rate}`}
                  dot={q.depth > 0 ? 'warn' : 'ok'}
                  last={i === list.length - 1}
                />
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <div className="mt-8">
        <Panel
          title="Support sessions"
          action={<BandLink href="/platform/support-sessions">Open register</BandLink>}
        >
          <div
            className="grid gap-6 sm:grid-cols-3 rounded-2xl px-6 py-5"
            style={{
              background: 'var(--surface-sunken)',
              boxShadow: 'var(--well-inset)',
            }}
          >
            {operations.sessions.map((stat) => (
              <div key={stat.label}>
                <p
                  className="font-mono text-[24px] font-medium tracking-tight"
                  style={{
                    color: stat.tone === 'accent' ? 'var(--blue-400)' : 'var(--text-primary)',
                  }}
                >
                  {stat.value}
                </p>
                <p className="mt-1.5 font-medium text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  {stat.label}
                </p>
                <p className="mt-0.5 font-medium text-[12px] opacity-60" style={{ color: 'var(--text-tertiary)' }}>
                  {stat.note}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
