import { IconActivity, IconShieldCheck } from '@tabler/icons-react';
import { LatencyChart } from '../Charts';
import { FactRow, Panel, SectionHeading } from '../Surface';
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
          action={<Designed />}
        >
          {operations.latency.length > 0 ? (
            <LatencyChart data={operations.latency} />
          ) : (
            <NoProbes
              title="No latency is being measured."
              body="p50, p95 and p99 arrive from the observability probes at M6."
            />
          )}
        </Panel>

        <div className="grid gap-5">
          <Panel title="Services" action={<Designed />}>
            {total === 0 ? (
              <NoProbes
                title="No services are reporting."
                body="Each service answers a probe and appears here with its budget."
              />
            ) : (
              <div className="relative overflow-hidden rounded-xl bg-[var(--surface-sunken)] px-4 py-3.5 transition-colors duration-300 hover:bg-[var(--surface-inset)]">
                {/*
                  A left rule rather than a panel tint. `03 §20`: state is
                  carried by a badge and a rule, never by colouring a whole
                  surface — a filled amber panel is an alarm, a rule is
                  information.
                */}
                <div
                  className="pointer-events-none absolute top-0 left-0 h-full w-1 opacity-60"
                  style={{
                    background: allWell
                      ? 'linear-gradient(to bottom, var(--success-fg), transparent)'
                      : 'linear-gradient(to bottom, var(--warning-fg), transparent)',
                  }}
                  aria-hidden
                />
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
                    className="relative z-10 mt-1.5 text-[13px] font-medium"
                    style={{ color: 'var(--warning-fg)' }}
                  >
                    {operations.openIncidents} incident
                    {operations.openIncidents === 1 ? '' : 's'} still open.
                  </p>
                ) : null}
                <p
                  className="relative z-10 mt-2.5 text-[12px] font-medium opacity-70"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {operations.refusals.count24h.toLocaleString('en-KE')} refusals in 24h ·{' '}
                  {operations.refusals.note}
                </p>
              </div>
            )}
          </Panel>

          <Panel title="Queue depth" flush action={<Designed />}>
            {queues.length === 0 ? (
              <div className="px-5 pb-2">
                <NoProbes
                  title="No background queues."
                  body="Reconciliation and dispatch jobs report their depth here."
                />
              </div>
            ) : (
              <div className="px-5">
                {queues.map((q, i, list) => (
                  <FactRow
                    key={q.name}
                    label={q.name}
                    value={`${q.depth.toLocaleString('en-KE')} · ${q.rate}`}
                    dot={q.depth > 0 ? 'warn' : 'ok'}
                    last={i === list.length - 1 && hiddenQueues === 0}
                  />
                ))}
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
        >
          {operations.sessions.length === 0 ? (
            <NoSessionsYet />
          ) : (
            <dl
              className="grid gap-6 rounded-2xl px-6 py-5 sm:grid-cols-3"
              style={{ background: 'var(--surface-sunken)', boxShadow: 'var(--well-inset)' }}
            >
              {operations.sessions.map((stat) => (
                <div key={stat.label}>
                  {/*
                    ⚠ THE VALUE IS THE `dd` AND IT COMES SECOND IN THE MARKUP
                    EVEN THOUGH IT IS FIRST ON SCREEN. A definition list must
                    read term-then-value; the visual order is restored by the
                    column direction, so a screen reader hears "sessions this
                    week, four" rather than "four, sessions this week".
                  */}
                  <div className="flex flex-col-reverse">
                    <dt
                      className="mt-1.5 text-[13px] font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {stat.label}
                    </dt>
                    <dd
                      className="font-mono text-[24px] font-medium tracking-tight"
                      style={{
                        color: stat.tone === 'accent' ? 'var(--blue-400)' : 'var(--text-primary)',
                      }}
                    >
                      {stat.value}
                    </dd>
                  </div>
                  <p
                    className="mt-0.5 text-[12px] font-medium opacity-60"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {stat.note}
                  </p>
                </div>
              ))}
            </dl>
          )}
        </Panel>
      </div>
    </section>
  );
}

/**
 * ⚠ THE CAVEAT TRAVELS WITH THE PANEL, NOT WITH THE PAGE.
 *
 * Three panels in this band plot probe data that does not exist yet. A single
 * note at the top of the section is read once and then scrolled past; a label
 * in each panel's action slot is beside the figure at the moment somebody reads
 * it. Same statement the health page makes about the same numbers.
 */
function Designed() {
  return (
    <span
      className="font-mono text-[10px] tracking-[0.1em] uppercase"
      style={{ color: 'var(--text-tertiary)' }}
      title="No observability probes in Phase 1. These are the designed figures."
    >
      designed
    </span>
  );
}

/**
 * ⚠ A SEAM, NOT A FAILURE. `03 §16` separates the two: probes are a real
 * commitment with a milestone attached, so nothing here is broken. Saying so is
 * what stops an unwired panel reading as a dead one.
 */
function NoProbes({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-start gap-2 py-5">
      <IconActivity size={20} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
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
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
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
        <Panel title="">
          <div
            className="h-[200px] w-full animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-panel motion-reduce:animate-none motion-reduce:opacity-70"
            style={{ background: 'var(--surface-sunken)' }}
          />
        </Panel>
        <div className="grid gap-5">
          {[0, 1].map((i) => (
            <Panel key={i} title="">
              <div className="grid gap-3 py-1">
                <SkeletonText width={[86, 64][i] ?? 80} />
                <SkeletonText width={[58, 76][i] ?? 60} />
              </div>
            </Panel>
          ))}
        </div>
      </div>
      <div className="mt-8">
        <Panel title="">
          <div className="grid gap-6 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid gap-2">
                <SkeletonText width={[34, 28, 40][i] ?? 34} />
                <SkeletonText width={[70, 82, 64][i] ?? 70} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </SkeletonGroup>
  );
}

