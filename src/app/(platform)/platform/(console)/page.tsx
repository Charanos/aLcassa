import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconArrowRight,
  IconBolt,
  IconBuildings,
  IconCircleCheck,
  IconClock,
  IconCoin,
  IconActivityHeartbeat,
  IconCreditCard,
  IconPlayerPause,
  IconPlus,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, FactRow, Panel, SectionHeading } from '@/components/console/Surface';
import { getOverview, greeting, type QueueItem, type QueueSeverity } from '@/lib/console/data';
import { resolveSupportSession } from '@/lib/console/session';

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
      <ConsoleHeader
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
            <Link
              href="/platform/tenants/new"
              className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
              style={{ background: 'var(--blue-500)', color: '#ffffff', fontWeight: 500 }}
            >
              <IconPlus size={15} stroke={1.5} aria-hidden />
              Provision workspace
            </Link>
          </>
        }
      />

      {/* ── The situation ────────────────────────────────────────────────
          The one inverted surface in the content area. It borrows the chrome
          tier deliberately: this band is the console TALKING, and giving it
          the same material as the header separates the platform's own voice
          from the tenant data in every panel below it. */}
      <section
        className="mt-6 overflow-hidden rounded-overlay"
        style={{
          background: 'var(--chrome-bg)',
          color: 'var(--chrome-fg)',
          boxShadow: 'var(--chrome-highlight), var(--shadow-md)',
        }}
      >
        <div className="flex flex-wrap items-stretch">
          <div className="min-w-0 flex-1 basis-[340px] px-6 pt-5 pb-6">
            <p className="t-eyebrow mb-3.5" style={{ color: 'var(--chrome-fg-faint)' }}>
              The situation
            </p>
            <p
              className="display"
              style={{
                fontSize: 'var(--display-sm)',
                lineHeight: 1.32,
                color: 'var(--chrome-fg)',
                maxWidth: '34ch',
                textWrap: 'pretty',
              }}
            >
              {model.headline.lead}
              {/* The single accent on this screen. It is the figure the whole
                  sentence is about, and 03 §4a's budget is spent here rather
                  than on a status chip. */}
              <em style={{ fontStyle: 'normal', color: 'var(--accent-mark)' }}>
                {model.headline.figure}
              </em>
              {model.headline.tail}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <Link
                href="/platform/revenue"
                className="t-compact inline-flex h-8 items-center gap-2 rounded-panel px-3.5 whitespace-nowrap"
                style={{
                  background: 'var(--chrome-action)',
                  /* chrome-action is pale blue on the navy band in light mode
                     and saturated blue on the pale band in dark, so the label
                     has to flip with it or it vanishes in one of the two. */
                  color: 'var(--chrome-bg)',
                  fontWeight: 500,
                }}
              >
                Open collection queue
                <IconArrowRight size={14} stroke={1.5} aria-hidden />
              </Link>
              <Link
                href="/platform/tenants"
                className="t-compact inline-flex h-8 items-center rounded-panel px-3.5 whitespace-nowrap transition-colors"
                style={{
                  border: '1px solid var(--chrome-rule-strong)',
                  color: 'var(--chrome-fg)',
                }}
              >
                All 47 workspaces
              </Link>
            </div>
          </div>

          <div
            className="grid min-w-0 flex-1 basis-[520px]"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}
          >
            {model.signals.map((s) => {
              const Icon = SIGNAL_ICON[s.icon] ?? IconBolt;
              return (
                <Link
                  key={s.id}
                  href={s.href}
                  className="block px-4 pt-5 pb-6 transition-colors"
                  style={{
                    borderLeft: '1px solid var(--chrome-rule)',
                    color: 'var(--chrome-fg)',
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <Icon
                      size={15}
                      stroke={1.5}
                      style={{ color: 'var(--chrome-fg-faint)' }}
                      aria-hidden
                    />
                    <span
                      className="whitespace-nowrap"
                      style={{
                        font: '400 11.5px/1.3 var(--font-ui)',
                        color: 'var(--chrome-fg-muted)',
                      }}
                    >
                      {s.label}
                    </span>
                  </span>
                  <span
                    className="numeric mt-3 block"
                    style={{ fontSize: 'var(--display-sm)', color: 'var(--chrome-fg)' }}
                  >
                    {s.value}
                  </span>
                  <span
                    className="mt-2 block"
                    style={{
                      font: '400 11.5px/1.45 var(--font-ui)',
                      color: 'var(--chrome-fg-faint)',
                      textWrap: 'pretty',
                    }}
                  >
                    {s.note}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Queue + rail ─────────────────────────────────────────────────── */}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <section>
          <SectionHeading title="Your queue" note="Ordered by what it costs to ignore" />

          <div className="grid gap-2.5">
            {model.queue.map((item) => (
              <QueueCard key={item.id} item={item} />
            ))}
          </div>

          {/* The denominator. See the header note. */}
          <div
            className="mt-3.5 flex items-center gap-3 rounded-overlay px-4 py-3"
            style={{
              border: '1px dashed var(--border-strong)',
              background: 'var(--surface-sunken)',
            }}
          >
            <IconCircleCheck
              size={17}
              stroke={1.5}
              className="shrink-0"
              style={{ color: 'var(--success-fg)' }}
              aria-hidden
            />
            <p className="t-compact flex-1" style={{ color: 'var(--text-secondary)' }}>
              The other <span className="numeric">{model.restingCount}</span> workspaces are inside
              every limit, paid up, and active in the last seven days.
            </p>
          </div>
        </section>

        <div className="grid gap-4">
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
            {model.recent.map((r, i) => (
              <div
                key={`${r.time}-${r.action}`}
                className="grid gap-0.5 px-4 py-2.5"
                style={{
                  borderBottom:
                    i === model.recent.length - 1 ? undefined : '1px solid var(--border-subtle)',
                }}
              >
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
                    className="min-w-0 flex-1"
                    style={{
                      font: '400 12px/1.45 var(--font-mono)',
                      color: 'var(--text-primary)',
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
            ))}
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
      className="overflow-hidden rounded-overlay"
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-raised)',
        boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
      }}
    >
      <div className="flex items-stretch">
        {/* A 3px rail rather than a tinted card. 03 §20 forbids colouring a
            whole panel to signal state, and with four of these stacked the
            rail is also what lets severity be read down the left edge without
            reading a word. */}
        <span aria-hidden className="w-[3px] shrink-0" style={{ background: s.rail }} />

        <div className="min-w-0 flex-1 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span
              className="grid size-[26px] shrink-0 place-items-center rounded-panel"
              style={{ background: s.chipBg, color: s.chipInk }}
              aria-hidden
            >
              <Icon size={14} stroke={1.5} />
            </span>
            <Link
              href={`/platform/tenants/${item.slug}`}
              className="min-w-0 flex-1 truncate transition-colors"
              style={{
                font: '500 var(--text-base)/1.35 var(--font-ui)',
                color: 'var(--text-primary)',
              }}
            >
              {item.name}
            </Link>
            {/* The tag repeats the rail's meaning in words. 03 §9: colour is
                never the sole carrier. */}
            <span
              className="inline-flex h-[22px] shrink-0 items-center rounded-full px-2.5 whitespace-nowrap"
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
            className="t-compact mt-2.5 ml-9"
            style={{ color: 'var(--text-secondary)', maxWidth: '74ch', textWrap: 'pretty' }}
          >
            {item.detail}
          </p>

          <div className="mt-3.5 ml-9 flex flex-wrap items-center gap-2.5">
            <Link
              href={item.primaryHref}
              className="t-compact inline-flex h-[30px] items-center rounded-panel px-3.5 whitespace-nowrap transition-colors"
              style={{ background: 'var(--blue-500)', color: '#ffffff', fontWeight: 500 }}
            >
              {item.primaryLabel}
            </Link>
            <Link
              href={`/platform/tenants/${item.slug}`}
              className="t-compact inline-flex h-[30px] items-center rounded-panel px-3.5 whitespace-nowrap transition-colors"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }}
            >
              Open workspace
            </Link>
            <span className="flex-1" />
            <span
              className="whitespace-nowrap"
              style={{ font: '400 11.5px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
            >
              {item.meta}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
