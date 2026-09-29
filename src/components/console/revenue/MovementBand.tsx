import { MovementChart } from '../Charts';
import { Panel, SectionHeading } from '../Surface';
import type { MrrMovement } from '@/lib/console/data';

/**
 * MRR MOVEMENT. 17 §7.
 *
 * ⚠ THIS IS THE BAND THE REVENUE PAGE WAS MISSING, and the reason is one
 * sentence: "MRR rose 4%" and "MRR rose 4% while churn doubled" are the same
 * line on the chart above it, and opposite businesses.
 *
 * ⚠ IT DOES NOT MOVE THE PAGE'S ENDING. The screen still finishes in the
 * collection queue — the page's stated law, and the right one: charts tell you
 * how you are doing, a list of names tells you who to call. This band sits
 * between the level chart and the queue, where the "why" belongs.
 *
 * ⚠ THE FIGURES ARE DESIGNED, AND THE BAND SAYS SO ONCE rather than hedging
 * every number. There is no payment gateway in Phase 1. The parts reconcile
 * with the level chart's `net` for every one of the twelve months — a fixture
 * whose arithmetic does not close is worse than no fixture, because the first
 * person to check it finds a bug that is not in the code and stops trusting
 * the screens that are correct.
 *
 * A server component. Only the chart crosses into the client, for the computed
 * palette and the tooltip; the ratios below are computed here, once.
 */

const KES = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${Math.round(n / 1_000)}k`;
  return KES.format(n);
}

export function MovementBand({ movement }: { movement: MrrMovement[] }) {
  const window12 = movement.reduce(
    (acc, m) => ({
      gained: acc.gained + m.new,
      expansion: acc.expansion + m.expansion,
      contraction: acc.contraction + m.contraction,
      churn: acc.churn + m.churn,
    }),
    { gained: 0, expansion: 0, contraction: 0, churn: 0 },
  );

  const gross = window12.gained + window12.expansion;
  const lost = window12.contraction + window12.churn;
  const net = gross - lost;

  /*
    ⚠ NET REVENUE RETENTION IS THE ONE RATIO WORTH A LINE ON THIS SCREEN.

    Expansion minus contraction and churn, against the base — it answers
    whether the existing book grows on its own, WITHOUT new customers. Above
    100% means the business would grow with acquisition switched off entirely.
    New logos are deliberately excluded: including them produces a number that
    always flatters and answers nothing.

    The base is approximated as the window's gross additions, because there is
    no period-opening MRR in the read model. That approximation is stated
    rather than hidden, and it is why the figure carries "approx".
  */
  const base = gross > 0 ? gross : 1;
  const nrr = ((window12.expansion - window12.contraction - window12.churn) / base) * 100 + 100;

  /* What share of what we won, we then lost. A leaking bucket reads high here
     while the level chart still climbs. */
  const leak = gross > 0 ? (lost / gross) * 100 : 0;

  return (
    <section className="mt-8">
      <SectionHeading title="Movement" note="Where the change came from" />

      <div className="grid items-stretch gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]">
        <Panel title="New, expansion, contraction and churn" variant="elevated">
          <div className="relative min-h-[260px] flex-1">
            <MovementChart data={movement} />
          </div>
        </Panel>

        <Panel title="Twelve months">
          <div className="grid">
            <Figure label="Gross added" value={compact(gross)} />
            <Figure label="Lost" value={compact(lost)} tone="danger" />
            <Figure label="Net" value={compact(net)} strong />
            <Figure
              label="Net revenue retention"
              value={`${nrr.toFixed(0)}% approx`}
              note="Existing workspaces only. Above 100% means the book grows with acquisition switched off."
            />
            <Figure
              label="Of every shilling won"
              value={`${leak.toFixed(0)}% lost again`}
              note="High here with a rising level chart is a leaking bucket."
            />
          </div>

          <p
            className="t-caption mt-4 border-t pt-3.5"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
          >
            Designed figures. There is no payment gateway in Phase 1, so nothing here was charged.
            The parts reconcile with the level chart above for every month.
          </p>
        </Panel>
      </div>
    </section>
  );
}

function Figure({
  label,
  value,
  note,
  tone,
  strong,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: 'danger';
  strong?: boolean;
}) {
  return (
    <div
      className="group flex flex-col gap-1.5 py-4 first:pt-2"
      style={{ borderTop: '1px solid color-mix(in srgb, var(--border-subtle) 50%, transparent)' }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <span
          className="font-ui text-sm font-medium transition-colors group-hover:text-[var(--text-primary)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          {label}
        </span>
        <span
          className="numeric shrink-0 whitespace-nowrap"
          style={{
            fontSize: strong ? '20px' : '14px',
            fontWeight: strong ? 500 : 400,
            letterSpacing: strong ? '-0.02em' : 'normal',
            color: tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)',
          }}
        >
          {value}
        </span>
      </div>
      {note ? (
        <p
          className="font-ui text-sm leading-snug"
          style={{ color: 'var(--text-tertiary)', maxWidth: '42ch' }}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
