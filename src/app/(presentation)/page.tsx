import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconClockHour3,
  IconMinus,
  IconPointer,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { Badge } from '@/components/feedback/Badge';
import { Cell, Fact, Panel, Row, SheetSection, SheetTable } from '@/components/presentation/Sheet';
import { DocCard } from '@/components/presentation/DocCard';
import { ThemeToggle } from '@/components/presentation/ThemeToggle';
import { getThemePreference, resolveTheme } from '@/lib/theme';
import {
  CLIENT_INPUTS,
  DEFINITION_OF_DONE,
  ENGAGEMENT,
  MILESTONES,
  OUT_OF_SCOPE,
  REQUIREMENTS,
} from '@/lib/presentation/engagement';
import { DESIGN_SHEETS, OPEN_DECISIONS, PROJECT_DOCS } from '@/lib/presentation/documents';
import { FOUNDATION, FOUNDATION_SUMMARY, STACK } from '@/lib/presentation/foundation';

export const metadata: Metadata = {
  title: { absolute: 'Conduit · Phase 1 foundation' },
  description:
    'The platform layer beneath a customer support inbox. Documentation set, design system and foundation status for Brian, against project brief revision 3.1.',
  robots: { index: false, follow: false },
};

/**
 * THE PRESENTATION SURFACE.
 *
 * ⚠ THIS IS TEMPORARY AND IT OCCUPIES `/`.
 *
 * The marketing page specified in 02 §2 and 10 §2 is intact and lives at
 * `/product`. At launch the two swap back: this surface moves to `/review` or
 * comes out entirely, and `/product` returns to `/`. That is a one-line change
 * in two files and it is recorded here so it is not discovered later.
 *
 * WHAT THIS SURFACE IS FOR. Brian is being asked to approve a design lock. The
 * useful thing to hand him is not a slide deck but the actual documents, the
 * actual design sheets, and an honest account of what already exists in the
 * repository, drawn in the design system he is being asked to approve. He is
 * reading the system while reading about it.
 *
 * WHAT IS DELIBERATELY ABSENT.
 *
 *   The commercial terms. Fee and payment schedule are agreed between Ian and
 *   Brian directly, and a shared link is the wrong place for a payment
 *   schedule. They are in the signed brief.
 *
 *   Document 01. It opens "internal working document, not client-facing" and
 *   contains the decision log and the risk register, including notes on where
 *   we disagree with an implication of the brief. It is filtered out by the
 *   `audience` flag in src/lib/presentation/documents.ts rather than by being
 *   forgotten, so restoring it is one flag flip if Dennis and Ian decide it
 *   should be shared.
 */

const NAV = [
  { href: '#s1', label: 'Engagement' },
  { href: '#s2', label: 'Scope' },
  { href: '#s3', label: 'Timeline' },
  { href: '#s4', label: 'Done' },
  { href: '#s5', label: 'Foundation' },
  { href: '#s6', label: 'Documents' },
  { href: '#s7', label: 'Design' },
  { href: '#s8', label: 'Decisions' },
];

const STATE_TONE = {
  built: { icon: IconCircleCheck, ink: 'var(--verdigris-ink)', label: 'Built' },
  scaffolded: { icon: IconClockHour3, ink: 'var(--ochre-ink)', label: 'Scaffolded' },
  planned: { icon: IconMinus, ink: 'var(--ink-tertiary)', label: 'Planned' },
} as const;

