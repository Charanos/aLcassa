import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconArrowRight,
  IconActivity,
  IconBuildings,
  IconCoin,
  IconCreditCard,
  IconDashboard,
  IconChartPie,
  IconBolt,
  IconUsers,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, Panel, SectionHeading } from '@/components/console/Surface';
import {
  getOverview,
  getOverviewInsights,
  PORTFOLIO_COUNT,
  greeting,
  type Signal,
} from '@/lib/console/data';
import { getLiveOverview } from '@/lib/console/live';
import { resolveSupportSession } from '@/lib/console/session';
import { OverviewChart } from '@/components/console/OverviewChart';
import { ProvisionWorkspaceButton } from '@/components/console/ProvisionWorkspaceButton';
import { OperationsBand } from '@/components/console/overview/OperationsBand';
import { PortfolioBand } from '@/components/console/overview/PortfolioBand';
import { RevenueBand } from '@/components/console/overview/RevenueBand';
import { YourQueue } from '@/components/console/overview/YourQueue';
import { PlatformTelemetry } from '@/components/console/overview/PlatformTelemetry';
import { LastActions } from '@/components/console/overview/LastActions';
import { Badge } from '@/components/primitives/Badge';

export const metadata: Metadata = { title: 'Overview' };

/**
 * The console overview. `Overview.dc.html`.
 *
 * ⚠ THIS SCREEN IS A BRIEFING, NOT A DASHBOARD, and every layout decision
 * follows from that.
 *
 * The obvious version of this page is a grid of metric tiles. The design
 * rejects that, and it is right to: a grid of numbers tells an operator what
 * is true but not what to do, so it gets read once and then ignored. This one
 * opens with a SENTENCE naming the day's actual problem, and its main column
 * is a queue ordered by what each item costs to ignore.
 *
 * Three consequences worth stating, because they look like mistakes otherwise:
 *
 *  · The numbers are demoted. They sit in the inverted band as supporting
 *    detail beneath the sentence, not as the first thing on the page.
 *  · The queue outranks the right rail on width (1.9fr to 1fr). Health and
 *    the audit tail are reference; the queue is work.
 *  · There is a closing line for the 43 workspaces that need nothing. A queue
 *    with four items and no denominator reads as a system in trouble, when in
 *    fact 91% of it is fine — and an operator who cannot see that will keep
 *    checking the ones that are.
 */



/**
 * ⚠ KEYED BY THE MODEL'S OWN UNION RATHER THAN BY `string`.
 *
 * `Record<string, TablerIcon>` accepts a lookup for a key that was never
 * added, so widening `Signal['icon']` and forgetting this map would have
 * fallen through to the `?? IconActivity` default in silence — a signal
 * rendering the generic glyph, which reads as a design choice rather than as
 * the omission it is. Typed against the union, the same mistake is a build
 * error.
 */
const SIGNAL_ICON: Record<Signal['icon'], TablerIcon> = {
  coin: IconCoin,
  pulse: IconCreditCard,
  building: IconBuildings,
  bolt: IconBolt,
  users: IconUsers,
};

