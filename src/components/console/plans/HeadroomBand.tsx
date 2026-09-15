import { IconInfoCircle } from '@tabler/icons-react';
import { BandLink, Panel, SectionHeading } from '../Surface';
import { type HeadroomModel } from '@/lib/console/data';
import { HeadroomPlanCard } from './HeadroomPlanCard';

/**
 * HEADROOM BY PLAN. 17 §7.
 *
 * ⚠ THIS IS THE QUESTION THE MATRIX ABOVE IT CANNOT ANSWER.
 *
 * The entitlement matrix says "staff seats: 25". It cannot say whether the
 * busiest workspace on that plan sits at 3 or at 24, and those two facts imply
 * opposite things about whether 25 was chosen well. Lowering a limit is a
 * blast-radius decision, and a blast radius nobody can see is one they guess.
 *
 * ⚠ IT IS DELIBERATELY NOT A RECHARTS CHART, and that is the interesting call.
 *
 * Every row has a DIFFERENT ceiling, so a single plot cannot carry one
 * reference line, and one chart per row is fourteen client components and a
 * hydration cost for something that is fundamentally two dots on a track. The
 * design system already specifies this shape — `03 §10`, the limit bar — so
 * this band is that component, repeated, drawn in CSS.
 *
 * The consequence is worth stating plainly: this whole band is a SERVER
 * component and ships no JavaScript at all. The data is already on the server;
 * the output is a stack of divs. Sending React to the browser to place two
 * markers on a track would be paying hydration for arithmetic.
 *
 * ⚠ THE MEDIAN AND THE MAXIMUM ARE BOTH SHOWN, and neither is enough alone. A
 * median at 8% with a maximum at 96% is a limit doing its job on exactly one
 * customer — which is a different business decision from a limit that half the
 * plan is pressed against, and an average would render them identically.
 */

export function HeadroomBand({ model }: { model: HeadroomModel }) {
  const plansWithRows = model.plans.filter((p) => p.rows.length > 0);

  return (
    <section className="mt-10">
      <SectionHeading
        title="Headroom"
        note="Where each plan's workspaces actually sit"
        align="right"
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
          style={{ gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))` }}
        >
          {plansWithRows.map((plan) => (
            <HeadroomPlanCard key={plan.key} plan={plan} />
          ))}
        </div>
      )}

      <div
        className="mt-6 flex flex-col gap-2 rounded-[24px] p-5 sm:flex-row sm:items-center sm:gap-6"
        style={{
          background: 'var(--surface-sunken)',
          boxShadow: 'var(--neu-inset)',
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
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The pale bar is the median workspace on that plan; the mark is the busiest one. A limit
            nothing approaches is not protecting anything, and a limit one workspace is pressed
            against is a conversation with that customer rather than a change to the plan.
          </p>
        </div>
      </div>

      {/*
        ⚠ A COUNTER NOTHING BOUNDS IS DRIFT, AND IT IS SURFACED RATHER THAN
        DROPPED. Something is counting a resource no plan limits — which is
        either a limit somebody forgot to add, or a counter nobody removed.
        Both are worth a line; neither is worth a silent filter.
      */}
      {model.orphanedCounters.length > 0 ? (
        <p className="t-compact mt-4" style={{ color: 'var(--warning-fg)', maxWidth: '72ch' }}>
          {model.orphanedCounters.length}{' '}
          {model.orphanedCounters.length === 1 ? 'counter is' : 'counters are'} tracked against no
          plan entitlement: <span className="numeric">{model.orphanedCounters.join(', ')}</span>.
          Either a limit is missing or the counter is.
        </p>
      ) : null}
    </section>
  );
}
