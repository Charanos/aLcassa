import { IconRocket, IconBolt, IconBox, type Icon as TablerIcon } from '@tabler/icons-react';
import { AgeingChart, MrrChart, PlanMixChart } from '../Charts';
import { Panel, SectionHeading } from '../Surface';
import { SkeletonGroup, SkeletonText } from '@/components/primitives/Skeleton';
import { BandLink } from './shared';
import { DebtStack } from './DebtStack';
import type { OverviewInsights } from '@/lib/console/data';

/**
 * One glyph per plan.
 *
 * ⚠ THIS WAS AN INLINE TERNARY ON 'Scale' AND 'Growth', SO EVERY SLICE GOT THE
 * FALLBACK. Both plans were retired on 24 Aug 2026, which meant three identical
 * box glyphs down a legend whose entire job is to tell three plans apart.
 *
 * A map rather than a ternary because 03 §7a is explicit: one icon per concept,
 * resolved in one place. A chain of equality checks inside a render is where
 * the next plan gets forgotten.
 */
const PLAN_ICON: Record<string, TablerIcon> = {
  Pro: IconBox,
  Business: IconBolt,
  Custom: IconRocket,
};

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
              const Icon = PLAN_ICON[slice.name] ?? IconBox;
              const accentColor =
                i === 0
                  ? 'var(--text-primary)'
                  : i === 1
                    ? 'var(--blue-500)'
                    : 'var(--text-disabled)';

              return (
                <li
                  key={slice.name}
                  className="group relative flex items-baseline justify-between gap-3 px-2 py-2.5 transition-colors duration-300 hover:bg-[var(--surface-sunken)]"
                >
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-[var(--border-subtle)]/40 to-transparent group-last:hidden" />
                  <span
                    className="font-ui flex items-center gap-2 text-sm font-medium transition-colors duration-300 group-hover:text-[var(--text-primary)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Icon size={14} stroke={1.5} style={{ color: accentColor }} />
                    {slice.name}
                  </span>
                  <span
                    className="font-mono text-sm font-medium tracking-[0.02em] transition-colors duration-300 group-hover:text-[var(--blue-500)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span className="mr-1 text-2xs tracking-[0.08em] text-[var(--text-tertiary)] uppercase">
                      {revenue.currency}
                    </span>
                    {slice.display}{' '}
                    <span className="mx-1 font-normal text-[var(--text-tertiary)]">·</span>{' '}
                    {slice.tenants}
                  </span>
                </li>
              );
            })}
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
                className="mb-1 font-mono text-2xs font-medium tracking-[0.12em] uppercase"
                style={{ color: 'var(--text-secondary)' }}
              >
                Total platform debt
              </p>
              <p className="flex items-baseline gap-1.5">
                <span
                  className="font-mono text-sm font-medium tracking-widest uppercase"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {revenue.currency}
                </span>
                <span
                  className="font-mono text-2xl leading-[0.9] font-medium tracking-[-0.02em]"
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
          <div className="flex h-full flex-col pt-1">
            <div className="mb-6 w-full">
              <p
                className="font-ui text-sm leading-relaxed text-pretty"
                style={{ color: 'var(--text-secondary)' }}
              >
                Grouped by how far past due each invoice is. Debt gets harder to collect the further
                right it sits, so the{' '}
                <span className="font-medium" style={{ color: 'var(--danger-fg)' }}>
                  90+ days
                </span>{' '}
                bucket is the one to work first — and the one most likely to be written off rather
                than recovered.
              </p>
            </div>
            <div className="relative min-h-0 min-w-0 flex-1">
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
      className="font-mono text-2xs tracking-[0.1em] uppercase"
      style={{ color: 'var(--text-tertiary)' }}
    >
      {currency}
    </span>
  );
}

/**
 * ⚠ THIS BAND HAD NO SKELETON AND THE OVERVIEW'S LOADING STATE COVERED EVERY
 *   OTHER BAND ON THE PAGE.
 *
 * `loading.tsx` renders `PortfolioBandSkeleton` and `OperationsBandSkeleton`
 * with a note explaining that without them the page "painted its header,
 * signals, queue and rail at full height and then GREW by three more bands
 * when the data landed". The reasoning was right and one of the three bands
 * was missing from it — so the page still grew, by this one, every load.
 *
 * It mirrors both of the band's rows, and the asymmetry matters: the first is
 * 1.9/1 and the second is 1/1.9, so a skeleton that drew two identical rows
 * would put the wide panel on the wrong side halfway down and shift the whole
 * band sideways on arrival.
 */
export function RevenueBandSkeleton() {
  return (
    <SkeletonGroup label="Loading revenue" className="mb-10">
      <div className="mb-6 h-7" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Panel title="" variant="elevated">
          <ChartBlock h={236} />
        </Panel>
        <Panel title="" variant="elevated">
          <ChartBlock h={150} />
          <div className="mt-5 grid gap-3 border-t border-[var(--border-subtle)]/40 pt-3">
            {[0, 1, 2].map((i) => (
              <SkeletonText
                key={i}
                width={[78, 66, 84][i] ?? 74}
                className="!bg-[var(--surface-inset)]"
              />
            ))}
          </div>
        </Panel>
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.9fr)]">
        <Panel title="" variant="elevated">
          <div className="grid gap-3 py-2">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonText
                key={i}
                width={[62, 88, 48, 74][i] ?? 64}
                className="!bg-[var(--surface-inset)]"
              />
            ))}
          </div>
        </Panel>
        <Panel title="" variant="elevated">
          <ChartBlock h={196} />
        </Panel>
      </div>
    </SkeletonGroup>
  );
}

/** A chart's footprint. One block at the chart's height, not a stack of rows. */
function ChartBlock({ h }: { h: number }) {
  return (
    <div
      className="w-full animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-overlay motion-reduce:animate-none motion-reduce:opacity-70"
      style={{ height: h, background: 'var(--surface-inset)' }}
    />
  );
}
