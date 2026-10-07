import Link from 'next/link';
import { IconTile } from '@/components/primitives/IconTile';
import { StatusBadge } from '@/components/primitives/StatusBadge';
import {
  SkeletonBar,
  SkeletonGroup,
  SkeletonSectionHeading,
} from '@/components/primitives/Skeleton';
import { DataSource, SectionHeading } from '../Surface';
import type { HealthModel, Service } from '@/lib/console/data';
import { DAY_INK, DAY_WORD, SERVICE_ICON, incidentsOn, serviceVerdict } from './shared';

/**
 * SERVICES. Four cards, each answering "is it holding, and has it held?".
 *
 * ⚠ THE THIRTY-DAY STRIP IS STILL THE MOST INFORMATIVE THING ON THE PAGE. A
 * single uptime figure cannot tell "99.82% because of one bad afternoon" from
 * "99.82% because it wobbles every third day" — completely different
 * engineering problems. The strip shows the shape the percentage averages
 * away, which is why it sits beside the number rather than replacing it.
 *
 * ⚠ ONE ENCODING FOR FOUR DIFFERENT METRICS. The cards used to show "142ms",
 * "11ms", "1.9s" and "99.4%" side by side and leave the reader to know, per
 * service, whether higher was better and how close the edge was. Each card now
 * carries the same bar: the fraction of its budget in use. For a ceiling
 * (latency) that is value over target; for a floor (delivery success) it is
 * the error budget spent. 71% means the same thing on every card.
 *
 * ⚠ EVERY BAD DAY IS A LINK. An amber bar with no explanation is a question
 * the page raises and does not answer. Each one now jumps to the incident that
 * coloured it, in the log at the foot of the page.
 */
export function ServicesBand({ model }: { model: HealthModel }) {
  return (
    <section aria-labelledby="health-services">
      <SectionHeading
        id="health-services"
        title="Services"
        note="Thirty days each, held against the budget it answers to."
        action={<DataSource kind="designed" detail="probes at M6" />}
      />
      {/*
        ⚠ NOT `auto-fit`. At a laptop width `minmax(290px, 1fr)` fits three,
        and the fourth service sat alone on a row of its own. Four cards want
        two by two until there is room for all four across.
      */}
      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
        {model.services.map((s) => (
          <ServiceCard key={s.key} service={s} model={model} />
        ))}
      </div>
    </section>
  );
}

function ServiceCard({ service: s, model }: { service: Service; model: HealthModel }) {
  const verdict = serviceVerdict(s);
  const Icon = SERVICE_ICON[s.icon];
  const pct = Math.round(s.consumed * 100);

  /* ⚠ THE FILL IS QUIET UNTIL IT IS NOT. Neutral ink up to 85%, amber from
     there to the edge, red past it. A budget bar that is always coloured
     trains the eye to ignore colour; one that stays grey while things are fine
     makes the first amber one impossible to miss. */
  const fill =
    s.consumed > 1
      ? 'var(--danger-fg)'
      : s.consumed > 0.85
        ? 'var(--warning-fg)'
        : 'var(--ink-400)';

  const budgetWord = s.bound === 'ceiling' ? 'of its budget' : 'of its error budget';

  return (
    <article
      aria-labelledby={`svc-${s.key}`}
      className="flex min-w-0 flex-col rounded-card p-6"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
      }}
    >
      {/* ── Identity and verdict ──────────────────────────────────────── */}
      <header className="flex items-center gap-3">
        <IconTile
          icon={Icon}
          size="sm"
          tone={verdict.tone === 'success' ? 'neutral' : verdict.tone}
        />
        <h3
          id={`svc-${s.key}`}
          className="min-w-0 flex-1 truncate"
          style={{ font: '500 var(--type-body)/1.3 var(--font-ui)', color: 'var(--text-primary)' }}
        >
          {s.name}
        </h3>
        <StatusBadge tone={verdict.tone} size="sm" dot>
          {verdict.label}
        </StatusBadge>
      </header>

      {/* ── The figure, and what it measures ──────────────────────────── */}
      <p
        className="mt-6 tabular-nums"
        style={{
          font: '500 var(--type-display)/1 var(--font-mono)',
          letterSpacing: '-0.02em',
          color: 'var(--text-primary)',
        }}
      >
        {s.metric}
      </p>
      <p className="t-caption mt-2" style={{ color: 'var(--text-tertiary)' }}>
        {s.note}
      </p>

      {/* ── Budget consumed ───────────────────────────────────────────── */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <span
            className="font-mono text-2xs tracking-[0.12em] uppercase"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {s.budget}
          </span>
          <span className="t-caption tabular-nums" style={{ color: 'var(--text-secondary)' }}>
            {pct}% {budgetWord}
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--surface-inset)' }}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.min(pct, 100)}
          aria-label={`${s.name}: ${pct}% ${budgetWord}`}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.min(pct, 100)}%`, background: fill }}
          />
        </div>
      </div>

      {/* ── Thirty days ───────────────────────────────────────────────── */}
      <div className="mt-6 border-t pt-5" style={{ borderColor: 'var(--border-subtle)' }}>
        <div
          className="flex h-7 items-stretch gap-0.5"
          role="img"
          aria-label={`${s.name}: ${s.uptime} available over the last ${s.days.length} days. ${verdict.label}.`}
        >
          {s.days.map((d, i) => {
            const events = incidentsOn(model, i, s.key);
            const first = events[0];
            const label = `${model.window[i]} · ${DAY_WORD[d]}${first ? ` · ${first.title} (${first.minutes} min)` : ''}`;
            const bar = (
              <span
                className="block h-full w-full rounded-bar"
                style={{ background: DAY_INK[d] }}
              />
            );
            return first ? (
              <Link
                key={i}
                href={`#${first.id}`}
                title={label}
                aria-label={label}
                className="flex-1 rounded-bar transition-transform hover:scale-y-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
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
          className="mt-2.5 flex items-center justify-between gap-3 font-mono text-2xs tracking-[0.06em]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span className="whitespace-nowrap">{model.window[0]}</span>
          <span className="whitespace-nowrap">
            <span style={{ color: 'var(--text-secondary)' }}>{s.uptime}</span> available
          </span>
          <span className="whitespace-nowrap">{model.window[model.window.length - 1]}</span>
        </div>
      </div>
    </article>
  );
}

export function ServicesBandSkeleton() {
  return (
    <SkeletonGroup label="Loading services" className="block">
      <SkeletonSectionHeading />
      <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-card p-6"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
            }}
          >
            <div className="flex items-center gap-3">
              <SkeletonBar width={28} height={28} radius="rounded-panel" />
              <SkeletonBar width="42%" height={14} />
              <span className="flex-1" />
              <SkeletonBar width={72} height={20} radius="rounded-full" />
            </div>
            <SkeletonBar width={96} height={31} className="mt-6" />
            <SkeletonBar width="58%" height={12} className="mt-2" />
            <div className="mt-5 flex justify-between">
              <SkeletonBar width={92} height={10} />
              <SkeletonBar width={118} height={12} />
            </div>
            <SkeletonBar width="100%" height={6} radius="rounded-full" className="mt-2" />
            <div className="mt-6 border-t pt-5" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex h-7 gap-0.5">
                {Array.from({ length: 30 }).map((_, d) => (
                  <SkeletonBar
                    key={d}
                    width="100%"
                    height="100%"
                    radius="rounded-bar"
                    className="flex-1"
                  />
                ))}
              </div>
              <SkeletonBar width="100%" height={10} className="mt-2.5" />
            </div>
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
