import Link from 'next/link';
import { DataSource } from '../Surface';
import { SkeletonBar, SkeletonGroup } from '@/components/primitives/Skeleton';
import type { HealthModel } from '@/lib/console/data';
import {
  DAY_INK_INVERSE,
  DAY_WORD,
  compositeDays,
  incidentsOn,
  sentenceCase,
  spell,
} from './shared';

/**
 * THE DIAGNOSIS. The first thing on the page, and the answer to the only
 * question an operator opens Health to ask.
 *
 * ⚠ IT OPENS IN THE OVERVIEW'S VOICE ON PURPOSE. The overview begins with a
 * dark "situation" slab — an editorial headline over a chart — and the
 * operator who arrives here usually came from it. Opening Health the same way
 * says "same console, next level down" before a word is read; opening on a
 * flat header and a status pill, as it did, read like a different product.
 *
 * ⚠ THE HEADLINE IS SHORT AND THE LEDE IS COMPLETE. Sheet 11 asks for the
 * diagnosis before any row. The data layer derives a full sentence that names
 * every service; that is the lede. The headline is the verdict alone — how
 * many outages, how long — because a headline that has to be read twice is a
 * paragraph in a large font.
 *
 * ⚠ THE AMBIENT TINT IS THE SEVERITY. A faint wash in the top corner — green,
 * amber or red — so the state registers before the words do. It is the only
 * decoration on the slab, and it carries information.
 *
 * ⚠ THE COMPOSITE STRIP IS THE WHOLE PLATFORM IN ONE LINE: the worst thing that
 * happened to any service, each day. Every bar that is not green links to the
 * incident that coloured it.
 */
export function StatusSlab({ model }: { model: HealthModel }) {
  const { services, incidents, window, diagnosis } = model;

  const outages = incidents.filter((i) => i.impact === 'outage');
  const outageMinutes = outages.reduce((s, i) => s + i.minutes, 0);
  const slow = incidents.filter((i) => i.impact === 'degraded').length;
  const open = incidents.filter((i) => i.status !== 'resolved');

  const headline =
    open.length > 0
      ? `${open.length === 1 ? (open[0]?.title ?? 'An incident') : `${sentenceCase(spell(open.length))} incidents`} — open now.`
      : outages.length === 0 && slow === 0
        ? `Every service held its budget for ${spell(window.length)} days.`
        : outages.length === 0
          ? `No outages in ${spell(window.length)} days, and ${spell(slow)} slow ${slow === 1 ? 'spell' : 'spells'}.`
          : outages.length === 1
            ? `One outage in ${spell(window.length)} days, and it lasted ${spell(outageMinutes)} minutes.`
            : `${sentenceCase(spell(outages.length))} outages in ${spell(window.length)} days — ${outageMinutes} minutes in all.`;

  /* The lowest availability of any service — the figure that goes in a report. */
  const floor = [...services].sort((a, b) => parseFloat(a.uptime) - parseFloat(b.uptime))[0];
  const everyServiceFull = services.every((s) => s.uptime === '100%');

  const within = services.filter((s) => s.consumed <= 1);
  const tightest = [...services].sort((a, b) => b.consumed - a.consumed)[0];

  const lastIncident = [...incidents].sort((a, b) => b.at.localeCompare(a.at))[0];

  const composite = compositeDays(services);

  const glow =
    diagnosis.severity === 'incident'
      ? 'var(--chrome-danger)'
      : diagnosis.severity === 'degraded'
        ? 'var(--chrome-warning)'
        : 'var(--chrome-success)';

  return (
    <section
      aria-labelledby="health-diagnosis"
      className="relative overflow-hidden rounded-card"
      style={{
        background: 'var(--chrome-bg-base)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'var(--shadow-lg)',
        color: 'var(--invert-card-fg)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 0% 0%, color-mix(in oklab, ${glow} 16%, transparent) 0%, transparent 55%)`,
        }}
      />

      <div className="relative grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* ── The verdict ─────────────────────────────────────────────── */}
        <div className="flex flex-col gap-8 p-8 lg:p-12 lg:pr-10">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p
              className="font-mono text-2xs tracking-[0.2em] uppercase"
              style={{ color: 'var(--chrome-fg-faint)' }}
            >
              The diagnosis · last {window.length} days
            </p>
            <DataSource kind="designed" detail="probes at M6" inverse />
          </div>

          <div>
            <h2
              id="health-diagnosis"
              className="display display-md"
              style={{
                color: 'var(--invert-card-fg)',
                maxWidth: '24ch',
                textWrap: 'balance',
                letterSpacing: '-0.02em',
              }}
            >
              {headline}
            </h2>
            <p
              className="t-body mt-5"
              style={{ color: 'var(--chrome-fg-muted)', maxWidth: '62ch', textWrap: 'pretty' }}
            >
              {diagnosis.sentence}
            </p>
          </div>

          {/* ── The platform in one line ──────────────────────────────── */}
          <div>
            <div
              className="flex h-8 items-stretch gap-0.5"
              role="img"
              aria-label={`Every service, worst state per day, ${window[0]} to ${window[window.length - 1]}.`}
            >
              {composite.map((d, i) => {
                const events = incidentsOn(model, i);
                const label = `${window[i]} · ${DAY_WORD[d]}${events.length ? ` · ${events.map((e) => e.title).join('; ')}` : ''}`;
                const bar = (
                  <span
                    className="block h-full w-full rounded-bar transition-opacity"
                    style={{ background: DAY_INK_INVERSE[d] }}
                  />
                );
                const first = events[0];
                return first ? (
                  <Link
                    key={i}
                    href={`#${first.id}`}
                    title={label}
                    aria-label={label}
                    className="flex-1 rounded-bar outline-offset-2 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-[var(--chrome-info)]"
                  >
                    {bar}
                  </Link>
                ) : (
                  <span key={i} title={label} className="flex-1">
                    {bar}
                  </span>
                );
              })}
            </div>
            <div
              className="mt-2.5 flex items-center justify-between gap-4 font-mono text-2xs tracking-[0.08em] uppercase"
              style={{ color: 'var(--chrome-fg-faint)' }}
            >
              <span className="whitespace-nowrap">{window[0]}</span>
              <span className="hidden truncate sm:inline">
                Every service · worst state each day
              </span>
              <span className="whitespace-nowrap">{window[window.length - 1]}</span>
            </div>
          </div>
        </div>

        {/* ── Three figures ───────────────────────────────────────────── */}
        <dl
          className="m-0 grid content-center border-t px-8 py-4 lg:border-t-0 lg:border-l lg:px-10 lg:py-12"
          style={{ borderColor: 'rgba(255, 255, 255, 0.07)' }}
        >
          <SlabFigure
            label="Availability floor"
            value={floor?.uptime ?? '—'}
            note={
              everyServiceFull
                ? 'Every service, the full window.'
                : `${floor?.name}, the lowest of ${spell(services.length)}. Only outages count against it.`
            }
          />
          <SlabFigure
            label="Within budget now"
            value={String(within.length)}
            suffix={`of ${services.length}`}
            note={
              tightest
                ? `Tightest: ${tightest.name}, ${Math.round(tightest.consumed * 100)}% of its budget used.`
                : undefined
            }
          />
          <SlabFigure
            label={`Incidents · ${window.length} days`}
            value={String(incidents.length)}
            note={
              incidents.length === 0
                ? 'None to report.'
                : open.length > 0
                  ? `${spell(open.length)} still open.`
                  : `All resolved. The last was on ${lastIncident?.day}.`
            }
            last
          />
        </dl>
      </div>
    </section>
  );
}

