import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconAlertTriangle,
  IconClockHour3,
  IconPointer,
  IconShieldCheck,
  IconShieldExclamation,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { Fact, Panel, SheetSection, StatTile, StatusChip, Well, type Tone } from '@/components/presentation/Sheet';
import { DataList, type Column } from '@/components/presentation/DataList';
import { DocCard } from '@/components/presentation/DocCard';
import { TrackerHeader } from '@/components/presentation/TrackerHeader';
import { TrackerMotion } from '@/components/presentation/TrackerMotion';
import { TrackerDashboardHero } from '@/components/presentation/TrackerDashboardHero';
import { InteractiveDecisionMatrix } from '@/components/presentation/InteractiveDecisionMatrix';
import { Timeline, MILESTONE_STATUS } from '@/components/presentation/Timeline';
import { FoundationExplorer } from '@/components/presentation/FoundationExplorer';
import { ProgressLine } from '@/components/presentation/Charts';
import { CommandPalette, type Command } from '@/components/presentation/CommandPalette';
import { ErrorBoundary } from '@/components/primitives/ErrorBoundary';
import { getThemePreference, resolveTheme } from '@/lib/theme';
import {
  CLIENT_INPUTS,
  COMPLIANCE,
  DEFINITION_OF_DONE,
  ENGAGEMENT,
  MILESTONES,
  OUT_OF_SCOPE,
  REQUIREMENTS,
  UPDATES,
  type ComplianceState,
} from '@/lib/presentation/engagement';
import { DESIGN_SHEETS, OPEN_DECISIONS, PROJECT_DOCS } from '@/lib/presentation/documents';
import { FOUNDATION, FOUNDATION_SUMMARY, STACK } from '@/lib/presentation/foundation';

export const metadata: Metadata = {
  title: { absolute: 'Project tracker · Conduit · Phase 1' },
  description:
    'Live delivery tracker for the Conduit platform foundation: milestones, gates, compliance, the documentation set and the design set.',
  robots: { index: false, follow: false },
};

/**
 * THE PROJECT TRACKER.
 *
 * The client-facing record of where delivery stands: what moved since the last
 * look, which gate is next, which decisions are blocking, and where the
 * compliance obligations sit. The marketing page from 02 §2 is at `/`.
 *
 * WHAT IS DELIBERATELY ABSENT.
 *
 *   The commercial terms. Fee and payment schedule are agreed between Ian and
 *   Brian directly. The tranche TRIGGERS are shown, because a trigger is a
 *   milestone gate and knowing which gate releases which tranche is useful to
 *   both sides; the amounts are not.
 *
 *   Document 01. It opens "internal working document, not client-facing". It is
 *   filtered by the `audience` flag in documents.ts AND refused at its URL,
 *   because a filter that only hides a link is not a control.
 */

const SECTIONS = [
  { id: 'status', label: 'Status' },
  { id: 'updates', label: 'Updates' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'foundation', label: 'Foundation' },
  { id: 'decisions', label: 'Decisions' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'scope', label: 'Scope' },
  { id: 'done', label: 'Done' },
  { id: 'documents', label: 'Documents' },
  { id: 'design', label: 'Design' },
];

const COMPLIANCE_TONE: Record<ComplianceState, { icon: TablerIcon; tone: Tone; label: string }> = {
  met: { icon: IconShieldCheck, tone: 'verdigris', label: 'Met' },
  partial: { icon: IconClockHour3, tone: 'ochre', label: 'In progress' },
  open: { icon: IconShieldExclamation, tone: 'slate', label: 'Phase 2' },
  flagged: { icon: IconAlertTriangle, tone: 'oxide', label: 'Needs you' },
};

const UPDATE_TONE: Record<string, { tone: Tone; label: string; icon: TablerIcon }> = {
  delivery: { tone: 'verdigris', label: 'Delivered', icon: IconShieldCheck },
  decision: { tone: 'slate', label: 'Decision', icon: IconPointer },
  blocker: { tone: 'ochre', label: 'Blocker', icon: IconAlertTriangle },
};

