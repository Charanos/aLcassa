import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconArrowDown,
  IconArrowUp,
  IconClock,
  IconCoin,
  IconDownload,
  IconTrendingDown,
  IconTrendingUp,
  IconUsers,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, Panel } from '@/components/console/Surface';
import { AgeingChart, MrrChart, PlanMixChart } from '@/components/console/Charts';
import { getRevenue, type Kpi } from '@/lib/console/data';

export const metadata: Metadata = { title: 'Revenue' };

/**
 * Revenue. `Revenue.dc.html`.
 *
 * ⚠ THE SCREEN ENDS IN A QUEUE, NOT IN A CHART.
 *
 * Three charts sit above the fold and none of them is the point. The last
 * panel — five workspaces sorted by days late — is the only thing on this page
 * an operator can act on, and the design puts it last precisely because the
 * charts are context for it rather than the other way round. A revenue screen
 * that ends in a graph tells you how you are doing; one that ends in a list of
 * names tells you who to call.
 *
 * ⚠ IT REPORTS, IT DOES NOT CHARGE. Gateway integration is out of Phase 1
 * scope, so "Retry" hands the invoice to the finance operator with the failure
 * reason attached rather than moving money. That is stated on the surface
 * rather than left for someone to discover by pressing it.
 */

const KPI_ICON: Record<Kpi['icon'], TablerIcon> = {
  coin: IconCoin,
  trend: IconTrendingUp,
  users: IconUsers,
  down: IconTrendingDown,
  clock: IconClock,
};

