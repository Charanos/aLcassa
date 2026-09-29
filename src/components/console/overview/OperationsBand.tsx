import { IconActivity, IconShieldCheck } from '@tabler/icons-react';
import { LatencyChart } from '../Charts';
import { Panel, SectionHeading, DataSource } from '../Surface';
import { SkeletonGroup, SkeletonText } from '@/components/primitives/Skeleton';
import { BandLink } from './shared';
import type { OverviewInsights } from '@/lib/console/data';

/** How many queues before the panel defers to the health page. */
const QUEUES_SHOWN = 4;

/**
 * OPERATIONS. The overview's third band.
 *
 * ⚠ EVERY FIGURE IN THE LEFT HALF IS DESIGNED, AND THE BAND SAYS SO ONCE.
 *
 * Latency, service counts and queue depths come from probes that do not exist
 * in Phase 1. The health page makes the same statement about the same numbers;
 * repeating it here rather than assuming a reader arrived via that page is the
 * difference between a caveat and a caveat somebody sees.
 *
 * The support session figures are the exception and are genuinely live, which
 * is why they sit in their own panel rather than beside the probe data.
 *
 * Server component. Only the latency chart crosses into the client.
 */
export function OperationsBand({ operations }: { operations: OverviewInsights['operations'] }) {
  const { services } = operations;
  const total = services.ok + services.degraded + services.down;
  const allWell = services.degraded === 0 && services.down === 0;
  const queues = operations.queues.slice(0, QUEUES_SHOWN);
  const hiddenQueues = operations.queues.length - queues.length;
  /* The deepest queue on screen, which is what the mini-bars are drawn
     against. See the note at the bar. */
  const deepest = queues.reduce((max, q) => Math.max(max, q.depth), 0);

  return (
    <section className="mb-10">
      <SectionHeading
        title="Operations & Ledgers"
        note="Global latency metrics, service health, queue depths, and the support session accountability register."
        action={<BandLink href="/platform/health">Open health</BandLink>}
        align="left"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Panel
          title="Response latency · p50 / p95 / p99"
          action={<DataSource kind="designed" />}
          variant="elevated"
        >
          {operations.latency.length > 0 ? (
            <div className="flex h-full flex-col pt-1">
              <div className="mb-6 w-full">
                <p
                  className="font-ui text-sm leading-relaxed text-pretty"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Tail performance — p95 and p99 — against the median, hour by hour across the last
                  day. The tail is what pages somebody; a mean hides it.
                </p>
              </div>
              <div className="relative min-h-0 min-w-0 flex-1">
                <LatencyChart data={operations.latency} />
              </div>
            </div>
          ) : (
            <NoProbes
              title="No latency is being measured."
              body="p50, p95 and p99 arrive from the observability probes at M6."
            />
          )}
        </Panel>

        <div className="grid gap-5">
          <Panel title="Services" action={<DataSource kind="designed" />} variant="elevated">
            {total === 0 ? (
              <NoProbes
                title="No services are reporting."
                body="Each service answers a probe and appears here with its budget."
              />
            ) : (
              <div className="group relative overflow-hidden rounded-overlay border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-5 py-4 shadow-sm transition-shadow duration-300 hover:shadow-md">
                <p
                  className="t-compact relative z-10 font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {allWell
                    ? `All ${services.ok} services are inside their budget.`
                    : `${services.down > 0 ? `${services.down} down, ` : ''}${services.degraded} degraded of ${total}.`}
                </p>
                {operations.openIncidents > 0 ? (
                  <p
                    className="relative z-10 mt-1.5 text-sm font-medium"
                    style={{ color: 'var(--warning-fg)' }}
                  >
                    {operations.openIncidents} incident
                    {operations.openIncidents === 1 ? '' : 's'} still open.
                  </p>
                ) : null}
                <p
                  className="relative z-10 mt-2.5 text-sm font-medium opacity-70"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {operations.refusals.count24h.toLocaleString('en-KE')} refusals in 24h ·{' '}
                  {operations.refusals.note}
                </p>
              </div>
            )}
          </Panel>

          <Panel
            title="Queue depth"
            flush
            action={<DataSource kind="designed" />}
            variant="elevated"
          >
            {queues.length === 0 ? (
              <div className="px-1 pb-2">
                <NoProbes
                  title="No background queues."
                  body="Reconciliation and dispatch jobs report their depth here."
                />
              </div>
            ) : (
              <div className="px-1 pb-2">
                <div
                  className="flex flex-col overflow-hidden rounded-overlay bg-[var(--surface-raised)] transition-shadow duration-300 hover:shadow-md"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {queues.map((q, i, list) => {
                    const active = q.depth > 0;
                    const ink = active ? 'var(--warning-fg)' : 'var(--success-fg)';
                    /*
                      ⚠ THE BAR IS RELATIVE TO THE DEEPEST QUEUE, AND IT HAD BEEN
                      FABRICATED.

                      It shipped as `width: active ? '75%' : '100%'` — a depth of
                      61 and a depth of 3 drew the same bar, and an EMPTY queue
                      drew a full one, which is backwards. That is the "number
                      with no source" defect wearing a proportion, and a bar is
                      worse than a wrong figure because it looks derived.

                      `Queue` carries no ceiling, so there is no absolute
                      proportion to draw. What IS computable is how this queue
                      compares with the deepest one on screen, which is also the
                      question the panel exists to answer: which one is backing
                      up. When every queue is empty there is nothing to compare
                      and no bar is drawn.
                    */
                    const share = deepest > 0 ? Math.max(6, (q.depth / deepest) * 100) : 0;

                    return (
                      <div
                        key={q.name}
                        className="group transition-colors duration-300 hover:bg-[var(--surface-sunken)]"
                        style={{
                          borderBottom:
                            i === list.length - 1 && hiddenQueues === 0
                              ? 'none'
                              : '1px solid var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                          <span className="flex min-w-0 items-center gap-3">
                            <span
                              className="grid size-6 shrink-0 place-items-center rounded-panel transition-transform duration-200 group-hover:scale-105"
                              style={{ color: active ? ink : 'var(--blue-400)' }}
                              aria-hidden
                            >
                              <IconActivity size={15} stroke={1.75} />
                            </span>
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className="truncate text-base font-medium"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {q.name}
                              </span>
                              {active ? (
                                <span
                                  className="size-1.5 shrink-0 rounded-full"
                                  style={{ background: ink }}
                                  aria-hidden
                                />
                              ) : null}
                            </span>
                          </span>

                          <span className="flex shrink-0 items-center text-right">
                            <span className="flex flex-col items-end gap-1">
                              <span className="flex items-baseline justify-end gap-1.5">
                                <span
                                  className="font-mono text-base font-medium tracking-tight"
                                  style={{ color: active ? ink : 'var(--text-primary)' }}
                                >
                                  {q.depth.toLocaleString('en-KE')}
                                </span>
                                <span
                                  className="text-sm font-medium"
                                  style={{ color: 'var(--text-tertiary)' }}
                                >
                                  · {q.perMinute.toLocaleString('en-KE')}/min
                                </span>
                              </span>
                              {deepest > 0 ? (
                                <span
                                  className="flex h-[2px] w-24 overflow-hidden rounded-full bg-[var(--surface-inset)]"
                                  role="meter"
                                  aria-valuenow={q.depth}
                                  aria-valuemin={0}
                                  aria-valuemax={deepest}
                                  aria-label={`${q.name}: ${q.depth} queued, against ${deepest} in the deepest queue`}
                                >
                                  <span
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{
                                      width: `${share}%`,
                                      background: ink,
                                    }}
                                  />
                                </span>
                              ) : null}
                            </span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/*
                  ⚠ IT ADMITS WHEN IT IS TRUNCATING. The panel took the first
                  four and dropped the rest silently, so six queues looked
                  exactly like four — on the one panel whose entire job is
                  reporting depth.
                */}
                {hiddenQueues > 0 ? (
                  <p className="py-3">
                    <BandLink href="/platform/health">{hiddenQueues} more queues</BandLink>
                  </p>
                ) : null}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-8">
        <Panel
          title="Support sessions"
          action={<BandLink href="/platform/support-sessions">Open register</BandLink>}
          variant="elevated"
        >
          {operations.sessions.length === 0 ? (
            <NoSessionsYet />
          ) : (
            <div className="flex flex-col overflow-hidden rounded-overlay border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-sm transition-shadow duration-300 hover:shadow-md">
              <dl className="flex flex-col divide-y divide-[var(--border-subtle)] sm:flex-row sm:divide-x sm:divide-y-0">
                {operations.sessions.map((stat) => (
                  <div
                    key={stat.label}
                    className="group relative flex flex-1 flex-col justify-center p-6 transition-colors duration-300 hover:bg-[var(--surface-sunken)]"
                  >
                    {/*
                      ⚠ THE VALUE IS THE `dd` AND IT COMES SECOND IN THE MARKUP
                      EVEN THOUGH IT IS FIRST ON SCREEN. A definition list must
                      read term-then-value; the visual order is restored by the
                      column direction, so a screen reader hears "sessions this
                      week, four" rather than "four, sessions this week".
                    */}
                    <div className="flex flex-col-reverse gap-1.5">
                      <dt
                        className="text-sm font-medium tracking-wide uppercase"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {stat.label}
                      </dt>
                      <dd
                        className="flex items-center gap-3 font-mono text-2xl leading-none font-medium tracking-tight"
                        style={{
                          color: stat.tone === 'accent' ? 'var(--blue-500)' : 'var(--text-primary)',
                        }}
                      >
                        {stat.tone === 'accent' ? (
                          <span className="relative flex size-3.5 shrink-0 items-center justify-center">
                            <span
                              className="absolute inset-0 animate-ping rounded-full bg-[var(--blue-400)] opacity-40"
                              style={{ animationDuration: '3s' }}
                            />
                            <span className="relative size-2.5 rounded-full bg-[var(--blue-500)] shadow-[0_0_8px_var(--blue-400)]" />
                          </span>
                        ) : null}
                        {stat.value}
                      </dd>
                    </div>
                    {stat.note ? (
                      <p
                        className="mt-2 text-sm font-medium opacity-60"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {stat.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </dl>
            </div>
          )}
        </Panel>
      </div>
    </section>
  );
}

/*
 * ⚠ THE CAVEAT TRAVELS WITH THE PANEL, NOT WITH THE PAGE.
 *
 * Three panels in this band plot probe data that does not exist yet. A single
 * note at the top of the section is read once and then scrolled past; a label
 * in each panel's action slot is beside the figure at the moment somebody reads
 * it. The marker is `DataSource` in `Surface.tsx` now — this file held the
 * only copy, and it claimed "the health page makes the same statement about the
 * same numbers", which the health page did not until it could import this.
 */

/**
 * ⚠ A SEAM, NOT A FAILURE. `03 §16` separates the two: probes are a real
 * commitment with a milestone attached, so nothing here is broken. Saying so is
 * what stops an unwired panel reading as a dead one.
 */
function NoProbes({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-start gap-2 py-5">
      <IconActivity size={20} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {title}
      </p>
      <p
        className="t-caption"
        style={{ color: 'var(--text-secondary)', maxWidth: '38ch', textWrap: 'pretty' }}
      >
        {body}
      </p>
    </div>
  );
}

/**
 * ⚠ ZERO SUPPORT SESSIONS IS THE BEST READING ON THIS PANEL, and it is worth
 * saying so rather than showing an empty grid. This is an accountability
 * ledger: an empty one means the platform has not been inside a customer's
 * workspace, which is the outcome the whole feature is designed to make
 * visible.
 */
function NoSessionsYet() {
  return (
    <div className="flex flex-col items-start gap-2 py-4">
      <IconShieldCheck size={20} stroke={1.5} style={{ color: 'var(--success-fg)' }} aria-hidden />
      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        No support session has been opened.
      </p>
      <p
        className="t-caption"
        style={{ color: 'var(--text-secondary)', maxWidth: '52ch', textWrap: 'pretty' }}
      >
        Entering a workspace writes a row here and in that customer&rsquo;s own activity log, in the
        same transaction. Nothing has been entered.
      </p>
    </div>
  );
}

/**
 * The band's loading shape: a wide chart beside two stacked panels, then the
 * session ledger. Mirrors the real grid. `03 §15`.
 */
export function OperationsBandSkeleton() {
  return (
    <SkeletonGroup label="Loading operations" className="mb-10">
      <div className="mb-6 h-7" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <Panel title="" variant="elevated">
          <div
            className="h-[200px] w-full animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-overlay motion-reduce:animate-none motion-reduce:opacity-70"
            style={{ background: 'var(--surface-inset)' }}
          />
        </Panel>
        <div className="grid gap-5">
          {[0, 1].map((i) => (
            <Panel key={i} title="" variant="elevated">
              <div className="grid gap-3 py-1">
                <SkeletonText width={[86, 64][i] ?? 80} className="!bg-[var(--surface-inset)]" />
                <SkeletonText width={[58, 76][i] ?? 60} className="!bg-[var(--surface-inset)]" />
              </div>
            </Panel>
          ))}
        </div>
      </div>
      <div className="mt-8">
        <Panel title="" variant="elevated">
          <div className="grid gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-2">
                <SkeletonText
                  width={[34, 28, 40][i] ?? 34}
                  className="!bg-[var(--surface-inset)]"
                />
                <SkeletonText
                  width={[70, 82, 64][i] ?? 70}
                  className="!bg-[var(--surface-inset)]"
                />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </SkeletonGroup>
  );
}
