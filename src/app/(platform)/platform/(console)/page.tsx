import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconArrowRight,
  IconBolt,
  IconBuildings,
  IconCircleCheck,
  IconClock,
  IconCoin,
  IconCreditCard,
  IconActivityHeartbeat,
  IconPlayerPause,
  IconDashboard,
  IconChartPie,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, FactRow, Panel, SectionHeading } from '@/components/console/Surface';
import { getOverview, greeting, type QueueItem, type QueueSeverity } from '@/lib/console/data';
import { resolveSupportSession } from '@/lib/console/session';
import { OverviewChart } from '@/components/console/OverviewChart';
import { ProvisionWorkspaceButton } from '@/components/console/ProvisionWorkspaceButton';

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

const SEVERITY: Record<
  QueueSeverity,
  { rail: string; chipBg: string; chipInk: string; tagBg: string; tagInk: string; icon: TablerIcon }
> = {
  danger: {
    rail: 'var(--danger-fg)',
    chipBg: 'var(--danger-bg)',
    chipInk: 'var(--danger-fg)',
    tagBg: 'var(--danger-bg)',
    tagInk: 'var(--danger-fg)',
    icon: IconCreditCard,
  },
  warning: {
    rail: 'var(--warning-fg)',
    chipBg: 'var(--warning-bg)',
    chipInk: 'var(--warning-fg)',
    tagBg: 'var(--warning-bg)',
    tagInk: 'var(--warning-fg)',
    icon: IconActivityHeartbeat,
  },
  info: {
    rail: 'var(--blue-400)',
    chipBg: 'var(--blue-50)',
    chipInk: 'var(--blue-500)',
    tagBg: 'var(--surface-inset)',
    tagInk: 'var(--text-secondary)',
    icon: IconClock,
  },
  /* Inert, not red. A suspended workspace has already failed — colouring it
     as an alarm competes with the two items that can still be saved. 03 §3
     gives this state to the neutral scale for exactly that reason. */
  inert: {
    rail: 'var(--ink-400)',
    chipBg: 'var(--surface-inset)',
    chipInk: 'var(--text-tertiary)',
    tagBg: 'var(--surface-inset)',
    tagInk: 'var(--text-tertiary)',
    icon: IconPlayerPause,
  },
};

const SIGNAL_ICON: Record<string, TablerIcon> = {
  coin: IconCoin,
  pulse: IconActivityHeartbeat,
  building: IconBuildings,
  bolt: IconBolt,
};