export default async function PresentationPage() {
  const theme = await resolveTheme(await getThemePreference());

  const clientDocs = PROJECT_DOCS.filter((doc) => doc.audience === 'client');
  const blocking = OPEN_DECISIONS.filter((d) => d.severity === 'blocking');

  return (
    <div style={{ background: 'var(--surface-page)' }}>
      {/* ═══ STICKY SHEET CHROME ═════════════════════════════════════════ */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-none"
        style={{ background: 'var(--surface-page)', borderColor: 'var(--rule-base)' }}
      >
        <div className="mx-auto flex h-14 items-center gap-4 px-5 md:px-8" style={{ maxWidth: '1180px' }}>
          <Link href="#top" className="flex items-center gap-2.5">
            <Mark size={20} />
            <span className="t-chip text-[var(--ink-primary)]">Conduit</span>
          </Link>

          <nav aria-label="Sheet sections" className="ml-4 hidden gap-4 lg:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="t-eyebrow text-[var(--ink-tertiary)] transition-colors duration-[var(--motion-fade)] hover:text-[var(--copper-ink)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="t-eyebrow hidden text-[var(--ink-faint)] md:block">Rev 3.1</span>
            <ThemeToggle theme={theme} />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto px-5 pb-24 md:px-8" style={{ maxWidth: '1180px' }}>
        {/* ═══ TITLE BLOCK ═══════════════════════════════════════════════ */}
        <div id="top" className="pt-14 md:pt-20">
          <div className="flex items-center gap-3">
            <span aria-hidden className="h-px w-6" style={{ background: 'var(--copper-rule)' }} />
            <span className="t-eyebrow text-[var(--copper-ink)]">
              {ENGAGEMENT.studio} · platform foundation · phase 1
            </span>
          </div>

          <h1 className="t-display mt-5 text-[var(--ink-primary)]">Conduit</h1>

          <p
            className="t-lede mt-5 text-[var(--ink-secondary)]"
            style={{ maxWidth: 'var(--measure-prose)' }}
          >
            The platform layer beneath a customer support inbox: tenancy with real isolation,
            authentication, subscription structure, an owner-level console, AI rules readable by
            machines, and documentation good enough that a stranger can pick the codebase up cold.
          </p>

          <dl className="mt-9 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            <Fact k="Prepared for" v={ENGAGEMENT.client} />
            <Fact k="Project lead" v={ENGAGEMENT.projectLead} />
            <Fact k="Against" v={`Brief ${ENGAGEMENT.briefVersion}`} />
            <Fact k="Issued" v={ENGAGEMENT.briefDate} />
            <Fact k="Duration" v="9 working weeks" />
            <Fact k="Status" v="For review" tone="var(--ochre-ink)" />
          </dl>

          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#s6"
              className="t-compact inline-flex items-center rounded-chip border px-4 text-[var(--action-primary-fg)] transition-colors duration-[var(--motion-fade)] hover:bg-[var(--copper-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              style={{
                background: 'var(--action-primary-bg)',
                borderColor: 'var(--action-primary-border)',
                minHeight: 'var(--control-lg)',
              }}
            >
              Read the documentation set
            </a>
            <a
              href="#s7"
              className="t-compact inline-flex items-center rounded-chip border px-4 text-[var(--ink-primary)] transition-colors duration-[var(--motion-fade)] hover:border-[var(--rule-strong)] hover:bg-[var(--surface-raised)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              style={{ borderColor: 'var(--rule-base)', minHeight: 'var(--control-lg)' }}
            >
              Open the design sheets
            </a>
            <Link
              href="/product"
              className="t-compact inline-flex items-center rounded-chip px-4 text-[var(--copper-ink)] transition-colors duration-[var(--motion-fade)] hover:bg-[var(--copper-tint)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              style={{ minHeight: 'var(--control-lg)' }}
            >
              See the product surface
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-14 md:mt-20 md:gap-20">
          {/* ═══ 1 · THE ENGAGEMENT ══════════════════════════════════════ */}
          <SheetSection
            n="1.0"
            title="What is being built, and the one thing it is really about"
            aside="Brief section 01"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <Panel tone="copper">
                <h3 className="t-panel text-[var(--ink-primary)]">Isolation is the product</h3>
                <p className="t-compact mt-2 text-[var(--ink-secondary)]">
                  Everything else here is ordinary SaaS engineering. The thing being paid for, and
                  the thing that ends a business if it fails once, is that one tenant can never read
                  another. It is enforced in the database rather than in the application, tested
                  automatically on every change, and gated at two milestones.
                </p>
              </Panel>

              <Panel tone="verdigris">
                <h3 className="t-panel text-[var(--ink-primary)]">
                  The owner is bound by the same rules
                </h3>
                <p className="t-compact mt-2 text-[var(--ink-secondary)]">
                  The organization switcher does not use the key that bypasses security. It mints a
                  scoped support session, so the same policies that protect a tenant apply to the
                  person looking in. That is a genuine ceiling rather than a courtesy, and the
                  tenant can see every time it happens.
                </p>
              </Panel>

              <Panel tone="slate">
                <h3 className="t-panel text-[var(--ink-primary)]">
                  Documentation has a pass mark
                </h3>
                <p className="t-compact mt-2 text-[var(--ink-secondary)]">
                  A developer who has never seen the repository clones it and runs it locally in
                  under thirty minutes, following the README alone. That test is run with a real
                  person and the result is reported whether or not it flatters us.
                </p>
              </Panel>
            </div>

            <Panel className="mt-4">
              <p className="t-body text-[var(--ink-secondary)]">
                Two more worth stating plainly.{' '}
                <span className="text-[var(--ink-primary)]">
                  The cache is an optimisation and never a source of truth:
                </span>{' '}
                with Redis switched off entirely, every correctness property in this system still
                holds and only speed changes, which is a testable claim and is tested in CI.{' '}
                <span className="text-[var(--ink-primary)]">Seams are contracts, not stubs:</span>{' '}
                the channel adapter interface, the knowledge base table and the customer records
                table are shaped now, so Phase 2 starts from a contract instead of a guess. Nothing
                is built above them.
              </p>
            </Panel>
          </SheetSection>

          {/* ═══ 2 · SCOPE ═══════════════════════════════════════════════ */}
          <SheetSection
            n="2.0"
            title="Scope, mapped one to one"
            lede="Your ten requirements in the order they will be built rather than the order they were sent, each with what it delivers and where it lands."
            aside="Brief section 02"
          >
            <SheetTable
              columns={['#', 'Your requirement', 'What we deliver', 'Milestone']}
              caption="Requirements mapped to delivery and milestone"
            >
              {REQUIREMENTS.map((req) => (
                <Row key={req.n}>
                  <Cell mono width="48px">
                    {String(req.n).padStart(2, '0')}
                  </Cell>
                  <Cell width="24%">{req.requirement}</Cell>
                  <Cell muted>{req.delivery}</Cell>
                  <Cell mono width="110px">
                    {req.milestone}
                  </Cell>
                </Row>
              ))}
            </SheetTable>

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

          {/* ═══ 3 · TIMELINE ════════════════════════════════════════════ */}
          <SheetSection
            n="3.0"
            title="Timeline and gates"
            lede="A gate is a demonstrated behaviour shown running, not a status report. Each payment trigger is therefore something you can verify yourself rather than take on trust."
            aside="Brief section 04"
          >
            <ol className="grid gap-0">
              {MILESTONES.map((milestone, index) => (
                <li
                  key={milestone.id}
                  className="grid gap-3 border-t py-5 md:grid-cols-[110px_1fr_320px]"
                  style={{
                    borderColor: index === 0 ? 'var(--rule-base)' : 'var(--rule-soft)',
                  }}
                >
                  <div>
                    <div className="t-data" style={{ color: 'var(--copper-ink)' }}>
                      {milestone.id}
                    </div>
                    <div className="t-caption mt-1 text-[var(--ink-tertiary)]">
                      Week {milestone.week}
                    </div>
                  </div>

                  <div>
                    <h3 className="t-panel text-[var(--ink-primary)]">{milestone.name}</h3>
                    <p className="t-compact mt-1 text-[var(--ink-secondary)]">{milestone.lands}</p>
                  </div>

                  <div className="flex flex-col items-start gap-2">
                    <span
                      className="t-compact rounded-chip border px-3 py-1.5"
                      style={{
                        color: 'var(--verdigris-ink)',
                        background: 'var(--verdigris-tint)',
                        borderColor: 'var(--verdigris-rule)',
                      }}
                    >
                      {milestone.gate}
                    </span>
                    {milestone.tranche ? (
                      <span className="t-eyebrow text-[var(--ink-faint)]">
                        Releases tranche {milestone.tranche}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>

            <Panel className="mt-4" tone="slate">
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

          {/* ═══ 4 · DEFINITION OF DONE ══════════════════════════════════ */}
          <SheetSection
            n="4.0"
            title="Definition of done"
            lede="Phase 1 is complete when all of the following hold. Each one is verifiable rather than a matter of opinion, and each has a test that proves it."
            aside="Brief section 05"
          >
            <ol className="grid gap-0">
              {DEFINITION_OF_DONE.map((condition, index) => (
                <li
                  key={condition}
                  className="flex items-baseline gap-4 border-t py-3.5"
                  style={{ borderColor: index === 0 ? 'var(--rule-base)' : 'var(--rule-soft)' }}
                >
                  <span className="t-data shrink-0 text-[var(--ink-faint)]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="t-body text-[var(--ink-secondary)]">{condition}</span>
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

          {/* ═══ 5 · FOUNDATION STATUS ═══════════════════════════════════ */}
          <SheetSection
            n="5.0"
            title="What already exists"
            lede="An honest account of the repository as it stands. Everything marked built can be opened during the walkthrough; scaffolded means a real file with a real contract and no logic above it; planned is a milestone commitment and nothing more."
            aside="This repository"
          >
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Fact k="Built" v={String(FOUNDATION_SUMMARY.built)} tone="var(--verdigris-ink)" />
              <Fact
                k="Scaffolded"
                v={String(FOUNDATION_SUMMARY.scaffolded)}
                tone="var(--ochre-ink)"
              />
              <Fact k="Planned" v={String(FOUNDATION_SUMMARY.planned)} />
              <Fact k="Tracked items" v={String(FOUNDATION_SUMMARY.total)} />
            </dl>

            <div className="mt-6">
              <SheetTable
                columns={['Area', 'What', 'State', 'Where to look', 'Milestone']}
                caption="Foundation status by area"
              >
                {FOUNDATION.map((item) => {
                  const tone = STATE_TONE[item.state];
                  const Icon = tone.icon;
                  return (
                    <Row key={`${item.area}-${item.what}`}>
                      <Cell width="120px" muted>
                        {item.area}
                      </Cell>
                      <Cell>{item.what}</Cell>
                      <Cell width="130px">
                        <span
                          className="t-chip inline-flex items-center gap-1"
                          style={{ color: tone.ink }}
                        >
                          <Icon size={12} stroke={1.5} aria-hidden />
                          {tone.label}
                        </span>
                      </Cell>
                      <Cell mono muted width="24%">
                        {item.evidence}
                      </Cell>
                      <Cell mono muted width="100px">
                        {item.milestone}
                      </Cell>
                    </Row>
                  );
                })}
              </SheetTable>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {STACK.map((entry) => (
                <Panel key={entry.layer}>
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="t-micro text-[var(--ink-tertiary)]">{entry.layer}</h3>
                    <span className="t-data text-[var(--copper-ink)]">{entry.choice}</span>
                  </div>
                  <p className="t-compact mt-2 text-[var(--ink-secondary)]">{entry.why}</p>
                </Panel>
              ))}
            </div>
          </SheetSection>

          {/* ═══ 6 · PROJECT DOCUMENTS ═══════════════════════════════════ */}
          <SheetSection
            n="6.0"
            title="The documentation set"
            lede="Thirteen documents. Requirement 7 is treated as a deliverable with its own acceptance test rather than as something written in the last week."
            aside={`${String(clientDocs.length)} documents`}
          >
            <div className="grid gap-3 md:grid-cols-2">
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
                <Link href="/docs/06-tenancy-and-isolation" className="text-[var(--copper-ink)]">
                  06 · Tenancy and isolation
                </Link>{' '}
                if you read only one. It states the guarantee precisely, sets out the ten-case test
                suite that proves it, and explains why support mode is a scoped session rather than
                a bypass. Everything else in the set is ordinary engineering by comparison.
              </p>
            </Panel>
          </SheetSection>

          {/* ═══ 7 · DESIGN SHEETS ═══════════════════════════════════════ */}
          <SheetSection
            n="7.0"
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

            <div className="grid gap-3 md:grid-cols-2">
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

          {/* ═══ 8 · OPEN DECISIONS ══════════════════════════════════════ */}
          <SheetSection
            n="8.0"
            title="Open decisions"
            lede="Seven questions, five of them blocking. Each one changes a table or a policy, so none of them can wait until it is convenient. A schema locked without the AI rules precedence answer is a schema that gets migrated in week seven."
            aside={`${String(blocking.length)} blocking`}
          >
            <div className="grid gap-3">
              {OPEN_DECISIONS.map((decision) => {
                const isBlocking = decision.severity === 'blocking';
                return (
                  <Panel key={decision.question} tone={isBlocking ? 'ochre' : 'slate'}>
                    <div className="flex flex-wrap items-baseline gap-3">
                      <h3 className="t-panel text-[var(--ink-primary)]">{decision.question}</h3>
                      <span
                        className="t-chip inline-flex items-center gap-1"
                        style={{
                          color: isBlocking ? 'var(--ochre-ink)' : 'var(--slate-ink)',
                        }}
                      >
                        {isBlocking ? (
                          <IconAlertTriangle size={12} stroke={1.5} aria-hidden />
                        ) : (
                          <IconPointer size={12} stroke={1.5} aria-hidden />
                        )}
                        {isBlocking ? `Blocking ${decision.blocks}` : 'Proposal'}
                      </span>
                      <span className="t-eyebrow ml-auto text-[var(--ink-faint)]">
                        {decision.when}
                      </span>
                    </div>

                    <p
                      className="t-compact mt-2 text-[var(--ink-secondary)]"
                      style={{ maxWidth: 'var(--measure-prose)' }}
                    >
                      {decision.detail}
                    </p>

                    <p className="t-caption mt-2 text-[var(--ink-tertiary)]">
                      Drawn and specified in {decision.where}
                    </p>
                  </Panel>
                );
              })}
            </div>
          </SheetSection>

          {/* ═══ 9 · WHAT WE NEED ════════════════════════════════════════ */}
          <SheetSection
            n="9.0"
            title="What we need from you"
            lede="Three of the four critical-path inputs are yours and all three are due in week one."
            aside="Brief section 07"
          >
            <SheetTable columns={['Item', 'When', 'Blocks']} caption="Client inputs and what each blocks">
              {CLIENT_INPUTS.map((input) => (
                <Row key={input.item}>
                  <Cell>{input.item}</Cell>
                  <Cell mono width="140px" muted>
                    {input.when}
                  </Cell>
                  <Cell mono width="200px" muted>
                    {input.blocking}
                  </Cell>
                </Row>
              ))}
            </SheetTable>
          </SheetSection>
        </div>

        {/* ═══ TITLE BLOCK, FOOT ═════════════════════════════════════════ */}
        <footer
          className="mt-16 border-t pt-6 md:mt-24"
          style={{ borderColor: 'var(--rule-strong)' }}
        >
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Badge tone="support">Commercial in confidence</Badge>
            <p className="t-caption text-[var(--ink-tertiary)]">
              Conduit is the codename for the design system and this document set, not a proposed
              product name.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