export default async function ProjectTrackerPage() {
  const theme = await resolveTheme(await getThemePreference());

  const clientDocs = PROJECT_DOCS.filter((doc) => doc.audience === 'client');
  const blocking = OPEN_DECISIONS.filter((d) => d.severity === 'blocking');

  const overall = Math.round(
    MILESTONES.reduce((sum, m) => sum + m.progress, 0) / MILESTONES.length,
  );
  const complianceMet = COMPLIANCE.filter((c) => c.state === 'met').length;
  const complianceNeedsYou = COMPLIANCE.filter((c) => c.state === 'flagged').length;

  const commands: Command[] = [
    ...SECTIONS.map((s) => ({
      id: `section-${s.id}`,
      label: s.label,
      group: 'Sections' as const,
      href: `#${s.id}`,
    })),
    ...clientDocs.map((doc) => ({
      id: `doc-${doc.slug}`,
      label: doc.title,
      hint: doc.n,
      group: 'Documents' as const,
      href: `/docs/${doc.slug}`,
    })),
    ...DESIGN_SHEETS.map((sheet) => ({
      id: `sheet-${sheet.slug}`,
      label: sheet.title,
      hint: sheet.n,
      group: 'Design sheets' as const,
      href: `/design/${sheet.slug}.html`,
      external: true,
    })),
    {
      id: 'action-theme',
      label: 'Toggle the theme',
      hint: 'light and dark',
      group: 'Actions',
      action: 'toggle-theme',
    },
    { id: 'action-product', label: 'Open the product surface', group: 'Actions', href: '/' },
  ];

  /**
   * Milestone progress as a SEQUENCE rather than a set of categories: M0
   * genuinely precedes M1, which precedes M2, in a way "Data model" and
   * "API" as areas do not precede each other. The line's x-axis label is the
   * short id, since eight full names side by side would collide; the full
   * name and status are what the tooltip is for.
   */
  const milestoneChart = MILESTONES.map((m) => ({
    label: m.id,
    value: m.progress,
    note: `${m.name} · ${MILESTONE_STATUS[m.status].label}`,
  }));

  const requirementColumns: Array<Column<(typeof REQUIREMENTS)[number]>> = [
    {
      key: 'n',
      header: '#',
      width: '52px',
      mono: true,
      hideOnCard: true,
      cell: (row) => String(row.n).padStart(2, '0'),
    },
    { key: 'requirement', header: 'Your requirement', width: '24%', primary: true, cell: (row) => row.requirement },
    { key: 'delivery', header: 'What we deliver', muted: true, cell: (row) => row.delivery },
    { key: 'milestone', header: 'Milestone', width: '116px', mono: true, muted: true, cell: (row) => row.milestone },
  ];

  const inputColumns: Array<Column<(typeof CLIENT_INPUTS)[number]>> = [
    { key: 'item', header: 'Item', primary: true, cell: (row) => row.item },
    { key: 'when', header: 'When', width: '150px', mono: true, muted: true, cell: (row) => row.when },
    { key: 'blocks', header: 'Blocks', width: '160px', mono: true, muted: true, cell: (row) => row.blocking },
    { key: 'status', header: 'Status', width: '220px', muted: true, cell: (row) => row.status },
  ];

  return (
    <div style={{ background: 'var(--surface-page)' }}>
      <TrackerMotion />
      <CommandPalette commands={commands} />
      <TrackerHeader theme={theme} sections={SECTIONS} />

      <main id="main" className="mx-auto px-5 pb-28 md:px-8 py-12" style={{ maxWidth: '1280px' }}>
        <TrackerDashboardHero
          client={ENGAGEMENT.client}
          projectLead={ENGAGEMENT.projectLead}
          briefVersion={ENGAGEMENT.briefVersion}
          briefDate={ENGAGEMENT.briefDate}
          overallProgress={overall}
          blockingCount={blocking.length}
          complianceCount={complianceMet}
        />

        <div className="mt-16 grid gap-16 md:mt-24 md:gap-24">
          {/* ═══ 1 · STATUS ══════════════════════════════════════════════ */}
          <SheetSection
            id="status"
            n="1.0"
            title="Where delivery stands"
            lede="Progress against a milestone is a judgement rather than a task count, because a derived percentage would look more precise and mean less."
            aside="Live"
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-reveal-group>
              <StatTile
                label="Overall progress"
                value={overall}
                suffix="%"
                tone="var(--copper-ink)"
                note="Mean across all eight milestones"
              />
              <StatTile
                label="Built and verifiable"
                value={FOUNDATION_SUMMARY.built}
                suffix={` / ${String(FOUNDATION_SUMMARY.total)}`}
                tone="var(--verdigris-ink)"
                note="Openable in the repository today"
              />
              <StatTile
                label="Blocking decisions"
                value={blocking.length}
                tone="var(--ochre-ink)"
                note="Three are due in week one"
              />
              <StatTile
                label="Compliance met"
                value={complianceMet}
                suffix={` / ${String(COMPLIANCE.length)}`}
                tone={complianceNeedsYou > 0 ? 'var(--oxide-ink)' : 'var(--verdigris-ink)'}
                note={
                  complianceNeedsYou > 0
                    ? `${String(complianceNeedsYou)} item needs a decision from you`
                    : 'Nothing outstanding'
                }
              />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3" data-reveal-group>
              <Panel interactive>
                <h3 className="t-panel text-[var(--ink-primary)]">Isolation is the product</h3>
                <p className="t-compact mt-2 text-[var(--ink-secondary)]">
                  Everything else here is ordinary SaaS engineering. The thing being paid for, and
                  the thing that ends a business if it fails once, is that one tenant can never read
                  another. It is enforced in the database rather than the application, tested on
                  every change, and gated at two milestones.
                </p>
              </Panel>

              <Panel interactive>
                <h3 className="t-panel text-[var(--ink-primary)]">
                  The owner is bound by the same rules
                </h3>
                <p className="t-compact mt-2 text-[var(--ink-secondary)]">
                  The organization switcher does not use the key that bypasses security. It mints a
                  scoped support session, so the same policies that protect a tenant apply to the
                  person looking in. That is a genuine ceiling rather than a courtesy, and the
                  tenant can see and end every session.
                </p>
              </Panel>

              <Panel interactive>
                <h3 className="t-panel text-[var(--ink-primary)]">Documentation has a pass mark</h3>
                <p className="t-compact mt-2 text-[var(--ink-secondary)]">
                  A developer who has never seen the repository clones it and runs it locally in
                  under thirty minutes, following the README alone. That test is run with a real
                  person and the result is reported whether or not it flatters us.
                </p>
              </Panel>
            </div>
          </SheetSection>

          {/* ═══ 2 · UPDATES ═════════════════════════════════════════════ */}
          <SheetSection
            id="updates"
            n="2.0"
            title="What has moved"
            lede="Newest first. If an entry needs a paragraph it is a document rather than an update, and it will be linked from here instead."
            aside={`${String(UPDATES.length)} entries`}
          >
            <ol className="grid gap-3" data-reveal-group>
              {UPDATES.map((update) => {
                const tone = UPDATE_TONE[update.kind] ?? UPDATE_TONE.delivery;
                if (!tone) return null;

                return (
                  <li key={update.title}>
                    <Panel tone={tone.tone} reveal>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                        <span className="t-data text-[var(--ink-tertiary)]">{update.date}</span>
                        <h3 className="t-panel text-[var(--ink-primary)]">{update.title}</h3>
                        <StatusChip tone={tone.tone} icon={tone.icon} size="sm">
                          {tone.label}
                        </StatusChip>
                        <span className="t-eyebrow ml-auto text-[var(--ink-tertiary)]">
                          {update.milestone}
                        </span>
                      </div>
                      <p
                        className="t-compact mt-2 text-[var(--ink-secondary)]"
                        style={{ maxWidth: 'var(--measure-prose)' }}
                      >
                        {update.body}
                      </p>
                    </Panel>
                  </li>
                );
              })}
            </ol>
          </SheetSection>

          {/* ═══ 3 · TIMELINE ════════════════════════════════════════════ */}
          <SheetSection
            id="timeline"
            n="3.0"
            title="Milestones and gates"
            lede="A gate is a demonstrated behaviour shown running, not a status report. Each payment trigger is therefore something you can verify yourself rather than take on trust."
            aside="Brief section 04"
          >
            <Panel className="mb-6" reveal>
              <h3 className="t-micro mb-3 text-[var(--ink-tertiary)]">Progress by milestone</h3>
              <ErrorBoundary label="The milestone chart">
                <ProgressLine data={milestoneChart} suffix="%" height={260} />
              </ErrorBoundary>
            </Panel>

            <Timeline milestones={MILESTONES} />

            <Panel className="mt-6" tone="slate">
              <p className="t-compact text-[var(--ink-secondary)]">
                Error tracking, log aggregation and database metrics are switched on during week 2
                rather than during hardening, because instrumentation is only useful with history
                behind it. Two senior developers hold the engagement for its full duration: one owns
                everything touching isolation and the database, the other everything touching
                interface and identity. That split is deliberate. Isolation is the risk, and one
                person holding it end to end is more reliable than two people each half-knowing it.
              </p>
            </Panel>
          </SheetSection>

          {/* ═══ 4 · FOUNDATION ══════════════════════════════════════════ */}
          <SheetSection
            id="foundation"
            n="4.0"
            title="What already exists"
            lede="An honest account of the repository as it stands. Built can be opened during the walkthrough; scaffolded means a real file with a real contract and no logic above it; planned is a milestone commitment and nothing more."
            aside="This repository"
          >
            <ErrorBoundary label="The foundation explorer">
              <FoundationExplorer items={FOUNDATION} />
            </ErrorBoundary>

            <div className="mt-6 grid gap-4 md:grid-cols-2" data-reveal-group>
              {STACK.map((entry) => (
                <Panel key={entry.layer} reveal interactive>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <h3 className="t-micro text-[var(--ink-tertiary)]">{entry.layer}</h3>
                    <span className="t-data text-[var(--copper-ink)]">{entry.choice}</span>
                  </div>
                  <p className="t-compact mt-2 text-[var(--ink-secondary)]">{entry.why}</p>
                </Panel>
              ))}
            </div>
          </SheetSection>

          <SheetSection
            id="decisions"
            n="5.0"
            title="Open decisions"
            lede="Five of the original seven questions are answered as of 24 August 2026, most of them ahead of schedule. The support role answer opened one narrower question of its own, listed below in its place. Two remain as originally drawn, both proposals rather than anything blocking."
            aside={`${String(blocking.length)} blocking`}
          >
            <InteractiveDecisionMatrix decisions={[...OPEN_DECISIONS]} />

            <div className="mt-6" data-reveal>
              <h3 className="t-micro mb-3 text-[var(--ink-tertiary)]">What we need from you</h3>
              <DataList
                rows={[...CLIENT_INPUTS]}
                columns={inputColumns}
                rowKey={(row) => row.item}
                caption="Client inputs and what each blocks"
              />
            </div>
          </SheetSection>

          {/* ═══ 6 · COMPLIANCE ══════════════════════════════════════════ */}
          <SheetSection
            id="compliance"
            n="6.0"
            title="Compliance and data protection"
            lede="Tracked rather than asserted. Under the Kenyan Data Protection Act 2019 you are a processor for your tenants and they are controllers for their own customers, which is a relationship that needs to exist in writing before your first paying customer."
            aside={`${String(complianceMet)} of ${String(COMPLIANCE.length)} met`}
          >
            <div className="grid gap-3" data-reveal-group>
              {COMPLIANCE.map((item) => {
                const spec = COMPLIANCE_TONE[item.state];

                return (
                  <Panel key={item.area} tone={spec.tone} reveal>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                      <h3 className="t-panel text-[var(--ink-primary)]">{item.area}</h3>
                      <StatusChip tone={spec.tone} icon={spec.icon} size="sm">
                        {spec.label}
                      </StatusChip>
                      <span className="t-eyebrow ml-auto text-[var(--ink-tertiary)]">
                        {item.reference}
                      </span>
                    </div>

                    <p
                      className="t-compact mt-2 text-[var(--ink-primary)]"
                      style={{ maxWidth: 'var(--measure-prose)' }}
                    >
                      {item.obligation}
                    </p>

                    <dl className="mt-4 grid gap-4 md:grid-cols-2">
                      <Well>
                        <dt className="t-eyebrow text-[var(--ink-tertiary)]">In place</dt>
                        <dd className="t-caption mt-1.5 text-[var(--ink-secondary)]">
                          {item.evidence}
                        </dd>
                      </Well>
                      {item.outstanding ? (
                        <Well>
                          <dt className="t-eyebrow text-[var(--ink-tertiary)]">Outstanding</dt>
                          <dd className="t-caption mt-1.5 text-[var(--ink-secondary)]">
                            {item.outstanding}
                          </dd>
                        </Well>
                      ) : null}
                    </dl>
                  </Panel>
                );
              })}
            </div>
          </SheetSection>

          {/* ═══ 7 · SCOPE ═══════════════════════════════════════════════ */}
          <SheetSection
            id="scope"
            n="7.0"
            title="Scope, mapped one to one"
            lede="Your ten requirements in the order they will be built rather than the order they were sent, each with what it delivers and where it lands."
            aside="Brief section 02"
          >
            <div data-reveal>
              <DataList
                rows={[...REQUIREMENTS]}
                columns={requirementColumns}
                rowKey={(row) => String(row.n)}
                caption="Requirements mapped to delivery and milestone"
              />
            </div>

            <Panel className="mt-4" tone="ochre">
              <h3 className="t-micro text-[var(--ochre-ink)]">
                Explicitly out of scope for Phase 1
              </h3>
              <p className="t-caption mt-2 text-[var(--ink-tertiary)]">
                Deliberate exclusions rather than oversights. Each one is cheaper to build on top of
                a finished foundation than alongside one.
              </p>
              <ul className="mt-3 grid gap-2 md:grid-cols-2">
                {OUT_OF_SCOPE.map((item) => (
                  <li key={item} className="t-compact flex gap-2 text-[var(--ink-secondary)]">
                    <span aria-hidden className="text-[var(--ink-faint)]">
                      ·
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Panel>
          </SheetSection>

          {/* ═══ 8 · DEFINITION OF DONE ══════════════════════════════════ */}
          <SheetSection
            id="done"
            n="8.0"
            title="Definition of done"
            lede="Phase 1 is complete when all of the following hold. Each one is verifiable rather than a matter of opinion, and each has a test that proves it."
            aside="Brief section 05"
          >
            <ol className="grid gap-2 md:grid-cols-2" data-reveal-group>
              {DEFINITION_OF_DONE.map((condition, index) => (
                <li
                  key={condition}
                  data-reveal
                  className="flex items-baseline gap-3 rounded-panel border p-4"
                  style={{
                    borderColor: 'var(--rule-base)',
                    background: 'var(--surface-raised)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                >
                  <span className="t-data shrink-0 tabular-nums text-[var(--copper-ink)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="t-compact text-[var(--ink-secondary)]">{condition}</span>
                </li>
              ))}
            </ol>

            <p
              className="t-caption mt-4 text-[var(--ink-tertiary)]"
              style={{ maxWidth: 'var(--measure-prose)' }}
            >
              Conditions 6 and 8 are the two that turn a promise into a measurement. Both are
              reported honestly whether or not the number flatters us.
            </p>
          </SheetSection>

          {/* ═══ 9 · DOCUMENTS ═══════════════════════════════════════════ */}
          <SheetSection
            id="documents"
            n="9.0"
            title="The documentation set"
            lede="Requirement 7 is treated as a deliverable with its own acceptance test rather than as something written in the last week. These render from the same markdown files the team edits, so they cannot go stale."
            aside={`${String(clientDocs.length)} documents`}
          >
            <div className="grid gap-3 md:grid-cols-2" data-reveal-group>
              {clientDocs.map((doc) => (
                <DocCard
                  key={doc.slug}
                  n={doc.n}
                  title={doc.title}
                  settles={doc.settles}
                  source={doc.source}
                  href={`/docs/${doc.slug}`}
                  band={doc.band}
                />
              ))}
            </div>

            <Panel className="mt-4" tone="copper">
              <p className="t-compact text-[var(--ink-secondary)]">
                Start with{' '}
                <Link
                  href="/docs/06-tenancy-and-isolation"
                  className="text-[var(--copper-ink)] underline decoration-[var(--copper-rule)] underline-offset-2"
                >
                  06 · Tenancy and isolation
                </Link>{' '}
                if you read only one. It states the guarantee precisely, sets out the ten-case test
                suite that proves it, and explains why support mode is a scoped session rather than
                a bypass. Everything else in the set is ordinary engineering by comparison.
              </p>
            </Panel>
          </SheetSection>

          {/* ═══ 10 · DESIGN ═════════════════════════════════════════════ */}
          <SheetSection
            id="design"
            n="10.0"
            title="The design set"
            lede="Fourteen sheets at 1440 wide. Sheets 01 to 04 are the system and specify both themes with every contrast ratio measured. Sheets 05 to 11 are screens. Sheets 12 to 14 are behaviour and handover."
            aside="14 sheets"
          >
            <Panel className="mb-4">
              <p className="t-compact text-[var(--ink-secondary)]">
                The aesthetic, stated once. This product is infrastructure, and its whole job is
                holding boundaries: between tenants, between roles, between what a credential may
                read and what it may not. Infrastructure that holds looks like a technical drawing.
                The material vocabulary is conduit and patina: copper carries current between places
                without being the current, and oxidises to verdigris as evidence it has been
                working. Six hues, one meaning each. One weight of type, because a technical drawing
                has no bold either. Tinted surfaces instead of shadows.
              </p>
              <p className="t-caption mt-3 text-[var(--ink-tertiary)]">
                The page you are reading is drawn in that system. Press the theme control in the
                header to see the second half of it.
              </p>
            </Panel>

            <div className="grid gap-3 md:grid-cols-2" data-reveal-group>
              {DESIGN_SHEETS.map((sheet) => (
                <DocCard
                  key={sheet.slug}
                  n={sheet.n}
                  title={sheet.title}
                  settles={sheet.settles}
                  source={sheet.source}
                  href={`/design/${sheet.slug}.html`}
                  band={sheet.band}
                  external
                />
              ))}
            </div>
          </SheetSection>
        </div>

        {/* ═══ TITLE BLOCK, FOOT ═════════════════════════════════════════ */}
        <footer className="mt-20 border-t pt-6" style={{ borderColor: 'var(--rule-strong)' }}>
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <Mark size={20} />
              <div>
                <div className="t-chip text-[var(--ink-primary)]">Conduit</div>
                <div className="t-caption text-[var(--ink-tertiary)]">
                  {ENGAGEMENT.studio} · {ENGAGEMENT.studioLocation}
                </div>
              </div>
            </div>

            <dl className="flex flex-wrap gap-8">
              <Fact k="Prepared by" v={ENGAGEMENT.projectLead} />
              <Fact k="Commercial" v="Ian" />
              <Fact k="Design lock" v="M0 · week 1" />
            </dl>
          </div>

          <p className="t-caption mt-6 text-[var(--ink-tertiary)]">
            Commercial in confidence. Conduit is the codename for the design system and this
            document set, not a proposed product name.
          </p>
        </footer>
      </main>
    </div>
  );
}
