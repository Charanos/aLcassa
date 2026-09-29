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
import {
  BandLink,
  ConsoleHeader,
  ConsolePage,
  ExportLink,
  Panel,
  SectionHeading,
} from '@/components/console/Surface';
import { AgeingChart, MrrChart, PlanMixChart } from '@/components/console/Charts';
import { CollectionQueueTable } from '@/components/console/CollectionQueueTable';
import { getRevenue, type Kpi } from '@/lib/console/data';
import { MovementBand } from '@/components/console/revenue/MovementBand';

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
          <ConsoleHeader
            breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'Revenue' }]}
            title="Revenue"
          />
          <p className="t-body mt-2" style={{ color: 'var(--text-secondary)', maxWidth: '66ch' }}>
            What the platform earns, what it is owed, and which workspaces are worth calling this
            week.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ExportLink resource="revenue">
            <IconDownload size={15} stroke={1.5} aria-hidden />
            Export CSV
          </ExportLink>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────
          Dark ambient section matching the Overview aesthetic. */}
      <section
        className="relative mt-8 mb-12 overflow-hidden rounded-card shadow-2xl transition-all duration-300"
        style={{
          background: 'var(--chrome-bg-base)',
          border: '1px solid var(--chrome-rule-strong)',
          color: 'var(--invert-card-fg)',
          boxShadow:
            'var(--shadow-lg), inset 0 1px 1px color-mix(in oklab, var(--ink-0) 6%, transparent)',
        }}
      >
        {/* Premium Ambient Background Art */}
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none"
          aria-hidden="true"
        >
          <div
            className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full opacity-[0.18] blur-[120px]"
            style={{ background: 'var(--blue-500)' }}
          />
          <div
            className="absolute -right-32 -bottom-32 h-[600px] w-[600px] rounded-full opacity-[0.12] blur-[140px]"
            style={{ background: 'var(--blue-700)' }}
          />

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

          <div
            className="absolute inset-0 opacity-[0.25]"
            style={{
              backgroundImage:
                'radial-gradient(color-mix(in oklab, var(--ink-0) 70%, transparent) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
              maskImage: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)',
              WebkitMaskImage: 'linear-gradient(135deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 60%)',
            }}
          />
        </div>

        {/* KPI Row (Signal Cards) */}
        <div className="relative z-10 px-8 pb-8 lg:px-12 lg:pb-12">
          <div className="absolute top-0 right-8 left-8 h-[1px] bg-gradient-to-r from-transparent via-[var(--chrome-rule-strong)] to-transparent opacity-60 lg:right-12 lg:left-12" />

          <div className="grid w-full grid-cols-1 gap-6 pt-8 md:grid-cols-2 md:gap-8 lg:grid-cols-3 xl:grid-cols-5">
            {m.kpis.map((k, i) => {
              const Icon = KPI_ICON[k.icon];
              const Arrow = k.direction === 'up' ? IconArrowUp : IconArrowDown;
              const isPositive = k.good;
              const isDanger = k.tone === 'danger';

              return (
                <div
                  key={k.label}
                  className="group relative -m-5 flex cursor-default flex-col justify-between rounded-overlay px-5 py-3 transition-all duration-300 hover:bg-[var(--chrome-hover)] hover:shadow-[var(--glass-highlight)]"
                >
                  <div className="pointer-events-none absolute right-3 -bottom-6 z-0 text-[var(--invert-card-fg)] opacity-[0.08] transition-transform duration-500 group-hover:scale-110 group-hover:opacity-[0.14]">
                    <Icon size={120} stroke={1.5} aria-hidden />
                  </div>

                  {i < m.kpis.length - 1 && (
                    <div className="pointer-events-none absolute top-1/2 -right-4 hidden h-16 w-[1px] -translate-y-1/2 bg-gradient-to-b from-transparent via-[var(--chrome-rule)] to-transparent xl:block" />
                  )}

                  <div className="relative z-10 mb-4 flex items-center justify-between">
                    <span
                      className="font-mono text-2xs font-medium tracking-[0.15em] uppercase"
                      style={{ color: 'var(--invert-card-fg)', opacity: 0.5 }}
                    >
                      {k.label}
                    </span>
                  </div>

                  <div className="relative z-10 mb-2 flex items-end gap-3">
                    <div
                      className="font-mono tracking-tight"
                      style={{
                        fontSize: '34px',
                        fontWeight: 300,
                        color: isDanger ? 'var(--chrome-danger)' : 'var(--invert-card-fg)',
                        lineHeight: 1,
                        textShadow: isDanger
                          ? '0 4px 16px color-mix(in oklab, var(--chrome-danger) 30%, transparent)'
                          : '0 4px 16px color-mix(in oklab, var(--chrome-bg-base) 50%, transparent)',
                        letterSpacing: '-0.03em',
                      }}
                    >
                      {k.value}
                    </div>
                  </div>

                  <div
                    className="relative z-10 mt-1 flex items-center gap-2"
                    style={{
                      font: '400 12px/1.4 var(--font-ui)',
                      color: 'var(--invert-card-fg)',
                      opacity: 0.7,
                    }}
                  >
                    <span
                      className="numeric inline-flex items-center gap-0.5 whitespace-nowrap"
                      style={{
                        fontSize: 11,
                        color: isPositive ? 'var(--chrome-success)' : 'var(--chrome-danger)',
                      }}
                    >
                      <Arrow size={12} stroke={2.5} aria-hidden />
                      {k.delta}
                    </span>
                    <span className="truncate">{k.note}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <SectionHeading
        title="Revenue Analytics"
        note="Live breakdown of monthly recurring revenue trajectory and plan distribution."
        align="right"
      />
      <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Monthly recurring revenue"
          variant="elevated"
          action={
            <span className="flex items-center gap-3.5">
              <Legend swatch="var(--blue-500)" shape="line">
                MRR
              </Legend>
              <Legend swatch="var(--success-fg)">Net new</Legend>
            </span>
          }
          footer={<BandLink href="/platform/tenants">The workspaces behind the figure</BandLink>}
        >
          <MrrChart data={m.mrr} />
        </Panel>

        <Panel
          title="Revenue by plan"
          flush
          variant="elevated"
          footer={<BandLink href="/platform/plans">Plans and what they entitle</BandLink>}
        >
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
                  style={{ fontSize: 'var(--type-compact)' }}
                >
                  {p.display}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-8 mb-16">
        <MovementBand movement={m.movement} />
      </div>

      {/* ── Ageing + collection queue ────────────────────────────────── */}
      <SectionHeading
        title="Collection Queue"
        note="Outstanding invoices sorted by days late. The collection queue is the actionable priority."
        align="right"
      />
      <div className="mt-8 grid items-stretch gap-6 lg:grid-cols-[1.1fr_1.5fr]">
        <Panel
          title="Invoice ageing"
          variant="elevated"
          action={
            <span
              className="numeric whitespace-nowrap"
              style={{ fontSize: 'var(--type-compact)', color: 'var(--danger-fg)' }}
            >
              {m.outstanding} outstanding
            </span>
          }
          /*
            ⚠ THE LINK CARRIES THE FILTER, WHICH IS THE WHOLE POINT OF IT.

            `BandLink`'s own documentation: "a band is a QUESTION, a
            visualisation that answers it, and a route to the screen that owns
            the follow-up. A reader who finishes a band and has nowhere to go
            has been shown a fact rather than given a handle on it." Every band
            on this page was a dead end.

            A bare `/platform/tenants` would have been the weak version — this
            band says some workspaces are behind, and the link would then ask
            the operator to find them again by hand. `WorkspaceTable` seeds its
            status chips from this parameter, so the link lands on exactly the
            rows the chart is about.
          */
          footer={
            <BandLink href="/platform/tenants?status=past+due">
              The workspaces that are behind
            </BandLink>
          }
        >
          <div className="relative min-h-[220px] flex-1">
            <AgeingChart data={m.ageing} />
          </div>
        </Panel>

        <Panel
          title="Collection queue"
          flush
          variant="elevated"
          action={
            <span className="t-caption whitespace-nowrap" style={{ color: 'var(--text-tertiary)' }}>
              Sorted by days late
            </span>
          }
        >
          <CollectionQueueTable collections={m.collections} />

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
            <div className="mt-2 -ml-4">
              <BandLink href="/platform/tenants?attention=1">
                Every workspace needing attention
              </BandLink>
            </div>
          </div>
        </Panel>
      </div>
    </ConsolePage>
  );
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
