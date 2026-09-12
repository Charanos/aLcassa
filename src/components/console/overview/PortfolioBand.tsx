import { IconBuildings, IconChartAreaLine } from '@tabler/icons-react';
import { GrowthChart, StatusMixChart } from '../Charts';
import { StatusLegend } from './StatusLegend';
import { Panel, SectionHeading } from '../Surface';
import { SkeletonGroup, SkeletonText } from '@/components/primitives/Skeleton';
import { BandLink } from './shared';
import { CapacityMeter } from './CapacityMeter';
import { PressureList } from './PressureList';
import type { OverviewInsights } from '@/lib/console/data';

/**
 * PORTFOLIO AND CAPACITY. The overview's second band.
 *
 * ⚠ TWO KINDS OF FIGURE SIT IN THIS BAND AND THEY ARE NOT INTERCHANGEABLE.
 *
 * The status mix and the two platform capacity meters are **stated aggregates**
 * — the portfolio's real totals, which the twelve-row sample behind this screen
 * cannot produce. The pressure list is **derived** from those rows.
 *
 * That distinction caused a near-miss once already: counting the sample for the
 * status donut would have rendered "12 workspaces" under a hero saying 47. The
 * two are kept apart deliberately and `PORTFOLIO_COUNT` is the single source of
 * the headline.
 *
 * Server component. Only the two charts cross into the client, for the computed
 * palette and their tooltips.
 */
export function PortfolioBand({ portfolio }: { portfolio: OverviewInsights['portfolio'] }) {
  const total = portfolio.statusMix.reduce((sum, s) => sum + s.count, 0);
  const hasGrowth = portfolio.growth.length > 0;

  return (
    <section className="mb-10">
      <SectionHeading
        title="Portfolio & Capacity"
        note="Workspace distribution, growth trends, limits pressure, and total platform capacity."
        action={<BandLink href="/platform/tenants">Open workspaces</BandLink>}
        align="right"
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel title={`Status · ${total} workspaces`} variant="elevated">
          {total === 0 ? (
            <NoWorkspaces />
          ) : (
            <div className="flex flex-col h-full pt-1">
              <div className="flex-1 min-w-0 min-h-0 relative">
                <StatusMixChart data={portfolio.statusMix} />
              </div>
              {/*
                ⚠ THE LEGEND IS WHAT MAKES THE DONUT'S SEMANTIC HUES PERMITTED.
                `03 §24` allows a chart to use meaningful colours rather than a
                one-hue ramp only when every slice is named in words beside it.
                A reader who cannot separate the colours reads this list and
                loses nothing. Removing it would break the chart above it.
              */}
              <StatusLegend slices={portfolio.statusMix} total={total} />
            </div>
          )}
        </Panel>

        <Panel title="Opened against closed" variant="elevated">
          {hasGrowth ? (
            <div className="flex-1 min-w-0 min-h-0 relative pt-2">
              <GrowthChart data={portfolio.growth} />
            </div>
          ) : (
            <NoGrowthYet />
          )}
        </Panel>

        <Panel title="At the ceiling" variant="elevated">
          <PressureList rows={portfolio.pressure} total={total} />
        </Panel>
      </div>

      {/*
        ⚠ ONE COMPONENT, TWICE. These were two near-identical forty-line blocks
        that had already begun to diverge — seats drew blue and events drew
        green, for no reason either could state. See `CapacityMeter`.
      */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Panel title="Seats in use across the platform" variant="elevated">
          <CapacityMeter
            title="Seats in use"
            used={portfolio.seats.used}
            limit={portfolio.seats.limit}
            pct={portfolio.seats.pct}
            unit="seats"
          />
        </Panel>

        <Panel title="Events this period" variant="elevated">
          <CapacityMeter
            title="Events this period"
            used={portfolio.events.used}
            limit={portfolio.events.limit}
            pct={portfolio.events.pct}
            unit="events"
          />
        </Panel>
      </div>
    </section>
  );
}

/**
 * ⚠ A PLATFORM WITH NO WORKSPACES IS DAY ONE, NOT A FAILURE. It is also the
 * state a reviewer meets on a fresh database, so it is the first thing this
 * screen ever shows somebody. `10 §12`.
 */
function NoWorkspaces() {
  return (
    <div className="flex flex-col items-start gap-2 py-6">
      <IconBuildings size={20} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
        No workspaces yet.
      </p>
      <p
        className="t-caption"
        style={{ color: 'var(--text-secondary)', maxWidth: '34ch', textWrap: 'pretty' }}
      >
        The first provisioned workspace appears here, split by status. Nothing has been created —
        this is not a failure to load.
      </p>
    </div>
  );
}

/**
 * ⚠ A SERIES WITH NO POINTS RENDERS AS AN EMPTY PLOT AREA, which reads as a
 * broken chart rather than as a young platform. It says which it is.
 */
function NoGrowthYet() {
  return (
    <div className="flex flex-col items-start gap-2 py-6">
      <IconChartAreaLine
        size={20}
        stroke={1.5}
        style={{ color: 'var(--text-tertiary)' }}
        aria-hidden
      />
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
        Not enough history yet.
      </p>
      <p
        className="t-caption"
        style={{ color: 'var(--text-secondary)', maxWidth: '34ch', textWrap: 'pretty' }}
      >
        Opened against closed needs a month of workspaces behind it before the shape means
        anything.
      </p>
    </div>
  );
}

/**
 * The band's loading shape: three panels across, then two. Mirrors the real
 * grid so the page below it does not move when the band lands. `03 §15`.
 */
export function PortfolioBandSkeleton() {
  return (
    <SkeletonGroup label="Loading portfolio" className="mb-10">
      <div className="mb-6 h-7" />
      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Panel key={i} title="">
            <div className="grid gap-3 py-2">
              <SkeletonText width={[64, 58, 70][i] ?? 64} />
              <SkeletonText width={[92, 84, 88][i] ?? 90} />
              <SkeletonText width={[46, 52, 40][i] ?? 46} />
              <SkeletonText width={[78, 70, 82][i] ?? 78} />
            </div>
          </Panel>
        ))}
      </div>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <Panel key={i} title="">
            <div className="grid gap-3 py-2">
              <SkeletonText width={[38, 42][i] ?? 38} />
              <SkeletonText width={100} />
            </div>
          </Panel>
        ))}
      </div>
    </SkeletonGroup>
  );
}
