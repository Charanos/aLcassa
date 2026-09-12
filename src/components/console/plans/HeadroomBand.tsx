import { BandLink, Panel, SectionHeading } from '../Surface';
import { PRESSURE_THRESHOLD, type HeadroomModel, type HeadroomRow } from '@/lib/console/data';

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

/** An unlimited row still gets a track. See `scaleOf`. */
const UNLIMITED_HEADROOM = 1.25;

/**
 * What 100% of the track means for this row.
 *
 * For a bounded entitlement it is the limit, so every row on a plan is read
 * against its own ceiling and "nearly full" looks the same everywhere.
 *
 * For an UNLIMITED one there is no ceiling to read against, so the track is
 * scaled to a quarter past the observed maximum. That is honest — the bar is
 * explicitly not a proportion of anything — and it keeps the row legible
 * rather than collapsing it to a dot at the far left of a track scaled to some
 * arbitrary large number.
 */
function scaleOf(row: HeadroomRow): number {
  if (row.limit !== null && row.limit > 0) return row.limit;
  return Math.max(row.max * UNLIMITED_HEADROOM, 1);
}

function pct(value: number, scale: number): number {
  return Math.max(0, Math.min(100, (value / scale) * 100));
}

function Row({ row }: { row: HeadroomRow }) {
  const scale = scaleOf(row);
  const medianPct = pct(row.p50, scale);
  const maxPct = pct(row.max, scale);
  const unbounded = row.limit === null;

  /*
    The accent, doing semantic work rather than decoration. It is the same hue
    the workspace table's amber state, the attention standfirst and the console
    meters use for "at a ceiling", so every surface names the same condition in
    the same colour. 03 §4a: one per screen — this band is that one.
  */
  const pressed = !unbounded && maxPct >= PRESSURE_THRESHOLD;
  const maxInk = pressed ? 'var(--accent-mark)' : 'var(--blue-500)';

  return (
    <div className="grid gap-1.5 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-compact truncate" style={{ color: 'var(--text-primary)' }}>
          {row.label}
        </span>
        <span
          className="shrink-0 whitespace-nowrap"
          style={{ font: '400 11.5px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
        >
          {row.tenants === 0
            ? 'nothing reports this'
            : unbounded
              ? `median ${row.p50} · max ${row.max} · no limit`
              : `median ${row.p50} · max ${row.max} of ${row.limit}`}
        </span>
      </div>

      {/*
        A track, a filled portion to the median, and a marker at the maximum.
        `role="img"` with a full label because the shape carries the meaning and
        a screen reader gets none of it from three divs. 03 §3 rule 3.
      */}
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--surface-inset)' }}
        role="img"
        aria-label={
          row.tenants === 0
            ? `${row.label}: no workspace reports this counter`
            : `${row.label}: median ${row.p50}, maximum ${row.max}${
                unbounded ? ', no limit' : ` of ${row.limit}`
              }`
        }
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${medianPct}%`, background: 'var(--blue-200)' }}
        />
        {row.tenants > 0 ? (
          <span
            className="absolute inset-y-0 w-[3px] rounded-full"
            style={{
              left: `calc(${maxPct}% - 1.5px)`,
              background: maxInk,
            }}
          />
        ) : null}
      </div>

      {row.atCeiling > 0 ? (
        <span
          className="whitespace-nowrap"
          style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--accent-mark-text)' }}
        >
          {row.atCeiling} {row.atCeiling === 1 ? 'workspace is' : 'workspaces are'} at{' '}
          {PRESSURE_THRESHOLD}% or above
        </span>
      ) : null}
    </div>
  );
}

export function HeadroomBand({ model }: { model: HeadroomModel }) {
  const plansWithRows = model.plans.filter((p) => p.rows.length > 0);

  return (
    <section className="mt-10">
      <SectionHeading
        title="Headroom"
        note="Where each plan's workspaces actually sit"
        action={<BandLink href="/platform/tenants">Open workspaces</BandLink>}
      />

      <p className="t-body -mt-3 mb-5" style={{ color: 'var(--text-secondary)', maxWidth: '72ch' }}>
        The pale bar is the median workspace on that plan; the mark is the busiest one. A limit
        nothing approaches is not protecting anything, and a limit one workspace is pressed against
        is a conversation with that customer rather than a change to the plan.
      </p>

      {plansWithRows.length === 0 ? (
        <Panel title="Headroom">
          <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
            No plan carries an entitlement yet, so there is nothing to measure against.
          </p>
        </Panel>
      ) : (
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: `repeat(auto-fit, minmax(280px, 1fr))` }}
        >
          {plansWithRows.map((plan) => (
            <Panel
              key={plan.key}
              title={plan.name}
              action={
                <span
                  className="whitespace-nowrap"
                  style={{ font: '400 11.5px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                >
                  {plan.tenants} {plan.tenants === 1 ? 'workspace' : 'workspaces'}
                </span>
              }
            >
              <div className="grid">
                {plan.rows.map((row) => (
                  <Row key={row.key} row={row} />
                ))}
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/*
        ⚠ A COUNTER NOTHING BOUNDS IS DRIFT, AND IT IS SURFACED RATHER THAN
        DROPPED. Something is counting a resource no plan limits — which is
        either a limit somebody forgot to add, or a counter nobody removed.
        Both are worth a line; neither is worth a silent filter.
      */}
      {model.orphanedCounters.length > 0 ? (
        <p
          className="t-compact mt-4"
          style={{ color: 'var(--warning-fg)', maxWidth: '72ch' }}
        >
          {model.orphanedCounters.length}{' '}
          {model.orphanedCounters.length === 1 ? 'counter is' : 'counters are'} tracked against no
          plan entitlement: <span className="numeric">{model.orphanedCounters.join(', ')}</span>.
          Either a limit is missing or the counter is.
        </p>
      ) : null}
    </section>
  );
}
