import type { Metadata } from 'next';
import {
  IconClock,
  IconCpu,
  IconDatabase,
  IconKey,
  IconMail,
  IconPlus,
  IconRobot,
  IconShieldLock,
  IconUsers,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, SectionHeading } from '@/components/console/Surface';
import { BlastRadiusDialog } from '@/components/console/BlastRadiusDialog';
import { getHeadroom, getPlans, type EntitlementRow } from '@/lib/console/data';
import { getLiveHeadroom, getLivePlans } from '@/lib/console/live';
import { HeadroomBand } from '@/components/console/plans/HeadroomBand';

export const metadata: Metadata = { title: 'Plans' };

/** Plan limits affect every assigned workspace; show the impact preview before accepting changes. */

const ROW_ICON: Record<EntitlementRow['icon'], TablerIcon> = {
  seat: IconUsers,
  bolt: IconCpu,
  mail: IconMail,
  db: IconDatabase,
  key: IconKey,
  bot: IconRobot,
  clock: IconClock,
  shield: IconShieldLock,
};

export default async function PlansPage() {
  /** Read the live plan catalogue for authenticated operators; use fixtures only for explicit review mode. */
  const [m, headroom] = await Promise.all([
    getLivePlans().then(async (live) => live ?? (await getPlans())),
    getLiveHeadroom().then(async (live) => live ?? (await getHeadroom())),
  ]);
  const assigned = m.plans.reduce((n, p) => n + p.count, 0);

  return (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'Plans' }]}
        title="Plans"
        actions={
          /* Put the unavailable-control explanation beside the button so touch and keyboard users can read it. */
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              disabled
              title="New plans require a managed catalogue update."
              className="inline-flex h-10 shrink-0 cursor-not-allowed items-center gap-2 rounded-overlay px-5 text-sm font-medium whitespace-nowrap"
              style={{
                background: 'var(--surface-sunken)',
                color: 'var(--text-disabled)',
                boxShadow: 'inset 0 0 0 1px var(--border-subtle)',
              }}
            >
              <IconPlus size={16} stroke={1.5} aria-hidden />
              New plan
            </button>
            <p
              className="t-caption text-right"
              style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
            >
              New plans require a managed catalogue update. Existing plan limits can be edited
              below.
            </p>
          </div>
        }
      />
      <p className="t-body -mt-3 mb-8" style={{ color: 'var(--text-secondary)' }}>
        Review plan allowances and their impact. Saving a limit change applies it to every workspace
        on that plan.
      </p>

      <SectionHeading
        title="Plan allowances"
        note="Compare limits, then review affected workspaces before saving a change."
      />
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="overflow-hidden rounded-slab"
          style={{
            background: 'var(--surface-raised)',
            border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
            boxShadow: 'var(--shadow-lg), var(--glass-highlight)',
          }}
        >
          {/* The one horizontal scroller in the console. See the header note. */}
          <div
            className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)]"
            role="region"
            aria-label="Plan comparison table"
            tabIndex={0}
          >
            <table
              className="w-full border-collapse"
              style={{ tableLayout: 'fixed', minWidth: 640 }}
            >
              <colgroup>
                <col style={{ width: '30%' }} />
                {m.plans.map((p) => (
                  <col key={p.key} style={{ width: `${70 / m.plans.length}%` }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-4 pt-5 pb-4 text-left text-xs font-medium tracking-wide uppercase"
                    style={{
                      background: 'var(--surface-sunken)',
                      color: 'var(--text-tertiary)',
                      boxShadow: 'var(--glass-highlight)',
                      borderBottom:
                        '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                    }}
                  >
                    Entitlement
                  </th>
                  {m.plans.map((p) => (
                    <th
                      key={p.key}
                      scope="col"
                      className="relative px-4 py-5 text-left align-top"
                      style={{
                        background: 'var(--surface-sunken)',
                        boxShadow: 'var(--glass-highlight)',
                        borderBottom:
                          '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                      }}
                    >
                      {/* Vertical Engraved Separator */}
                      <div className="absolute inset-y-0 left-0 w-px bg-[color-mix(in_srgb,var(--border-subtle)_30%,transparent)]" />
                      <div className="absolute inset-y-0 left-px w-px bg-[color-mix(in_oklab,var(--ink-0)_70%,transparent)]" />

                      <span
                        className="block text-sm font-medium tracking-tight"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {p.name}
                      </span>
                      <span
                        className="mt-1.5 block font-mono text-sm font-medium"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {p.price}
                      </span>
                      {/* The tenant count sits in the column head on purpose:
                          it is the blast radius of every cell beneath it. */}
                      <span
                        className="mt-3 inline-flex items-center rounded-full px-2 py-1 font-mono text-3xs font-medium tracking-wide uppercase"
                        style={{
                          background: 'var(--surface-raised)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                          boxShadow: 'var(--glass-highlight)',
                        }}
                      >
                        {p.tenants}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.rows.map((row) => {
                  const Icon = ROW_ICON[row.icon];
                  return (
                    <tr key={row.label}>
                      <th
                        scope="row"
                        className="px-4 text-left font-normal"
                        style={{
                          height: 52,
                          borderBottom:
                            '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                          boxShadow: 'var(--glass-highlight)',
                        }}
                      >
                        <span className="flex items-center gap-3">
                          <Icon
                            size={16}
                            stroke={1.5}
                            className="shrink-0"
                            style={{ color: 'var(--text-tertiary)' }}
                            aria-hidden
                          />
                          <span
                            className="truncate text-sm font-medium tracking-tight"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {row.label}
                          </span>
                        </span>
                      </th>
                      {row.values.map((v, i) => (
                        <td
                          key={`${row.label}-${m.plans[i]?.key ?? i}`}
                          className="relative px-4"
                          style={{
                            height: 52,
                            borderBottom:
                              '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
                            boxShadow: 'var(--glass-highlight)',
                          }}
                        >
                          {/* Vertical Engraved Separator */}
                          <div className="absolute inset-y-0 left-0 w-px bg-[color-mix(in_srgb,var(--border-subtle)_30%,transparent)]" />
                          <div className="absolute inset-y-0 left-px w-px bg-[color-mix(in_oklab,var(--ink-0)_70%,transparent)]" />

                          <span
                            className="font-mono text-sm font-medium"
                            style={{
                              /* Three inks, three meanings: absent, unbounded,
                                 and a real number. "unlimited" is not a value
                                 to compare against, so it steps back. */
                              color:
                                v === '—'
                                  ? 'var(--text-disabled)'
                                  : v === 'unlimited'
                                    ? 'var(--text-secondary)'
                                    : 'var(--text-primary)',
                            }}
                          >
                            {v}
                          </span>
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className="flex flex-wrap items-center gap-4 px-5 py-4"
            style={{
              background: 'var(--surface-sunken)',
            }}
          >
            <p className="flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              {m.overrides} workspaces carry per-tenant overrides that win over these values.{' '}
              {m.pendingChange.plan
                ? null
                : 'Limits are edited on the headroom card for each plan, below.'}
            </p>
            {/* Render save only for an actual pending change; live limit edits use their own reviewed controls. */}
            {m.pendingChange.plan ? <BlastRadiusDialog change={m.pendingChange} /> : null}
          </div>
        </div>

        <div className="grid gap-6 sm:gap-12">
          <section className="flex flex-col gap-5 pt-4">
            <h2
              className="text-2xs font-medium tracking-[0.1em] uppercase"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Distribution
            </h2>
            <div className="flex flex-col gap-4">
              {/* A stacked proportion bar rather than a chart. Four plans is
                  not enough series to need axes, and the question here is
                  "which plan holds the customers", which a single bar answers
                  in one glance and a donut answers in two. */}
              <div
                className="flex h-3 w-full overflow-hidden rounded-full"
                role="img"
                aria-label={m.plans.map((p) => `${p.name} ${p.count}`).join(', ')}
                style={{
                  background: 'var(--surface-sunken)',
                  boxShadow: 'var(--neu-inset)',
                }}
              >
                {m.plans.map((p, i) => (
                  <span
                    key={p.key}
                    title={`${p.name} · ${p.count}`}
                    style={{
                      width: `${(p.count / assigned) * 100}%`,
                      background: [
                        'var(--ink-300)',
                        'var(--blue-300)',
                        'var(--blue-500)',
                        'var(--blue-800)',
                      ][i],
                      boxShadow: 'var(--glass-highlight)',
                    }}
                  />
                ))}
              </div>
              <div className="mt-2 grid gap-2.5">
                {m.plans.map((p, i) => (
                  <div key={p.key} className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        background: [
                          'var(--ink-300)',
                          'var(--blue-300)',
                          'var(--blue-500)',
                          'var(--blue-800)',
                        ][i],
                        boxShadow: 'var(--glass-highlight)',
                      }}
                    />
                    <span
                      className="flex-1 text-sm font-medium tracking-tight"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="font-mono text-sm font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {p.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            className="flex flex-col gap-4 rounded-hero px-5 py-6"
            style={{
              background: 'var(--surface-sunken)',
              boxShadow: 'var(--neu-inset)',
            }}
          >
            <p
              className="text-2xs font-medium tracking-[0.1em] uppercase"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Blast radius
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Every plan edit states how many workspaces it touches before it commits, and names the
              ones that would be pushed over a limit by the change.
            </p>
            <div
              className="relative mt-2 grid gap-3 border-t pt-5"
              style={{ borderColor: 'color-mix(in srgb, var(--border-subtle) 30%, transparent)' }}
            >
              {/* Horizontal Engraved line overlay */}
              <div className="bg-[color-mix(in oklab, var(--ink-0) 70%, transparent)] absolute inset-x-0 top-0 h-px" />

              {(
                [
                  [
                    'Plans in use',
                    `${m.plans.filter((p) => p.count > 0).length} of ${m.plans.length}`,
                  ],
                  ['Custom overrides', `${m.overrides} workspaces`],
                  ['Unassigned', `${m.unassigned} without a subscription`],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <span
                    className="text-sm font-medium tracking-tight"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {label}
                  </span>
                  <span
                    className="font-mono text-sm font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <HeadroomBand model={headroom} />
    </ConsolePage>
  );
}