export default async function ConsoleOverviewPage() {
  /**
   * Live first, designed fixture second.
   *
   * The queue, the signals and the recent activity now come from the
   * database. The fixture stays behind the review bypass, and it is the only
   * place the invented revenue and uptime figures still appear — see
   * `getLiveOverview` for why they are not reproduced against real rows.
   */
  const [live, session, insights] = await Promise.all([
    getLiveOverview(),
    resolveSupportSession(),
    getOverviewInsights(),
  ]);
  const model = live ?? (await getOverview());

  return (
    <ConsolePage>
      {/* Iconography watermarks safely contained */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute top-10 -right-8 hidden rotate-12 lg:block"
          style={{ color: 'var(--watermark-tint)' }}
        >
          <IconDashboard size={360} stroke={1} />
        </div>
        <div
          className="absolute top-[45%] -left-12 hidden -rotate-[10deg] lg:block"
          style={{ color: 'var(--watermark-tint)' }}
        >
          <IconChartPie size={280} stroke={1} />
        </div>
      </div>

      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'Overview' }]}
        eyebrow={model.stamp}
        title={`${greeting()}, ${model.operatorFirstName}`}
        actions={
          <>
            {session ? (
              <Link
                href="/platform/support-sessions"
                className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
                style={{
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                }}
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: 'var(--blue-500)',
                    animation: 'pulse-dot 2s ease-in-out infinite',
                  }}
                />
                1 session live
              </Link>
            ) : null}
            <ProvisionWorkspaceButton />
          </>
        }
      />

      {/* ── The situation & Chart ───────────────────────────────────────
          A completely overhauled inverse chrome section that combines the daily
          briefing with a dynamic Recharts visualization. */}
      <section
        className="relative mt-6 overflow-hidden rounded-[20px] shadow-2xl transition-all duration-300"
        style={{
          background: 'var(--chrome-bg-base)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'var(--invert-card-fg)',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.06)',
        }}
      >
        {/* ── Premium Ambient Background Art ── */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none" aria-hidden="true">
          {/* Deep atmospheric glows */}
          <div
            className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-[0.18] blur-[120px]"
            style={{ background: 'var(--blue-500)' }}
          />
          <div
            className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full opacity-[0.12] blur-[140px]"
            style={{ background: 'var(--blue-700)' }}
          />

          {/* Ultra-subtle, elegant mesh topology */}
          <svg
            className="absolute inset-0 h-full w-full opacity-[0.4]"
            viewBox="0 0 1000 400"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            <path
              d="M -100 250 C 200 350 400 50 700 150 S 1100 0 1200 100"
              stroke="url(#elegant-line-1)"
              strokeWidth="1.5"
            />
            <path
              d="M -50 300 C 250 400 450 100 750 200 S 1150 50 1250 150"
              stroke="url(#elegant-line-2)"
              strokeWidth="1"
              strokeDasharray="4 8"
            />
            <defs>
              <linearGradient id="elegant-line-1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--invert-card-fg)" stopOpacity="0" />
                <stop offset="40%" stopColor="var(--invert-card-fg)" stopOpacity="0.25" />
                <stop offset="80%" stopColor="var(--blue-400)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--invert-card-fg)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="elegant-line-2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--invert-card-fg)" stopOpacity="0" />
                <stop offset="50%" stopColor="var(--invert-card-fg)" stopOpacity="0.15" />
                <stop offset="100%" stopColor="var(--invert-card-fg)" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Minimalist dot matrix overlay */}
          <div
            className="absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)',
              WebkitMaskImage: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row">
          {/* Left Column: The Situation Briefing - uncarded */}
          <div className="relative flex flex-1 flex-col justify-between p-8 lg:p-12 lg:pr-8">
            <div className="relative z-10">
              <p
                className="mb-4 font-mono uppercase tracking-[0.15em]"
                style={{
                  color: 'var(--invert-card-fg)',
                  opacity: 0.5,
                  fontSize: '10.5px',
                  fontWeight: 500,
                }}
              >
                The Situation
              </p>
              {/* Refined editorial headline */}
              <h1
                className="display display-md leading-[1.12]"
                style={{
                  color: 'var(--invert-card-fg)',
                  maxWidth: '32ch',
                  textWrap: 'pretty',
                  fontSize: '38px',
                  letterSpacing: '-0.02em',
                  textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}
              >
                {model.headline.lead}
                <strong
                  style={{
                    fontWeight: 'inherit',
                    color: 'var(--accent-mark)',
                    background: 'linear-gradient(90deg, var(--accent-mark) 0%, var(--orange-300) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  {model.headline.figure}
                </strong>
                {model.headline.tail}
              </h1>
            </div>

            <div className="relative z-10 mt-10 flex flex-wrap items-center gap-4">
              <Link
                href="/platform/revenue"
                className="inline-flex h-10 cursor-pointer items-center gap-2.5 rounded-lg px-5 whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(255,255,255,0.15)]"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  color: 'var(--brand-navy)', // Matches the navy bg
                  font: '500 13.5px/1 var(--font-ui)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}
              >
                Open collection queue
                <IconArrowRight size={15} stroke={2.5} aria-hidden />
              </Link>
              <Link
                href="/platform/tenants"
                className="inline-flex h-10 cursor-pointer items-center rounded-lg px-5 whitespace-nowrap transition-all duration-300 hover:bg-[rgba(255,255,255,0.08)]"
                style={{
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'var(--invert-card-fg)',
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1)',
                  font: '500 13.5px/1 var(--font-ui)',
                }}
              >
                All {PORTFOLIO_COUNT} workspaces
              </Link>
            </div>
          </div>

          {/*
            Right column: the chart.

            ⚠ IT TAKES ITS SERIES AS A PROP NOW. It used to generate a
            `Math.random()` walk internally and label it "platform throughput"
            under a hardcoded 3.42M — a figure unrelated to the line beneath it,
            over data that was different on the server and the client. See the
            note at the top of `OverviewChart`.

            `insights.revenue.mrr` is twelve months of recurring revenue derived
            from the same twelve workspaces everything else on this page counts,
            so the hero's line, the signals under it and the revenue screen the
            button leads to are one set of numbers.
          */}
          <div className="relative min-h-[260px] flex-1 lg:min-h-[280px]">
            <OverviewChart series={insights.revenue.mrr} />
          </div>
        </div>

        {/* Bottom Bar: Signals - Telemetry Ribbon */}
        <div className="relative z-10 px-8 pb-8 lg:px-12 lg:pb-12">
          {/* Elegant sweeping gradient line instead of a hard border */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.15)] to-transparent opacity-60 lg:left-12 lg:right-12" />

          <div className="grid w-full grid-cols-1 gap-6 pt-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {model.signals.map((s, i) => {
              const Icon = SIGNAL_ICON[s.icon] ?? IconActivity;
              
              // Custom data parsing for premium presentation
              const isPositive = s.note.startsWith('Up ');
              const noteText = s.note.replace(/^Up /, '');

              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className="group relative flex cursor-pointer flex-col justify-between rounded-xl px-5 -m-5 py-3 transition-all duration-300 hover:bg-[rgba(255,255,255,0.03)] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                >
                  {/* Absolute Background Artwork Icon */}
                  <div className="pointer-events-none absolute -bottom-4 right-2 z-0 text-[var(--invert-card-fg)] opacity-[0.10] transition-transform duration-500 group-hover:scale-110 group-hover:opacity-[0.18]">
                    <Icon size={140} stroke={1} aria-hidden />
                  </div>

                  {/* Subtle right divider for grid columns */}
                  {i < model.signals.length - 1 && (
                    <div className="pointer-events-none absolute -right-4 top-1/2 hidden h-24 w-[1px] -translate-y-1/2 bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.12)] to-transparent lg:block" />
                  )}

                  <div className="relative z-10 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="font-mono text-[10.5px] font-medium uppercase tracking-[0.15em]"
                        style={{ color: 'var(--invert-card-fg)', opacity: 0.55 }}
                      >
                        {s.label}
                      </span>
                    </div>
                    <IconArrowRight
                      size={14}
                      stroke={2}
                      className="opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-40"
                      style={{ color: 'var(--invert-card-fg)' }}
                    />
                  </div>

                  <div className="relative z-10 mb-3 flex items-end gap-3">
                    <div
                      className="font-mono tracking-tight"
                      style={{
                        fontSize: '44px',
                        fontWeight: 300,
                        color: 'var(--invert-card-fg)',
                        lineHeight: 1,
                        textShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      }}
                    >
                      {s.value}
                    </div>
                  </div>

                  <div
                    className="relative z-10 flex items-center gap-2.5"
                    style={{
                      font: '400 13px/1.5 var(--font-ui)',
                      color: 'var(--invert-card-fg)',
                      opacity: 0.65,
                    }}
                  >
                    {isPositive && (
                      <Badge intent="success" crisp indicator={false} className="shadow-none">
                        + UP
                      </Badge>
                    )}
                    <span className="truncate">{noteText}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Queue + rail ─────────────────────────────────────────────────── */}
      <div className="md:mt-24 mb-6">
        <SectionHeading
          title="Command & Telemetry"
          note="The actionable queue, ordered by what it costs to ignore, alongside live platform vitals and recent audit logs."
          align="right"
        />
      </div>
      <div className="mb-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <YourQueue queue={model.queue} restingCount={model.restingCount} />

        <div className="sticky top-8 grid gap-6">
          {session ? (
            <Panel
              title="Session live"
              accent="live"
              variant="elevated"
              action={
                <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                  {new Date(session.expiresAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              }
            >
              <p className="t-compact" style={{ color: 'var(--text-primary)' }}>
                You are read-only inside <strong>{session.tenantName}</strong>.
              </p>
              <p className="t-caption mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                {session.reason}
              </p>
              <Link
                href="/platform/support-sessions"
                className="t-compact mt-3 flex h-[30px] w-full items-center justify-center rounded-panel transition-colors hover:bg-[var(--surface-inset)]"
                style={{
                  background: 'var(--surface-inset)',
                  color: 'var(--text-primary)',
                }}
              >
                Review sessions
              </Link>
            </Panel>
          ) : null}

          <PlatformTelemetry vitals={model.vitals} />

          <LastActions recent={model.recent} />
        </div>
      </div>

      {/*
        Everything below the queue. The queue is what needs DOING today; these
        three bands are what the operator checks around it — and each one is
        derived from the page it links to rather than restated, so the overview
        cannot disagree with the screen it summarises.
      */}
      <RevenueBand revenue={insights.revenue} />
      <PortfolioBand portfolio={insights.portfolio} />
      <OperationsBand operations={insights.operations} />
    </ConsolePage>
  );
}


