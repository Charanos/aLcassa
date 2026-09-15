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
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
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
      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'Plans' }]}
        title="Plans"
        actions={
          /*
            ⚠ THE REASON IS BESIDE THE CONTROL, NOT INSIDE ITS `title`.

            It was a tooltip, which is the third instance of this defect found in
            this pass and the one 17 §6.4 is most specific about: a reader on a
            keyboard, on a touch screen, or using a screen reader got a dead
            button and no account of it. The explanation now sits under the
            heading where everyone reads it, and the button keeps `title` as an
            addition rather than as the carrier.

            (A plain comment, not `{/* … *\/}` — this is already inside an
            attribute expression, and a JSX comment container there is a syntax
            error rather than a comment.)
          */
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              disabled
              title="A new plan is a catalogue and entitlement change, applied as a migration in Phase 1."
              className="inline-flex h-10 shrink-0 cursor-not-allowed items-center gap-2 rounded-xl px-5 text-[13px] font-medium whitespace-nowrap"
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
              className="t-caption max-w-[34ch] text-right"
              style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
            >
              A plan is a catalogue and entitlement change, applied as a migration in Phase 1 — not
              something this screen can write.
            </p>
          </div>
        }
      />
      <p className="t-body -mt-3 mb-8" style={{ color: 'var(--text-secondary)', maxWidth: '66ch' }}>
        Entitlements are data, not code. Editing a limit here changes what every workspace on that
        plan can do, on save.
      </p>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div
          className="overflow-hidden rounded-[32px]"
          style={{
            background: 'var(--surface-raised)',
            border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
            boxShadow: 'var(--shadow-lg), var(--glass-highlight)',
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
                    className="px-4 pt-5 pb-4 text-left text-[11px] font-medium tracking-wide uppercase"
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
                        className="mt-1.5 block font-mono text-[13px] font-medium"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {p.price}
                      </span>
                      {/* The tenant count sits in the column head on purpose:
                          it is the blast radius of every cell beneath it. */}
                      <span
                        className="mt-3 inline-flex items-center rounded-full px-2 py-1 font-mono text-[9px] font-medium tracking-wide uppercase"
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
                            className="font-mono text-[13px] font-medium"
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
            <p
              className="flex-1 text-[13px] leading-relaxed"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {m.overrides} workspaces carry per-tenant overrides that win over these values.{' '}
              {m.pendingChange.plan
                ? null
                : 'Limits are edited on the headroom card for each plan, below.'}
            </p>
            {/*
              ⚠ THE BUTTON ONLY EXISTS WHEN THERE IS SOMETHING TO SAVE.

              It rendered unconditionally. On the live path `pendingChange` is
              deliberately empty — `live.ts` refuses to fabricate a pending edit
              nobody has made — so "Save changes" opened a confirmation reading
              "This affects 0 workspaces", with a blank plan, a blank field and
              an arrow between two empty strings, and then refused on submit
              because the plan was empty. A live control that opens a dialog
              full of blanks is worse than a disabled one: the operator has to
              do the work to find out nothing was there.

              The edit it was reaching for is real now and lives on the headroom
              cards below, where each limit row has its own control and the
              preview counts what the change would strand. This stays for the
              designed fixture, which does carry a pending change and is what
              the dialog was drawn against.
            */}
            {m.pendingChange.plan ? <BlastRadiusDialog change={m.pendingChange} /> : null}
          </div>
        </div>

        <div className="grid gap-6 sm:gap-12">
          <section className="flex flex-col gap-5 pt-4">
            <h2
              className="text-[10px] font-medium tracking-[0.1em] uppercase"
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
                      className="flex-1 text-[13px] font-medium tracking-tight"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {p.name}
                    </span>
                    <span
                      className="font-mono text-[13px] font-medium"
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
            className="flex flex-col gap-4 rounded-[24px] px-5 py-6"
            style={{
              background: 'var(--surface-sunken)',
              boxShadow: 'var(--neu-inset)',
            }}
          >
            <p
              className="text-[10px] font-medium tracking-[0.1em] uppercase"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Blast radius
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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
                  ['Unassigned', `${m.unassigned} on trial`],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-4">
                  <span
                    className="text-[13px] font-medium tracking-tight"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {label}
                  </span>
                  <span
                    className="font-mono text-[13px] font-medium"
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
