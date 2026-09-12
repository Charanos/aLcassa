import Link from 'next/link';
import { GrowthChart, StatusMixChart } from '../Charts';
import { Panel, SectionHeading } from '../Surface';
import { BandLink } from './shared';
import type { OverviewInsights } from '@/lib/console/data';

export function PortfolioBand({ portfolio }: { portfolio: OverviewInsights['portfolio'] }) {
  const total = portfolio.statusMix.reduce((sum, s) => sum + s.count, 0);

  return (
    <section className="mb-10">
      <SectionHeading
        title="Portfolio"
        note="Every workspace, by state and by pressure"
        action={<BandLink href="/platform/tenants">Open workspaces</BandLink>}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title={`Status · ${total} workspaces`}>
          <StatusMixChart data={portfolio.statusMix} />
          <ul className="mt-4 grid gap-2">
            {portfolio.statusMix.map((slice) => (
              <li key={slice.status} className="flex items-baseline justify-between gap-3">
                <span
                  className="font-mono text-[12.5px] font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {slice.label}
                </span>
                <span
                  className="font-mono text-[13.5px] font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {slice.count}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Opened against closed">
          <GrowthChart data={portfolio.growth} />
        </Panel>

        <Panel title="At the ceiling">
          {portfolio.pressure.length === 0 ? (
            <p
              className="font-mono text-[13px] font-medium mt-4"
              style={{ color: 'var(--text-secondary)' }}
            >
              Nothing is within ten percent of a limit.
            </p>
          ) : (
            <ul className="grid gap-3.5 mt-2">
              {portfolio.pressure.slice(0, 5).map((row) => (
                <li key={`${row.slug}-${row.metric}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <Link
                      href={`/platform/tenants/${row.slug}`}
                      className="truncate transition-colors hover:text-[var(--text-action)]"
                      style={{
                        font: '500 13px/1 var(--font-ui)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {row.name}
                    </Link>
                    <span
                      className="font-mono text-[13px] font-semibold shrink-0"
                      style={{
                        color: row.pct >= 100 ? 'var(--danger-fg)' : 'var(--warning-fg)',
                      }}
                    >
                      {row.pct}%
                    </span>
                  </div>
                  <div
                    className="relative mt-2 h-px w-full"
                    style={{ background: 'var(--border-subtle)' }}
                    aria-hidden
                  >
                    <div
                      className="absolute left-0 top-0 h-full"
                      style={{
                        width: `${Math.min(100, row.pct)}%`,
                        background: row.pct >= 100 ? 'var(--danger-fg)' : 'var(--warning-fg)',
                        boxShadow: `0 0 10px ${row.pct >= 100 ? 'var(--danger-fg)' : 'var(--warning-fg)'}`,
                      }}
                    >
                      <div
                        className="absolute right-0 top-1/2 -translate-y-1/2 size-1.5 rounded-full"
                        style={{
                          background: row.pct >= 100 ? 'var(--danger-fg)' : 'var(--warning-fg)',
                          boxShadow: `0 0 8px ${row.pct >= 100 ? 'var(--danger-fg)' : 'var(--warning-fg)'}`,
                        }}
                      />
                    </div>
                  </div>
                  <p
                    className="mt-1.5 font-mono text-[11px] font-medium"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {row.metric} · {row.used.toLocaleString('en-KE')} of{' '}
                    {row.limit.toLocaleString('en-KE')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Panel title="Seats in use across the platform">
          <div className="mt-2.5">
            <div className="flex items-end justify-between gap-3 mb-2">
              <p
                className="font-mono text-[24px] font-medium"
                style={{ color: 'var(--text-primary)', lineHeight: 1 }}
              >
                {portfolio.seats.pct}%
              </p>
              <p className="font-mono text-[12px] font-medium pb-0.5" style={{ color: 'var(--text-secondary)' }}>
                {portfolio.seats.used.toLocaleString('en-KE')} / {portfolio.seats.limit.toLocaleString('en-KE')}
              </p>
            </div>
            <div
              className="relative h-1 w-full rounded-full overflow-hidden"
              style={{ background: 'var(--surface-inset)' }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  width: `${Math.min(100, portfolio.seats.pct)}%`,
                  background: portfolio.seats.pct >= 90 ? 'var(--warning-fg)' : 'var(--blue-400)',
                }}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Events this period">
          <div className="mt-2.5">
            <div className="flex items-end justify-between gap-3 mb-2">
              <p
                className="font-mono text-[24px] font-medium"
                style={{ color: 'var(--text-primary)', lineHeight: 1 }}
              >
                {portfolio.events.pct}%
              </p>
              <p className="font-mono text-[12px] font-medium pb-0.5" style={{ color: 'var(--text-secondary)' }}>
                {portfolio.events.used.toLocaleString('en-KE')} / {portfolio.events.limit.toLocaleString('en-KE')}
              </p>
            </div>
            <div
              className="relative h-1 w-full rounded-full overflow-hidden"
              style={{ background: 'var(--surface-inset)' }}
            >
              <div
                className="absolute left-0 top-0 h-full rounded-full"
                style={{
                  width: `${Math.min(100, portfolio.events.pct)}%`,
                  background: portfolio.events.pct >= 90 ? 'var(--warning-fg)' : 'var(--success-fg)',
                }}
              />
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}
