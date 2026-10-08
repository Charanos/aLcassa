import { IconInfoCircle } from '@tabler/icons-react';
import { BandLink, Panel, SectionHeading } from '../Surface';
import { SkeletonGroup, SkeletonBar } from '@/components/primitives/Skeleton';
import { type HeadroomModel } from '@/lib/console/data';
import { HeadroomPlanCard } from './HeadroomPlanCard';

/** Recorded usage grouped by plan; absent measurements remain explicit. */

export function HeadroomBand({ model }: { model: HeadroomModel }) {
  const plansWithRows = model.plans.filter((p) => p.rows.length > 0);

  return (
    <section className="mt-10">
      <SectionHeading
        title="Headroom"
        note="Where each plan's workspaces actually sit"
        align="left"
        action={<BandLink href="/platform/tenants">Open workspaces</BandLink>}
      />

      {plansWithRows.length === 0 ? (
        <Panel title="Headroom">
          <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
            No plan carries an entitlement yet, so there is nothing to measure against.
          </p>
        </Panel>
      ) : (
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 280px), 1fr))` }}
        >
          {plansWithRows.map((plan) => (
            <HeadroomPlanCard key={plan.key} plan={plan} />
          ))}
        </div>
      )}

      <div
        className="mt-6 flex flex-col gap-2 rounded-panel p-4 sm:flex-row sm:items-center sm:gap-5"
        style={{
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          style={{
            background: 'var(--surface-raised)',
            boxShadow: 'var(--shadow-sm), var(--glass-highlight)',
          }}
        >
          <IconInfoCircle
            size={20}
            stroke={1.5}
            style={{ color: 'var(--text-tertiary)' }}
            aria-hidden
          />
        </div>
        <div className="flex-1">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The bar shows median usage and the mark shows the highest recorded usage against a
            positive plan allowance. Unlimited allowances and metrics without recorded usage have no
            percentage bar.
          </p>
        </div>
      </div>

      {/* Counters without a corresponding entitlement remain visible. */}
      {model.orphanedCounters.length > 0 ? (
        <p className="t-compact mt-4" style={{ color: 'var(--warning-fg)' }}>
          {model.orphanedCounters.length}{' '}
          {model.orphanedCounters.length === 1 ? 'counter is' : 'counters are'} tracked against no
          plan entitlement: <span className="numeric">{model.orphanedCounters.join(', ')}</span>.
          Either a limit is missing or the counter is.
        </p>
      ) : null}
    </section>
  );
}

/** Recorded usage grouped by plan; absent measurements remain explicit. */
export function HeadroomBandSkeleton() {
  return (
    <SkeletonGroup label="Loading headroom" className="mt-8 block">
      {/* The right-aligned heading, at the rhythm SectionHeading uses. */}
      <div className="mt-12 mb-6 flex flex-col items-start sm:mt-16 sm:mb-8">
        <SkeletonBar width="132px" height={20} />
        <SkeletonBar width="min(420px, 100%)" height={12} className="mt-2.5" />
      </div>

      <div
        className="grid gap-6"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-panel p-5"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-raised)',
              boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
            }}
          >
            <SkeletonBar width={`${44 - i * 6}%`} height={18} />
            <SkeletonBar width="72%" height={12} className="mt-2.5" />
            {/* Each entitlement row: a label, a value, and its bar. */}
            <div className="mt-6 grid gap-5">
              {[0, 1, 2, 3].map((r) => (
                <div key={r}>
                  <div className="flex items-baseline justify-between gap-3">
                    <SkeletonBar width={`${58 - ((i + r) % 4) * 8}%`} height={12} />
                    <SkeletonBar width="52px" height={12} />
                  </div>
                  <SkeletonBar width="100%" height={6} className="mt-2.5" radius="rounded-bar" />
                </div>
              ))}
            </div>
            <SkeletonBar width="100%" height={36} className="mt-7" radius="rounded-full" />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