export default async function RevenuePage() {
  const m = await getRevenue();

  return (
    <ConsolePage>
      <div
        className="flex flex-col gap-5 border-b pb-5 lg:flex-row lg:items-end"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="min-w-0 flex-1">
          <ConsoleHeader eyebrow="/platform/revenue" title="Revenue" />
          <p
            className="t-body mt-2"
            style={{ color: 'var(--text-secondary)', maxWidth: '66ch' }}
          >
            What the platform earns, what it is owed, and which workspaces are worth calling this
            week.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap"
            style={{
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
            }}
          >
            <IconDownload size={15} stroke={1.5} aria-hidden />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── KPI row ──────────────────────────────────────────────────── */}
      <div
        className="mt-5 grid gap-3.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}
      >
        {m.kpis.map((k) => {
          const Icon = KPI_ICON[k.icon];
          const Arrow = k.direction === 'up' ? IconArrowUp : IconArrowDown;
          /*
            The arrow points where the number moved; the COLOUR says whether
            that was good. Churn falling and revenue falling are both down
            arrows and mean opposite things, which is why the read model
            carries `direction` and `good` as separate fields.
          */
          const deltaInk = k.good ? 'var(--success-fg)' : 'var(--danger-fg)';
          return (
            <div
              key={k.label}
              className="min-w-0 rounded-overlay p-4"
              style={{
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="grid size-[22px] shrink-0 place-items-center rounded-chip"
                  style={{ background: 'var(--surface-sunken)', color: 'var(--text-tertiary)' }}
                  aria-hidden
                >
                  <Icon size={14} stroke={1.5} />
                </span>
                <span className="t-compact truncate" style={{ color: 'var(--text-secondary)' }}>
                  {k.label}
                </span>
              </div>
              <p
                className="numeric mt-3"
                style={{
                  fontSize: 'var(--display-sm)',
                  color: k.tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)',
                }}
              >
                {k.value}
              </p>
              <div className="mt-2 flex items-center gap-1.5">
                <span
                  className="numeric inline-flex items-center gap-0.5"
                  style={{ fontSize: 11, color: deltaInk }}
                >
                  <Arrow size={11} stroke={2} aria-hidden />
                  {k.delta}
                </span>
                <span className="t-caption truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {k.note}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── MRR + plan mix ───────────────────────────────────────────── */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Monthly recurring revenue"
          action={
            <span className="flex items-center gap-3.5">
              <Legend swatch="var(--blue-500)" shape="line">
                MRR
              </Legend>
              <Legend swatch="var(--success-fg)">Net new</Legend>
            </span>
          }
        >
          <MrrChart data={m.mrr} />
        </Panel>

        <Panel title="Revenue by plan" flush>
          <div className="px-4 pt-3.5">
            <PlanMixChart data={m.planMix.map((p) => ({ name: p.name, value: p.value }))} />
          </div>
          <div className="px-4 pb-4">
            {m.planMix.map((p, i) => (
              <div
                key={p.name}
                className="flex items-center gap-2.5 py-2.5"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-chip"
                  style={{
                    background: ['var(--blue-500)', 'var(--blue-400)', 'var(--ink-300)'][i],
                  }}
                />
                <span className="t-compact flex-1" style={{ color: 'var(--text-primary)' }}>
                  {p.name}
                </span>
                <span
                  className="whitespace-nowrap"
                  style={{ font: '400 11.5px/1.3 var(--font-mono)', color: 'var(--text-tertiary)' }}
                >
                  {p.tenants}
                </span>
                <span
                  className="numeric min-w-[74px] text-right whitespace-nowrap"
                  style={{ fontSize: 'var(--text-sm)' }}
                >
                  {p.display}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── Ageing + collection queue ────────────────────────────────── */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1fr_1.5fr]">
        <Panel
          title="Invoice ageing"
          action={
            <span
              className="numeric whitespace-nowrap"
              style={{ fontSize: 'var(--text-sm)', color: 'var(--danger-fg)' }}
            >
              {m.outstanding} outstanding
            </span>
          }
        >
          <AgeingChart data={m.ageing} />
        </Panel>

        <Panel
          title="Collection queue"
          flush
          action={
            <span className="t-caption whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
              Sorted by days late
            </span>
          }
        >
          {/* Desktop table */}
          <div className="hidden sm:block">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: '34%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'var(--surface-sunken)' }}>
                  {['Workspace', 'Invoice', 'Amount', 'Late', 'Attempts'].map((h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className="h-9"
                      style={{
                        padding: i === 0 ? '0 16px' : i === 4 ? '0 16px' : '0 8px',
                        textAlign: i >= 2 ? 'right' : 'left',
                        borderBottom: '1px solid var(--border-subtle)',
                        font: '500 11px/1 var(--font-ui)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.collections.map((c) => (
                  <tr
                    key={c.id}
                    className="transition-colors hover:bg-[var(--surface-sunken)]"
                    style={{ height: 44, borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <td className="overflow-hidden" style={{ padding: '0 16px' }}>
                      <Link
                        href={`/platform/tenants/${c.slug}`}
                        className="block truncate transition-colors hover:text-[var(--text-action)]"
                        style={{
                          font: '400 var(--text-sm)/1.3 var(--font-ui)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td style={{ padding: '0 8px' }}>
                      <span
                        style={{
                          font: '400 12px/1 var(--font-mono)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {c.invoice}
                      </span>
                    </td>
                    <td style={{ padding: '0 8px', textAlign: 'right' }}>
                      <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                        {c.amount}
                      </span>
                    </td>
                    <td style={{ padding: '0 8px', textAlign: 'right' }}>
                      <span
                        style={{
                          font: '400 var(--text-sm)/1 var(--font-mono)',
                          color: lateInk(c.days),
                        }}
                      >
                        {c.days} {c.days === 1 ? 'day' : 'days'}
                      </span>
                    </td>
                    <td style={{ padding: '0 16px', textAlign: 'right' }}>
                      <span
                        style={{
                          font: '400 var(--text-sm)/1 var(--font-mono)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {c.attempts}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-2 p-4 sm:hidden">
            {m.collections.map((c) => (
              <Link
                key={c.id}
                href={`/platform/tenants/${c.slug}`}
                className="block rounded-panel p-3"
                style={{ border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className="min-w-0 flex-1"
                    style={{
                      font: '500 var(--text-sm)/1.35 var(--font-ui)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {c.name}
                  </span>
                  <span
                    className="shrink-0 whitespace-nowrap"
                    style={{ font: '400 11px/1 var(--font-mono)', color: lateInk(c.days) }}
                  >
                    {c.days}d late
                  </span>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span
                    style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                  >
                    {c.invoice} · {c.attempts}
                  </span>
                  <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                    {c.amount}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div
            className="px-4 py-3"
            style={{
              background: 'var(--surface-sunken)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
              Phase 1 reports on this queue; it does not charge cards. <em>Retry</em> hands the
              invoice to the finance operator with the failure reason attached.
            </p>
          </div>
        </Panel>
      </div>
    </ConsolePage>
  );
}

/** Escalating rather than categorical: the question is "how late", not "which
 *  bucket". Over 60 days is a write-off conversation, not a retry. */
function lateInk(days: number): string {
  if (days > 60) return 'var(--danger-fg)';
  if (days > 5) return 'var(--warning-fg)';
  return 'var(--text-secondary)';
}

function Legend({
  swatch,
  shape = 'square',
  children,
}: {
  swatch: string;
  shape?: 'square' | 'line';
  children: React.ReactNode;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap"
      style={{ font: '400 12px/1 var(--font-ui)', color: 'var(--text-secondary)' }}
    >
      <span
        aria-hidden
        style={{
          width: shape === 'line' ? 10 : 8,
          height: shape === 'line' ? 2 : 8,
          borderRadius: 2,
          background: swatch,
          opacity: shape === 'line' ? 1 : 0.55,
        }}
      />
      {children}
    </span>
  );
}
