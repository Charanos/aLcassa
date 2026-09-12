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
        {/*
          ⚠ THE UNIT SITS ON THE PANEL, NOT ON EVERY TICK.

          Both charts in this band plot money and neither named a currency — the
          same defect the debt card had. Prefixing each tick would produce
          "KES 0.0M · KES 2.0M · KES 4.0M": four repetitions of a constant in
          the one place a reader is scanning for differences. The axis stays
          scannable and the panel states the unit once, which is what a chart's
          own convention already is.
        */}
        <Panel
          title="Recurring revenue · net new"
          variant="elevated"
          action={<Unit currency={revenue.currency} />}
        >
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
                className="group relative flex items-baseline justify-between gap-3 px-2 py-2.5 transition-colors duration-300 hover:bg-[var(--surface-sunken)]"
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
                  <span className="mr-1 text-[10px] tracking-[0.08em] text-[var(--text-tertiary)] uppercase">
                    {revenue.currency}
                  </span>
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
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)]/40 pb-4">
            <div className="flex flex-col">
              <p
                className="mb-1 font-mono text-[10px] font-medium tracking-[0.12em] uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                Total platform debt
              </p>
              <p className="flex items-baseline gap-1.5">
                <span
                  className="font-mono text-[12px] font-medium tracking-widest uppercase"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {revenue.currency}
                </span>
                <span
                  className="font-mono text-[36px] leading-[0.9] font-semibold tracking-[-0.02em]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {revenue.outstanding}
                </span>
              </p>
            </div>
          </div>

          <DebtStack collections={revenue.collections} currency={revenue.currency} />
        </Panel>

        <Panel title="Ageing" variant="elevated" action={<Unit currency={revenue.currency} />}>
          <div className="flex flex-col h-full pt-1">
            <div className="w-full mb-6">
              <p 
                className="font-ui text-[13px] leading-relaxed text-pretty" 
                style={{ color: 'var(--text-secondary)' }}
              >
                Grouped by how far past due each invoice is. Debt gets harder to collect the further
                right it sits, so the{' '}
                <span className="font-medium" style={{ color: 'var(--danger-fg)' }}>90+ days</span>{' '}
                bucket is the one to work first — and the one most likely to be written off rather
                than recovered.
              </p>
            </div>
            <div className="flex-1 min-w-0 min-h-0 relative">
              <AgeingChart data={revenue.ageing} />
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}


/**
 * The currency a panel's chart is plotted in.
 *
 * ⚠ IT IS A LABEL, NOT A LEGEND. It states the unit once in the panel's action
 * slot, which is where a chart's own convention already puts it — and where it
 * cannot compete with the values it describes. The axis keeps its bare
 * magnitudes so a reader scanning for differences is not reading the same three
 * letters four times.
 */
function Unit({ currency }: { currency: string }) {
  return (
    <span
      className="font-mono text-[10px] tracking-[0.1em] uppercase"
      style={{ color: 'var(--text-tertiary)' }}
    >
      {currency}
    </span>
  );
}
