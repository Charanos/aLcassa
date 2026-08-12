import type { Metadata } from 'next';
import {
  IconBrandWhatsapp,
  IconDatabase,
  IconRobot,
  IconServer2,
  IconShieldCheck,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, Panel } from '@/components/console/Surface';
import { LatencyChart, ThroughputChart } from '@/components/console/Charts';
import { getHealth, type DayState, type Incident, type Service } from '@/lib/console/data';

export const metadata: Metadata = { title: 'Health' };

/**
 * Platform health. `Health.dc.html`.
 *
 * ⚠ THE 30-DAY STRIP IS THE MOST INFORMATIVE ELEMENT ON THE PAGE, and it is
 * 30 coloured rectangles.
 *
 * A single uptime percentage cannot distinguish "99.82% because of one bad
 * afternoon" from "99.82% because it wobbles every third day" — and those are
 * completely different engineering problems. The strip shows the SHAPE of the
 * failures, which is the thing a percentage averages away. It is also why the
 * strip sits beside the number rather than replacing it: the figure is what
 * goes in a report, the strip is what tells you whether to worry.
 */

const SERVICE_ICON: Record<Service['icon'], TablerIcon> = {
  api: IconServer2,
  db: IconDatabase,
  bot: IconRobot,
  channel: IconBrandWhatsapp,
};

const DAY_INK: Record<DayState, string> = {
  ok: 'var(--success-fg)',
  degraded: 'var(--warning-fg)',
  down: 'var(--danger-fg)',
};

const SEV_INK: Record<Incident['sev'], { bg: string; ink: string }> = {
  SEV1: { bg: 'var(--danger-bg)', ink: 'var(--danger-fg)' },
  SEV2: { bg: 'var(--warning-bg)', ink: 'var(--warning-fg)' },
  SEV3: { bg: 'var(--surface-inset)', ink: 'var(--text-secondary)' },
};

