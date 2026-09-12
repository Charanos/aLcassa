import Link from 'next/link';
import { AgeingChart, MrrChart, PlanMixChart } from '../Charts';
import { Panel, SectionHeading } from '../Surface';
import { BandLink } from './shared';
import type { OverviewInsights } from '@/lib/console/data';

export function RevenueBand({ revenue }: { revenue: OverviewInsights['revenue'] }) {
  return (
    <section className="mb-10">
      <SectionHeading
        title="Revenue"
        note="Twelve months, and what is still owed"
        action={<BandLink href="/platform/revenue">Open revenue</BandLink>}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Panel title="Recurring revenue · net new">
          <MrrChart data={revenue.mrr} />
        </Panel>

        <Panel title="Where it comes from">
          <PlanMixChart data={revenue.planMix} />
          <ul className="mt-4 grid gap-2">
            {revenue.planMix.map((slice) => (
              <li key={slice.name} className="flex items-baseline justify-between gap-3">
                <span
                  className="font-mono text-[12px] font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {slice.name}
                </span>
                <span
                  className="font-mono text-[13px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {slice.display} · {slice.tenants}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
        <Panel title="Outstanding">
          <p
            className="font-mono text-[32px] font-medium tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {revenue.outstanding}
          </p>

          {revenue.worst ? (
            <div
              className="group relative mt-5 overflow-hidden rounded-xl px-4 py-3.5 transition-colors duration-300 hover:bg-[var(--surface-inset)]"
              style={{
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
            >
              {/* Crimson ambient glow */}
              <div
                className="pointer-events-none absolute left-0 top-0 h-full w-1 opacity-60"
                style={{ background: 'linear-gradient(to bottom, var(--danger-fg), transparent)' }}
                aria-hidden
              />
              <div
                className="pointer-events-none absolute -inset-x-4 top-0 h-[120px] opacity-30 blur-xl"
                style={{ background: 'linear-gradient(to bottom, var(--danger-bg), transparent)' }}
                aria-hidden
              />

              <div className="relative z-10">
                <p
                  className="font-mono text-[10.5px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: 'var(--danger-fg)' }}
                >
                  Oldest debt
                </p>
                <Link
                  href={`/platform/tenants/${revenue.worst.slug}`}
                  className="mt-1.5 block truncate transition-colors hover:text-[var(--text-action)]"
                  style={{
                    font: '600 15px/1.35 var(--font-ui)',
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {revenue.worst.name}
                </Link>
                <p
                  className="mt-1.5 flex items-center gap-2"
                  style={{
                    font: '500 12.5px/1.4 var(--font-mono)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{revenue.worst.amount}</span>
                  <span className="opacity-40">·</span>
                  <span>{revenue.worst.days} days</span>
                  <span className="opacity-40">·</span>
                  <span>{revenue.worst.attempts} attempts</span>
                </p>
              </div>
            </div>
          ) : (
            <p
              className="mt-4 font-mono text-[13px] font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              Nothing is overdue.
            </p>
          )}
        </Panel>

        <Panel title="Ageing">
          <AgeingChart data={revenue.ageing} />
        </Panel>
      </div>
    </section>
  );
}