export default async function ConsoleOverviewPage() {
  const [model, session] = await Promise.all([getOverview(), resolveSupportSession()]);

  return (
    <ConsolePage>
      {/* Iconography watermarks safely contained */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-10 -right-8 hidden rotate-12 lg:block" style={{ color: 'var(--watermark-tint)' }}>
          <IconDashboard size={360} stroke={1} />
        </div>
        <div className="absolute top-[45%] -left-12 hidden -rotate-[10deg] lg:block" style={{ color: 'var(--watermark-tint)' }}>
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
        className="mt-6 overflow-hidden rounded-2xl transition-all duration-300 shadow-2xl relative"
        style={{
          border: '1px solid var(--invert-card-border)',
          background: 'var(--invert-card-bg)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
        }}
      >
        <div className="flex flex-col lg:flex-row relative z-10">
          {/* Left Column: The Situation Briefing */}
          <div className="flex-1 p-8 lg:p-10 flex flex-col justify-between relative overflow-hidden" style={{ borderRight: '1px solid var(--invert-card-rule)' }}>
            {/* Background Architectural Artwork - elegant tenant telemetry & topology motif */}
            <div 
              className="absolute -right-16 -bottom-20 pointer-events-none select-none z-0 opacity-[0.12] dark:opacity-[0.08] text-[var(--invert-card-fg)] transform rotate-12 transition-all duration-700"
              aria-hidden="true"
            >
              <svg width="480" height="400" viewBox="0 0 480 400" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Orbital radar rings */}
                <circle cx="320" cy="240" r="220" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" opacity="0.3" />
                <circle cx="320" cy="240" r="160" stroke="currentColor" strokeWidth="1.2" opacity="0.4" />
                <circle cx="320" cy="240" r="100" stroke="currentColor" strokeWidth="1" strokeDasharray="3 6" opacity="0.6" />
                <circle cx="320" cy="240" r="40" stroke="currentColor" strokeWidth="1.5" opacity="0.8" />
                <circle cx="320" cy="240" r="12" fill="currentColor" opacity="0.9" />
                
                {/* Data streaming waves / paths */}
                <path d="M 100 200 Q 210 150 320 240 T 460 180" stroke="currentColor" strokeWidth="1.5" opacity="0.5" fill="none" />
                <path d="M 140 280 Q 250 320 320 240 T 420 100" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" fill="none" />
                
                {/* Constellation & Tenancy Network Interconnects */}
                <path d="M 140 200 L 230 160 L 320 240 L 410 190 L 360 330 L 220 310 Z" stroke="currentColor" strokeWidth="1.25" opacity="0.5" />
                <path d="M 230 160 L 320 90 L 410 190" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" opacity="0.4" />
                <path d="M 140 200 L 220 310" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 3" opacity="0.3" />
                
                {/* Node anchors */}
                <circle cx="140" cy="200" r="6" fill="currentColor" opacity="0.75" />
                <circle cx="230" cy="160" r="8" fill="currentColor" opacity="0.9" />
                <circle cx="320" cy="90" r="5" fill="currentColor" opacity="0.6" />
                <circle cx="410" cy="190" r="7" fill="currentColor" opacity="0.8" />
                <circle cx="360" cy="330" r="7.5" fill="currentColor" opacity="0.85" />
                <circle cx="220" cy="310" r="5.5" fill="currentColor" opacity="0.7" />
                
                {/* Micro-nodes */}
                <circle cx="275" cy="200" r="3" fill="currentColor" opacity="0.5" />
                <circle cx="365" cy="215" r="3.5" fill="currentColor" opacity="0.6" />
                <circle cx="280" cy="285" r="3" fill="currentColor" opacity="0.5" />
                
                {/* Radial crosshair lines */}
                <line x1="320" y1="0" x2="320" y2="400" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 6" opacity="0.25" />
                <line x1="0" y1="240" x2="480" y2="240" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 6" opacity="0.25" />
              </svg>
            </div>

            <div className="relative z-10">
              {/* t-eyebrow is the mono uppercase class from tokens.css */}
              <p className="t-eyebrow mb-3" style={{ color: 'var(--invert-card-fg)', opacity: 0.6, letterSpacing: 'var(--t-eyebrow-tracking)' }}>
                THE SITUATION
              </p>
              {/* display display-md = 32-40px Libertinus serif — editorial commanding weight */}
              <p
                className="display display-md leading-[1.18]"
                style={{
                  color: 'var(--invert-card-fg)',
                  maxWidth: '36ch',
                  textWrap: 'pretty',
                }}
              >
                {model.headline.lead}
                <em style={{ fontStyle: 'normal', color: 'var(--accent-mark)' }}>
                  {model.headline.figure}
                </em>
                {model.headline.tail}
              </p>
            </div>
            
            <div className="mt-8 flex flex-wrap items-center gap-3 relative z-10">
              <Link
                href="/platform/revenue"
                className="t-compact inline-flex h-8.5 cursor-pointer items-center gap-2 rounded-lg px-3.5 whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                style={{
                  background: 'var(--invert-card-fg)',
                  color: 'var(--invert-card-bg)',
                  fontWeight: 500,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              >
                Open collection queue
                <IconArrowRight size={14} stroke={2} aria-hidden />
              </Link>
              <Link
                href="/platform/tenants"
                className="t-compact inline-flex h-8.5 cursor-pointer items-center rounded-lg px-3.5 whitespace-nowrap transition-colors hover:bg-white/[0.08]"
                style={{
                  border: '1px solid var(--invert-card-rule)',
                  color: 'var(--invert-card-fg)',
                  background: 'var(--invert-card-well)'
                }}
              >
                All 47 workspaces
              </Link>
            </div>
          </div>

          {/* Right Column: Recharts Data Viz */}
          <div className="flex-1 relative min-h-[260px] lg:min-h-[280px]">
            <OverviewChart />
          </div>
        </div>

        {/* Bottom Bar: Signals */}
        <div 
          className="flex flex-wrap items-center border-t border-[var(--invert-card-rule)] bg-[var(--invert-card-well)] relative z-10"
        >
          {model.signals.map((s, idx) => {
            const Icon = SIGNAL_ICON[s.icon] ?? IconBolt;
            return (
              <Link
                key={s.id}
                href={s.href}
                className="group flex-1 min-w-[160px] p-4 lg:p-5 transition-colors cursor-pointer hover:bg-white/[0.04]"
                style={{
                  borderRight: idx < model.signals.length - 1 ? '1px solid var(--invert-card-rule)' : 'none'
                }}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon
                    size={14}
                    stroke={1.5}
                    style={{ color: 'var(--invert-card-fg)', opacity: 0.5 }}
                    aria-hidden
                  />
                  {/* t-eyebrow: mono, uppercase, 11px, weight-medium */}
                  <span
                    className="t-eyebrow whitespace-nowrap"
                    style={{ color: 'var(--invert-card-subtle)', letterSpacing: 'var(--t-eyebrow-tracking)' }}
                  >
                    {s.label}
                  </span>
                </div>
                {/* numeric: mono tabular figures for alignment */}
                <div
                  className="numeric"
                  style={{ fontSize: 'var(--text-xl)', color: 'var(--invert-card-fg)', lineHeight: 1.2 }}
                >
                  {s.value}
                </div>
                {/* t-caption: 12.5px sans for supporting detail */}
                <div className="t-caption mt-1" style={{ color: 'var(--invert-card-subtle)' }}>
                  {s.note}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Queue + rail ─────────────────────────────────────────────────── */}
      <div className="mb-8 md:mt-24 grid items-start gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
        <section>
          <SectionHeading title="Your queue" note="Ordered by what it costs to ignore" />

          <div className="grid gap-3">
            {model.queue.map((item) => (
              <QueueCard key={item.id} item={item} />
            ))}
          </div>

          {/* The denominator. See the header note. */}
          <div
            className="mt-6 flex items-center gap-3.5 rounded-2xl px-5 py-4 relative overflow-hidden group"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-sunken)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
            }}
          >
            {/* Ambient success glow */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-24 pointer-events-none opacity-20 dark:opacity-10 transition-opacity duration-500 group-hover:opacity-30"
              style={{
                background: 'linear-gradient(90deg, var(--success-bg) 0%, transparent 100%)'
              }}
            />
            <div className="relative flex items-center justify-center shrink-0">
              {/* Outer pulsing ring */}
              <div 
                className="absolute inset-0 rounded-full animate-ping opacity-20"
                style={{ background: 'var(--success-fg)' }}
              />
              <IconCircleCheck
                size={20}
                stroke={1.5}
                className="relative z-10"
                style={{ color: 'var(--success-fg)' }}
                aria-hidden
              />
            </div>
            <p className="t-compact flex-1 relative z-10" style={{ color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>
              The other <span className="numeric font-medium" style={{ color: 'var(--text-primary)' }}>{model.restingCount}</span> workspaces are inside
              every limit, paid up, and active in the last seven days.
            </p>
          </div>
        </section>

        <div className="grid gap-6">
          {session ? (
            <Panel
              title="Session live"
              accent="live"
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
                className="t-compact mt-3 flex h-[30px] w-full items-center justify-center rounded-panel transition-colors"
                style={{
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                }}
              >
                Review sessions
              </Link>
            </Panel>
          ) : null}

          <Panel
            title="Platform"
            action={
              <Link href="/platform/health" className="t-caption" style={{ color: 'var(--text-action)' }}>
                Health
              </Link>
            }
          >
            {model.vitals.map((v, i) => (
              <FactRow
                key={v.label}
                label={v.label}
                value={v.value}
                dot={v.state}
                tone={v.state === 'warn' ? 'warn' : 'default'}
                last={i === model.vitals.length - 1}
              />
            ))}
            <p className="t-caption mt-3" style={{ color: 'var(--text-tertiary)' }}>
              No incident in 9 days. Billing reconcile is the only queue with depth.
            </p>
          </Panel>

          <Panel
            title="Last actions"
            flush
            action={
              <Link href="/platform/audit" className="t-caption" style={{ color: 'var(--text-action)' }}>
                Audit log
              </Link>
            }
          >
            <div className="py-2">
              {model.recent.map((r, i) => {
                const isLast = i === model.recent.length - 1;
                return (
                  <div
                    key={`${r.time}-${r.action}`}
                    className="relative flex gap-3 px-4 py-2 group"
                  >
                    {/* Timeline Axis */}
                    <div className="relative flex flex-col items-center mt-1.5 shrink-0">
                      {/* Node Dot */}
                      <div 
                        className="w-[7px] h-[7px] rounded-full z-10 transition-colors duration-300 group-hover:bg-[var(--blue-400)]"
                        style={{ 
                          background: 'var(--border-strong)',
                          boxShadow: '0 0 0 2px var(--surface-raised)'
                        }}
                      />
                      {/* Connecting Line */}
                      {!isLast && (
                        <div 
                          className="absolute top-[7px] bottom-[-24px] w-px"
                          style={{ background: 'var(--border-subtle)' }}
                        />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="grid gap-0.5 pb-2">
                      <span className="flex items-baseline gap-2">
                        <span
                          className="shrink-0"
                          style={{ font: '400 11px/1.5 var(--font-mono)', color: 'var(--text-tertiary)' }}
                        >
                          {r.time}
                        </span>
                        {/* The operation name in mono, verbatim. An operator who
                            needs to find this again will search the audit log for
                            this exact string. */}
                        <span
                          className="min-w-0 flex-1 transition-colors duration-200 group-hover:text-[var(--text-primary)]"
                          style={{
                            font: '400 12px/1.45 var(--font-mono)',
                            color: 'var(--text-secondary)',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {r.action}
                        </span>
                      </span>
                      <span
                        className="t-caption"
                        style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
                      >
                        {r.target}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </ConsolePage>
  );
}

function QueueCard({ item }: { item: QueueItem }) {
  const s = SEVERITY[item.severity];
  const Icon = s.icon;

  return (
    <article
      className="group relative overflow-hidden rounded-2xl transition-all duration-400 hover:-translate-y-[2px]"
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-raised)',
        // Soft subtle neumorphism: soft drop shadow + inner light/dark rim
        boxShadow: '4px 6px 20px rgba(0, 0, 0, 0.04), inset 1px 1px 0px rgba(255, 255, 255, 0.05), inset -1px -1px 0px rgba(0, 0, 0, 0.02)',
      }}
    >
      {/* Subtle hover gradient wash based on severity rail color */}
      <div 
        className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${s.rail}, transparent 70%)`
        }}
      />

      <div className="flex flex-col min-w-0 flex-1 p-5 md:p-6 relative z-10">
        <div className="flex items-center gap-3">
          <span
            className="grid size-[34px] shrink-0 place-items-center rounded-xl"
            style={{ 
              background: s.chipBg, 
              color: s.chipInk,
              boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.1), 0 2px 4px rgba(0,0,0,0.05)'
            }}
            aria-hidden
          >
            <Icon size={16} stroke={1.75} />
          </span>
          <Link
            href={`/platform/tenants/${item.slug}`}
            className="min-w-0 flex-1 truncate transition-colors hover:text-[var(--text-action)]"
            style={{
              font: '500 16px/1.35 var(--font-ui)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em'
            }}
          >
            {item.name}
          </Link>
          
          <span
            className="inline-flex h-6 shrink-0 items-center rounded-full px-3 whitespace-nowrap"
            style={{
              background: s.tagBg,
              color: s.tagInk,
              font: '500 11px/1 var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            {item.tag}
          </span>
        </div>

        <p
          className="mt-4 text-[14px] leading-relaxed opacity-90"
          style={{ color: 'var(--text-secondary)', maxWidth: '74ch', textWrap: 'pretty' }}
        >
          {item.detail}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={item.primaryHref}
            className="t-compact inline-flex h-8.5 cursor-pointer items-center justify-center rounded-lg px-4.5 whitespace-nowrap transition-all duration-300 hover:-translate-y-0.5"
            style={{ 
              background: 'var(--blue-500)', 
              color: '#ffffff', 
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25), inset 0 1px 1px rgba(255,255,255,0.2)'
            }}
          >
            {item.primaryLabel}
          </Link>
          <Link
            href={`/platform/tenants/${item.slug}`}
            className="t-compact inline-flex h-8.5 cursor-pointer items-center rounded-lg px-4 whitespace-nowrap transition-colors hover:bg-[var(--surface-inset)]"
            style={{
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}
          >
            Open workspace
          </Link>
          <span className="flex-1" />
          <span
            className="whitespace-nowrap opacity-60"
            style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
          >
            {item.meta}
          </span>
        </div>
      </div>
    </article>
  );
}