export default async function HealthPage() {
  const m = await getHealth();
  const allOk = m.services.every((s) => s.days.every((d) => d === 'ok'));
  // Degraded is amber, never red — red is reserved for a failure of
  // correctness (the isolation suite), not a performance wobble.
  const pillInk = allOk
    ? 'var(--success-fg)'
    : m.diagnosis.severity === 'incident'
      ? 'var(--danger-fg)'
      : 'var(--warning-fg)';
  const pillBg = allOk
    ? 'var(--success-bg)'
    : m.diagnosis.severity === 'incident'
      ? 'var(--danger-bg)'
      : 'var(--warning-bg)';

  return (
    <ConsolePage>
      <div
        className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:gap-6"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="min-w-0 flex-1">
          <ConsoleHeader eyebrow="/platform/health" title="Health" />
        </div>
        {/*
          The banner reflects the CURRENT state, derived from the same data the
          strips render. A status pill hardcoded to "operational" is worse than
          no pill: it is the first thing an operator checks and the first thing
          they stop trusting.
        */}
        <span
          className="inline-flex h-8 shrink-0 items-center gap-2 rounded-full px-3.5"
          style={{ border: `1px solid ${pillInk}`, background: pillBg }}
        >
          <span
            aria-hidden
            className="size-[7px] shrink-0 rounded-full"
            style={{ background: pillInk, animation: 'pulse-dot 2.4s ease-in-out infinite' }}
          />
          <span
            className="whitespace-nowrap"
            style={{ font: '500 var(--text-sm)/1 var(--font-ui)', color: pillInk }}
          >
            {allOk ? 'All systems operational' : 'Degraded in the last 30 days'}
          </span>
        </span>
      </div>

      {/* Sheet 11: the leading diagnosis, before any row. Severity is known
          before the reader has to derive it from the grid beneath it. */}
      <p className="t-body mt-4" style={{ color: 'var(--text-secondary)', maxWidth: '82ch' }}>
        {m.diagnosis.sentence}
      </p>

      {/* ── Services ─────────────────────────────────────────────────── */}
      <div
        className="mt-5 grid gap-3.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}
      >
        {m.services.map((s) => {
          const Icon = SERVICE_ICON[s.icon];
          const worst: DayState = s.days.includes('down')
            ? 'down'
            : s.days.includes('degraded')
              ? 'degraded'
              : 'ok';
          return (
            <div
              key={s.name}
              className="min-w-0 rounded-overlay p-4"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-panel"
                  style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}
                  aria-hidden
                >
                  <Icon size={15} stroke={1.5} />
                </span>
                <span
                  className="t-compact flex-1 truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {s.name}
                </span>
                <span
                  aria-hidden
                  className="size-[7px] shrink-0 rounded-full"
                  style={{ background: DAY_INK[worst] }}
                />
              </div>

              <p
                className="numeric mt-3"
                style={{ fontSize: 'var(--display-sm)', color: 'var(--text-primary)' }}
              >
                {s.metric}
              </p>
              <p className="t-caption mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
                {s.note} · <span style={{ color: 'var(--text-secondary)' }}>{s.budget}</span>
              </p>

              {/* The strip. `title` on each bar gives a pointer user the date;
                  the aggregate is announced once to a screen reader rather
                  than 30 times, which is the difference between a summary and
                  an unusable wall of output. */}
              <div
                className="mt-3 flex gap-0.5"
                role="img"
                aria-label={`${s.name}: ${s.uptime} uptime over the last 30 days`}
              >
                {s.days.map((d, i) => (
                  <span
                    key={i}
                    title={`${30 - i} days ago · ${d === 'ok' ? 'Operational' : d === 'degraded' ? 'Degraded' : 'Down'}`}
                    className="h-[18px] flex-1 rounded-[1px]"
                    style={{ background: DAY_INK[d] }}
                  />
                ))}
              </div>
              <p
                className="mt-2"
                style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
              >
                30 days · {s.uptime}
              </p>
            </div>
          );
        })}
      </div>

      {/* Sheet 11: "the severe risk in the brief is a policy gap; its status
          belongs beside uptime, not buried in CI." Row Level Security is the
          only isolation mechanism between tenants in this system — its
          status sits here, at the top of the page an operator actually
          checks, not in a CI log nobody reads unless something already broke. */}
      <div className="mt-3.5">
        <Panel title="Cross-tenant isolation suite">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <div>
              <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                Tables policed
              </p>
              <p className="numeric mt-1.5 flex items-baseline gap-1.5">
                <span style={{ fontSize: 'var(--display-sm)', color: 'var(--text-primary)' }}>
                  {m.isolation.tablesPoliced}
                </span>
                <span style={{ font: '400 13px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>
                  / {m.isolation.tablesTotal}
                </span>
                {m.isolation.tablesPoliced === m.isolation.tablesTotal ? (
                  <IconShieldCheck size={16} stroke={1.5} style={{ color: 'var(--success-fg)' }} aria-hidden />
                ) : null}
              </p>
            </div>
            <div>
              <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                Cross-tenant attempts · 30d
              </p>
              <p className="numeric mt-1.5" style={{ fontSize: 'var(--display-sm)', color: 'var(--text-primary)' }}>
                {m.isolation.crossTenantAttempts30d}
              </p>
            </div>
            <div>
              <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                Refused
              </p>
              <p
                className="numeric mt-1.5"
                style={{
                  fontSize: 'var(--display-sm)',
                  color:
                    m.isolation.crossTenantRefused30d === m.isolation.crossTenantAttempts30d
                      ? 'var(--success-fg)'
                      : 'var(--danger-fg)',
                }}
              >
                {m.isolation.crossTenantRefused30d}
                <span style={{ font: '400 13px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>
                  {' '}
                  / {m.isolation.crossTenantAttempts30d}
                </span>
              </p>
            </div>
            <div>
              <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                Last run
              </p>
              <p style={{ font: '400 var(--text-sm)/1.4 var(--font-mono)', color: 'var(--text-primary)', marginTop: 6 }}>
                {m.isolation.lastRun}
              </p>
            </div>
          </div>
          <p className="t-compact mt-4 border-t pt-3.5" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
            Every table carrying a tenant_id is policed by an RLS policy that scopes it to the
            caller&rsquo;s own tenant. This suite runs against the real schema and asserts that a
            cross-tenant read returns zero rows rather than a permission error — the same
            not-403 rule the API itself follows, so a probe result and a live API response can
            never disagree about what &ldquo;not visible&rdquo; means.
          </p>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel
          title="Response latency · 24 hours"
          action={
            <span className="flex items-center gap-3.5">
              <Legend swatch="var(--blue-200)">p50</Legend>
              <Legend swatch="var(--blue-500)">p95</Legend>
              <Legend swatch="var(--ink-300)">p99</Legend>
            </span>
          }
        >
          <LatencyChart data={m.latency} />
        </Panel>
      </div>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Throughput and errors · today"
          action={
            <span
              className="whitespace-nowrap"
              style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--danger-fg)' }}
            >
              spike at 17:00
            </span>
          }
        >
          <ThroughputChart data={m.throughput} />
          <p className="t-caption mt-3" style={{ color: 'var(--text-tertiary)' }}>
            <span className="numeric" style={{ color: 'var(--text-secondary)' }}>
              {m.refusals.count24h}
            </span>{' '}
            refusals in the last 24 hours are excluded from the error rate above.{' '}
            {m.refusals.note}
          </p>
        </Panel>

        <Panel title="Background queues">
          {m.queues.map((q, i) => {
            const tone =
              q.depth > 50
                ? { bg: 'var(--warning-bg)', ink: 'var(--warning-fg)' }
                : q.depth > 0
                  ? { bg: 'var(--surface-inset)', ink: 'var(--text-secondary)' }
                  : { bg: 'var(--success-bg)', ink: 'var(--success-fg)' };
            return (
              <div
                key={q.name}
                className="flex items-center gap-3 py-2.5"
                style={{
                  borderBottom:
                    i === m.queues.length - 1 ? undefined : '1px solid var(--border-subtle)',
                }}
              >
                <span
                  className="min-w-0 flex-1 truncate"
                  style={{
                    font: '400 var(--text-sm)/1.3 var(--font-mono)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {q.name}
                </span>
                <span className="t-caption whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
                  {q.rate}
                </span>
                <span
                  className="numeric grid h-[22px] min-w-[34px] place-items-center rounded-full px-2"
                  style={{ background: tone.bg, color: tone.ink, fontSize: 11.5 }}
                >
                  {q.depth}
                </span>
              </div>
            );
          })}
          <p className="t-compact mt-3" style={{ color: 'var(--text-tertiary)' }}>
            Depth is jobs <em>waiting</em>, not jobs failed. A queue above 50 for more than five
            minutes pages the on-call engineer.
          </p>
        </Panel>
      </div>

      <div className="mt-5">
        <Panel title="Recent incidents" flush>
          {m.incidents.map((inc, i) => {
            const sev = SEV_INK[inc.sev];
            return (
              <div
                key={inc.id}
                className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start"
                style={{
                  borderBottom:
                    i === m.incidents.length - 1 ? undefined : '1px solid var(--border-subtle)',
                }}
              >
                <span
                  className="grid h-[26px] shrink-0 place-items-center self-start rounded-panel px-2"
                  style={{
                    background: sev.bg,
                    color: sev.ink,
                    font: '500 10px/1 var(--font-mono)',
                    letterSpacing: '0.04em',
                  }}
                >
                  {inc.sev}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="t-compact block" style={{ color: 'var(--text-primary)' }}>
                    {inc.title}
                  </span>
                  <span className="t-caption mt-1 block" style={{ color: 'var(--text-secondary)' }}>
                    {inc.detail}
                  </span>
                </span>
                <span className="shrink-0 sm:text-right">
                  <span
                    className="block whitespace-nowrap"
                    style={{
                      font: '400 11.5px/1.4 var(--font-mono)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {inc.when}
                  </span>
                  <span
                    className="mt-0.5 block whitespace-nowrap"
                    style={{ font: '400 11.5px/1.4 var(--font-mono)', color: 'var(--success-fg)' }}
                  >
                    {inc.status}
                  </span>
                </span>
              </div>
            );
          })}
        </Panel>
      </div>
    </ConsolePage>
  );
}

function Legend({ swatch, children }: { swatch: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{ font: '400 12px/1 var(--font-ui)', color: 'var(--text-secondary)' }}
    >
      <span aria-hidden style={{ width: 10, height: 2, background: swatch }} />
      {children}
    </span>
  );
}
