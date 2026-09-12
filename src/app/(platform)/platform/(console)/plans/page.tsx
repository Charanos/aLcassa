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
import { ConsoleHeader, ConsolePage, Panel } from '@/components/console/Surface';
import { BlastRadiusDialog } from '@/components/console/BlastRadiusDialog';
import { getHeadroom, getPlans, type EntitlementRow } from '@/lib/console/data';
import { getLiveHeadroom, getLivePlans } from '@/lib/console/live';
import { HeadroomBand } from '@/components/console/plans/HeadroomBand';

export const metadata: Metadata = { title: 'Plans' };

/**
 * Plans and entitlements. `Plans.dc.html`.
 *
 * ⚠ THE LEDE IS THE MOST IMPORTANT SENTENCE ON THE SCREEN: "entitlements are
 * data, not code. Editing a limit here changes what every workspace on that
 * plan can do, on save."
 *
 * That is not marketing copy, it is a warning. The entitlement guard reads
 * these values on every request through both doors — the browser session and
 * the service key — so this table is not a pricing page, it is a live control
 * surface for 47 businesses. Everything else on the screen (the tenant counts
 * in each column head, the override note, the blast-radius panel, the confirm
 * dialog) exists to keep that fact in front of whoever is editing.
 *
 * ⚠ THE COMPARISON MATRIX DOES NOT COLLAPSE INTO CARDS ON MOBILE, and this is
 * the one table in the console that does not.
 *
 * Everywhere else, a row is a record and a card per record is a faithful
 * translation. Here the ROW is the unit of comparison — the whole point is
 * reading "staff seats" across four plans on one line — and four cards would
 * destroy exactly the relationship the table exists to show. It scrolls
 * horizontally inside its own container instead, which is the correct
 * exception rather than a lapse.
 */

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
  /**
   * Live catalogue first, designed fixture second.
   *
   * The fixture listed Trial, Starter, Growth and Scale — the four-tier
   * proposal replaced on 24 Aug 2026 — against entitlement keys that were
   * never in the schema. A signed-in operator now sees the real Pro,
   * Business and Custom; the review bypass still sees the drawn version.
   */
  const [m, headroom] = await Promise.all([
    getLivePlans().then(async (live) => live ?? (await getPlans())),
    getLiveHeadroom().then(async (live) => live ?? (await getHeadroom())),
  ]);
  const assigned = m.plans.reduce((n, p) => n + p.count, 0);

  return (
    <ConsolePage>
      <div
        className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:gap-6"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="min-w-0 flex-1">
          <ConsoleHeader eyebrow="/platform/plans" title="Plans" />
          <p className="t-body mt-2" style={{ color: 'var(--text-secondary)', maxWidth: '66ch' }}>
            Entitlements are data, not code. Editing a limit here changes what every workspace on
            that plan can do, on save.
          </p>
        </div>
        <button
          type="button"
          disabled
          title="A new plan is a catalogue and entitlement change, applied as a migration in Phase 1."
          className="t-compact inline-flex h-[34px] shrink-0 items-center gap-2 rounded-panel px-3.5 whitespace-nowrap"
          style={{ opacity: 0.45, cursor: 'not-allowed', background: 'var(--blue-500)', color: '#ffffff', fontWeight: 500 }}
        >
          <IconPlus size={15} stroke={1.5} aria-hidden />
          New plan
        </button>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="overflow-hidden rounded-overlay"
          style={{
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-raised)',
            boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
          }}
        >
          {/* The one horizontal scroller in the console. See the header note. */}
          <div className="overflow-x-auto">
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
                    className="t-eyebrow px-4 pt-4 pb-3 text-left"
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      background: 'var(--surface-sunken)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    Entitlement
                  </th>
                  {m.plans.map((p) => (
                    <th
                      key={p.key}
                      scope="col"
                      className="px-3 py-3.5 text-left align-top"
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        borderLeft: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span
                        className="block"
                        style={{
                          font: '500 var(--text-base)/1.3 var(--font-ui)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {p.name}
                      </span>
                      <span
                        className="numeric mt-1 block"
                        style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}
                      >
                        {p.price}
                      </span>
                      {/* The tenant count sits in the column head on purpose:
                          it is the blast radius of every cell beneath it. */}
                      <span
                        className="mt-2 inline-flex h-5 items-center rounded-full px-2 whitespace-nowrap"
                        style={{
                          background: 'var(--surface-raised)',
                          border: '1px solid var(--border-subtle)',
                          font: '400 11px/1 var(--font-mono)',
                          color: 'var(--text-secondary)',
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
                    <tr key={row.label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <th scope="row" className="px-4 text-left font-normal" style={{ height: 44 }}>
                        <span className="flex items-center gap-2.5">
                          <Icon
                            size={16}
                            stroke={1.5}
                            className="shrink-0"
                            style={{ color: 'var(--text-tertiary)' }}
                            aria-hidden
                          />
                          <span
                            className="truncate"
                            style={{
                              font: '400 var(--text-sm)/1.3 var(--font-ui)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {row.label}
                          </span>
                        </span>
                      </th>
                      {row.values.map((v, i) => (
                        <td
                          key={`${row.label}-${m.plans[i]?.key ?? i}`}
                          className="px-3"
                          style={{ height: 44, borderLeft: '1px solid var(--border-subtle)' }}
                        >
                          <span
                            className="numeric"
                            style={{
                              fontSize: 'var(--text-sm)',
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
            className="flex flex-wrap items-center gap-3 px-4 py-3.5"
            style={{
              background: 'var(--surface-sunken)',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <p className="t-compact flex-1" style={{ color: 'var(--text-tertiary)' }}>
              {m.overrides} workspaces carry per-tenant overrides that win over these values.
            </p>
            <BlastRadiusDialog change={m.pendingChange} />
          </div>
        </div>

        <div className="grid gap-5">
          <Panel title="Distribution" flush>
            <div className="p-4">
              {/* A stacked proportion bar rather than a chart. Four plans is
                  not enough series to need axes, and the question here is
                  "which plan holds the customers", which a single bar answers
                  in one glance and a donut answers in two. */}
              <div
                className="flex h-2.5 w-full overflow-hidden rounded-full"
                role="img"
                aria-label={m.plans.map((p) => `${p.name} ${p.count}`).join(', ')}
              >
                {m.plans.map((p, i) => (
                  <span
                    key={p.key}
                    title={`${p.name} · ${p.count}`}
                    style={{
                      width: `${(p.count / assigned) * 100}%`,
                      background: [
                        'var(--ink-300)',
                        'var(--blue-200)',
                        'var(--blue-400)',
                        'var(--blue-500)',
                      ][i],
                    }}
                  />
                ))}
              </div>
              <div className="mt-3.5 grid gap-2">
                {m.plans.map((p, i) => (
                  <div key={p.key} className="flex items-center gap-2.5">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-chip"
                      style={{
                        background: [
                          'var(--ink-300)',
                          'var(--blue-200)',
                          'var(--blue-400)',
                          'var(--blue-500)',
                        ][i],
                      }}
                    />
                    <span className="t-compact flex-1" style={{ color: 'var(--text-primary)' }}>
                      {p.name}
                    </span>
                    <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                      {p.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <section
            className="rounded-overlay p-5"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-sunken)',
            }}
          >
            <p className="t-eyebrow mb-3" style={{ color: 'var(--text-tertiary)' }}>
              Blast radius
            </p>
            <p className="t-compact" style={{ color: 'var(--text-secondary)' }}>
              Every plan edit states how many workspaces it touches before it commits, and names the
              ones that would be pushed over a limit by the change.
            </p>
            <div
              className="mt-3.5 grid gap-2.5 border-t pt-3.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {(
                [
                  [
                    'Plans in use',
                    `${m.plans.filter((p) => p.count > 0).length} of ${m.plans.length}`,
                  ],
                  ['Custom overrides', `${m.overrides} workspaces`],
                  ['Unassigned', `${m.unassigned} on trial`],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-3">
                  <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                    {label}
                  </span>
                  <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
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