function SlabFigure({
  label,
  value,
  suffix,
  note,
  last,
}: {
  label: string;
  value: string;
  /** The denominator, set small beside the figure. "4 of 4" in a monospace
   *  display size spreads into three words; "4" with "of 4" reads as one. */
  suffix?: string;
  note?: string;
  last?: boolean;
}) {
  return (
    <div
      className="py-5"
      style={last ? undefined : { borderBottom: '1px solid rgba(255, 255, 255, 0.07)' }}
    >
      <dt
        className="font-mono text-2xs tracking-[0.16em] uppercase"
        style={{ color: 'var(--chrome-fg-faint)' }}
      >
        {label}
      </dt>
      <dd className="m-0 mt-2.5">
        <span className="flex items-baseline gap-2">
          <span
            className="tabular-nums"
            style={{
              font: '500 var(--type-display)/1 var(--font-mono)',
              letterSpacing: '-0.02em',
              color: 'var(--invert-card-fg)',
            }}
          >
            {value}
          </span>
          {suffix ? (
            <span
              style={{
                font: '400 var(--type-lede)/1 var(--font-mono)',
                color: 'var(--chrome-fg-faint)',
              }}
            >
              {suffix}
            </span>
          ) : null}
        </span>
        {note ? (
          <span
            className="t-caption mt-2 block"
            style={{ color: 'var(--chrome-fg-faint)', textWrap: 'pretty' }}
          >
            {note}
          </span>
        ) : null}
      </dd>
    </div>
  );
}

/** The slab, dark while it loads because it is dark when it arrives. */
export function StatusSlabSkeleton() {
  return (
    <SkeletonGroup label="Loading the diagnosis" className="block">
      <div
        className="grid overflow-hidden rounded-card lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
        style={{
          background: 'var(--chrome-bg-base)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex flex-col gap-8 p-8 lg:p-12 lg:pr-10">
          <SkeletonBar inverse width={260} height={11} />
          <div>
            <SkeletonBar inverse width="min(24ch, 92%)" height={38} />
            <SkeletonBar inverse width="min(18ch, 70%)" height={38} className="mt-2.5" />
            <SkeletonBar inverse width="min(62ch, 100%)" height={14} className="mt-5" />
            <SkeletonBar inverse width="min(48ch, 84%)" height={14} className="mt-2" />
          </div>
          <div>
            <div className="flex h-8 gap-0.5">
              {Array.from({ length: 30 }).map((_, i) => (
                <SkeletonBar
                  key={i}
                  inverse
                  width="100%"
                  height="100%"
                  radius="rounded-bar"
                  className="flex-1"
                />
              ))}
            </div>
            <SkeletonBar inverse width="100%" height={10} className="mt-2.5" />
          </div>
        </div>
        <div
          className="grid content-center border-t px-8 py-4 lg:border-t-0 lg:border-l lg:px-10 lg:py-12"
          style={{ borderColor: 'rgba(255, 255, 255, 0.07)' }}
        >
          {[0, 1, 2].map((i) => (
            <div key={i} className="py-5">
              <SkeletonBar inverse width={140} height={10} />
              <SkeletonBar inverse width={120} height={31} className="mt-2.5" />
              <SkeletonBar inverse width="86%" height={12} className="mt-2" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonGroup>
  );
}
