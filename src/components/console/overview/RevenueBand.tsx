import {
  IconRocket,
  IconBolt,
  IconBox,
} from '@tabler/icons-react';
import { AgeingChart, MrrChart, PlanMixChart } from '../Charts';
import { Panel, SectionHeading } from '../Surface';
import { BandLink } from './shared';
import { DebtStack } from './DebtStack';
import type { OverviewInsights } from '@/lib/console/data';

export function RevenueBand({ revenue }: { revenue: OverviewInsights['revenue'] }) {
  return (
    <section className="mb-10">
      <SectionHeading
        title="Revenue & Ageing"
        note="Twelve months of MRR performance, plan mix distribution, and what is still owed to the platform."
        action={<BandLink href="/platform/revenue">Open revenue</BandLink>}
        align="left"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Panel title="Recurring revenue · net new" variant="elevated">
          <MrrChart data={revenue.mrr} />
        </Panel>

        <Panel title="Where it comes from" variant="elevated">
          <PlanMixChart data={revenue.planMix} />
          <ul className="mt-5 grid border-t border-[var(--border-subtle)]/40 pt-2">
            {revenue.planMix.map((slice, i) => {
              const Icon = slice.name === 'Scale' ? IconRocket : slice.name === 'Growth' ? IconBolt : IconBox;
              const accentColor = i === 0 ? 'var(--text-primary)' : i === 1 ? 'var(--blue-500)' : 'var(--text-disabled)';
              
              return (
              <li 
                key={slice.name} 
                className="group relative flex items-baseline justify-between gap-3 px-2 py-2.5 transition-colors duration-300 hover:bg-black/[0.015]"
              >
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-[var(--border-subtle)]/40 to-transparent group-last:hidden" />
                <span
                  className="flex items-center gap-2 font-ui text-[12.5px] font-medium transition-colors duration-300 group-hover:text-[var(--text-primary)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Icon size={14} stroke={1.5} style={{ color: accentColor }} />
                  {slice.name}
                </span>
                <span
                  className="font-mono text-[12.5px] font-medium tracking-[0.02em] transition-colors duration-300 group-hover:text-[var(--blue-500)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {slice.display} <span className="mx-1 font-normal text-[var(--text-tertiary)]">·</span> {slice.tenants}
                </span>
              </li>
            )})}
          </ul>
        </Panel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
        <Panel title="Outstanding" variant="elevated">
          {/*
            ⚠ TWO LEVELS, AND THE QUIET ONE COMES FIRST. The aggregate is
            context — it tells a reader how much of the platform's money is
            late. The single worst debt is the thing they can act on, and it is
            the only inverted object in this column for that reason.
          */}
          <div className="flex flex-col border-b border-[var(--border-subtle)]/50 pb-5">
            <p className="flex items-baseline gap-2">
              <span
                className="font-mono text-[11px] font-medium tracking-[0.1em] uppercase"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {revenue.currency}
              </span>
              <span
                className="font-mono text-[44px] leading-[0.9] font-medium tracking-[-0.04em]"
                style={{ color: 'var(--text-primary)' }}
              >
                {revenue.outstanding}
              </span>
            </p>
            <p
              className="mt-3 font-mono text-[10.5px] font-medium tracking-[0.08em] uppercase"
              style={{ color: 'var(--text-secondary)' }}
            >
              Total platform debt
            </p>
          </div>

          <DebtStack collections={revenue.collections} currency={revenue.currency} />
        </Panel>

        <Panel title="Ageing" variant="elevated">
          <AgeingChart data={revenue.ageing} />
        </Panel>
      </div>
    </section>
  );
}

