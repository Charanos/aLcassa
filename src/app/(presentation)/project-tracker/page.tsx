import type { Metadata } from 'next';
import Link from 'next/link';
import {
  IconArrowRight,
  IconBuildingSkyscraper,
  IconCreditCard,
  IconLock,
  IconRobot,
  IconShieldCheck,
  IconUsers,
} from '@tabler/icons-react';
import { IconTile } from '@/components/primitives/IconTile';
import { MilestoneBoard } from '@/components/presentation/MilestoneBoard';
import { PROJECT_DOCS } from '@/lib/presentation/documents';
import {
  COMMERCIAL,
  ENGAGEMENT,
  MILESTONES,
  OUT_OF_SCOPE,
  PHASE_ONE_VERIFICATION,
} from '@/lib/presentation/engagement';

export const metadata: Metadata = {
  title: 'Project tracker',
  description: 'Where the aLcassa platform build has reached.',
  robots: { index: false, follow: false },
};

/** Present milestone progress and blockers in client language, with supporting technical detail linked separately. */

/** What somebody can open and use today. Written as capabilities, not modules. */
const WORKING_TODAY = [
  {
    icon: IconShieldCheck,
    tone: 'success' as const,
    title: 'Customer separation, proven',
    body: `The full local suite passed ${PHASE_ONE_VERIFICATION.applicationTests} tests; all 15 workspace tables pass policy coverage checks. Session and credential rows are private to the server connection. Final review remains part of release qualification.`,
  },
  {
    icon: IconUsers,
    tone: 'info' as const,
    title: 'Accounts and teams',
    body: 'Owner setup and password recovery pass with the local identity provider. Email confirmation, expiry and earlier-session revocation have coverage. Browser account acceptance and colleague invitations remain open; production email needs verified delivery and redirect configuration.',
  },
  {
    icon: IconCreditCard,
    tone: 'info' as const,
    title: 'Plans and limits',
    body: 'Plans and subscription changes use recorded data. Concurrent credential limits and overrides pass database checks. Shared rate budgets and hosted service acceptance remain open.',
  },
  {
    icon: IconBuildingSkyscraper,
    tone: 'info' as const,
    title: 'The admin console',
    body: 'Workspaces, subscription value, plans, Activity, support sessions and Profile use recorded data. Health canvas charts, the default workspace grid and navigation loading feedback are published. Service monitoring and final surface acceptance remain open.',
  },
  {
    icon: IconRobot,
    tone: 'warning' as const,
    title: 'Assistant rules',
    body: `Workspace and platform instructions can be published and restored with conflict checks, safeguards and recorded history. ${PHASE_ONE_VERIFICATION.propagationChecks} actual publish/restore operations reached FastAPI within five seconds locally. Hosted service and full API acceptance remain open.`,
  },
  {
    icon: IconLock,
    tone: 'neutral' as const,
    title: 'Customer settings',
    body: 'Company saves and customer Activity use recorded data. The disposable owner browser verified credential creation, one-time display, downloaded replacement, grace and revocation. Clipboard, phone/error journeys and usage persistence remain open.',
  },
];

export default function ProjectTrackerPage() {
  const complete = MILESTONES.filter((m) => m.status === 'complete').length;
  const percent = Math.round(
    MILESTONES.reduce((sum, m) => sum + m.progress, 0) / MILESTONES.length,
  );

  return (
    <main
      id="main"
      className="mx-auto w-full px-5 py-14 pb-24 md:px-8"
      style={{ maxWidth: '1080px', color: 'var(--text-primary)' }}
    >
      <header className="mb-14">
        <p
          className="mb-3 font-mono text-xs uppercase"
          style={{ color: 'var(--text-tertiary)', letterSpacing: '0.2em', fontWeight: 500 }}
        >
          {ENGAGEMENT.studio} · {ENGAGEMENT.phase}
        </p>

        <h1 className="display display-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>
          aLcassa
        </h1>

        <p className="t-body mt-4" style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}>
          A multi-tenant messaging platform for {ENGAGEMENT.client}, built by {ENGAGEMENT.team} over{' '}
          {ENGAGEMENT.duration}. Progress is reviewed against implemented work and verified
          journeys; final acceptance is tracked separately.
        </p>

        {/* Keep headline progress limited to the milestones, current stage and blockers. */}
        <p className="t-body mt-6 text-[var(--text-secondary)]">
          Verified checkpoint · {PHASE_ONE_VERIFICATION.date}. The application passed{' '}
          {PHASE_ONE_VERIFICATION.applicationTests} local tests; the service passed{' '}
          {PHASE_ONE_VERIFICATION.serviceTests} local tests, {PHASE_ONE_VERIFICATION.bridgeChecks}{' '}
          cross-runtime checks and {PHASE_ONE_VERIFICATION.propagationChecks} measured
          publish/restore checks. Phase One remains in verification; email delivery, hosted service
          and operational qualification have open gates.{' '}
          <Link
            href="/project-tracker/verification"
            className="text-[var(--text-action)] underline underline-offset-4"
          >
            Read the verification record
          </Link>
          .
        </p>
        <dl className="mt-10 grid gap-4 sm:grid-cols-3">
          <Figure
            label="Estimated progress"
            value={`${percent}%`}
            note="Engineering estimate; acceptance gates remain open"
          />
          <Figure
            label="Milestones complete"
            value={`${complete} of ${MILESTONES.length}`}
            note="each ends in a demonstration"
          />
          <Figure label="Fee" value={COMMERCIAL.totalFee} note="fixed, in four tranches" />
        </dl>
      </header>

      <Section
        id="milestones"
        title="Where we are"
        standfirst="Every milestone ends in something you can watch working. Nothing here is marked complete on the strength of a document."
      >
        <MilestoneBoard />
      </Section>

      <Section
        id="working"
        title="What works today"
        standfirst="Capabilities you can open and use, rather than components that exist."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {WORKING_TODAY.map((item) => (
            <div
              key={item.title}
              className="rounded-overlay p-5"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <IconTile icon={item.icon} tone={item.tone} size="lg" />
              <h3
                className="mt-4 text-md"
                style={{ color: 'var(--text-primary)', fontWeight: 500 }}
              >
                {item.title}
              </h3>
              <p
                className="t-compact mt-1.5"
                style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="commercial"
        title="Payment schedule"
        standfirst={`${COMMERCIAL.totalFee} total, released against milestones rather than against time spent.`}
      >
        <div
          className="overflow-hidden rounded-overlay"
          style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
        >
          {COMMERCIAL.tranches.map((t, i) => {
            const milestone = MILESTONES.find((m) => m.tranche === t.n);
            const released = milestone?.status === 'complete';
            return (
              <div
                key={t.n}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4"
                style={{
                  borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)',
                }}
              >
                <span
                  className="numeric shrink-0"
                  style={{
                    font: '500 var(--type-compact)/1 var(--font-mono)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {t.amount}
                </span>
                <span
                  className="shrink-0"
                  style={{
                    font: '400 var(--type-compact)/1 var(--font-mono)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {t.share}
                </span>
                <span
                  className="t-compact min-w-0 flex-1"
                  style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
                >
                  {t.trigger}
                </span>
                {/* Only the tranches tied to a completed milestone are marked —
                    tranche 1 is on signature and has no milestone to read. */}
                {released ? (
                  <span
                    className="shrink-0"
                    style={{
                      font: '500 var(--type-chip)/1 var(--font-mono)',
                      color: 'var(--success-fg)',
                    }}
                  >
                    EARNED
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>

      <Section
        id="scope"
        title="Deliberately not included"
        standfirst="Phase 1 exclusions. Listed so there is no discovery later about what was never agreed."
      >
        <ul className="grid gap-2.5">
          {OUT_OF_SCOPE.map((item) => (
            <li
              key={item}
              className="t-compact flex gap-3"
              style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
            >
              <span aria-hidden style={{ color: 'var(--text-disabled)' }}>
                &mdash;
              </span>
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        id="documents"
        title="Project documents"
        standfirst="The maintained scope, system references, completion plan and verification ledger. Historical reviews remain labelled by date; current outcomes are in the verification record."
      >
        <div className="mb-5 flex flex-wrap gap-3">
          <Door href="/docs/25-phase-one-completion-plan" label="Completion plan" />
          <Door href="/docs/26-phase-one-verification-ledger" label="Verification ledger" />
          <Door href="/project-tracker/security" label="Dependency security record" />
        </div>
        <details className="rounded-overlay border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-5 py-4">
          <summary className="t-compact cursor-pointer text-[var(--text-primary)]">
            Browse the documentation set ·{' '}
            {PROJECT_DOCS.filter((doc) => doc.audience === 'client').length} documents
          </summary>
          <nav aria-label="Project documentation" className="mt-4 grid gap-x-8 sm:grid-cols-2">
            {PROJECT_DOCS.filter((doc) => doc.audience === 'client').map((doc) => (
              <Link
                key={doc.slug}
                href={`/docs/${doc.slug}`}
                className="group flex gap-3 border-t border-[var(--border-subtle)] py-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--border-focus)]"
              >
                <span className="t-data text-[var(--text-tertiary)]">{doc.n}</span>
                <span className="min-w-0">
                  <span className="t-compact block text-[var(--text-primary)] group-hover:text-[var(--text-action)]">
                    {doc.title}
                  </span>
                  <span className="t-caption mt-1 block text-[var(--text-secondary)]">
                    {doc.settles}
                  </span>
                </span>
              </Link>
            ))}
          </nav>
        </details>
      </Section>

      <footer className="mt-16 border-t pt-8" style={{ borderColor: 'var(--border-subtle)' }}>
        <p className="t-compact" style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}>
          Brief {ENGAGEMENT.briefVersion}, {ENGAGEMENT.briefDate}. Project lead{' '}
          {ENGAGEMENT.projectLead}, {ENGAGEMENT.studio}, {ENGAGEMENT.studioLocation}.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Door href="/platform" label="Admin console" />
          <Door href="/app" label="Workspace inbox" />
        </div>
      </footer>
    </main>
  );
}

/** One hero figure. Term before value, so a screen reader pairs them correctly. */
function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div
      className="rounded-overlay px-5 py-4"
      style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}
    >
      <dt
        className="font-mono text-2xs uppercase"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.14em', fontWeight: 500 }}
      >
        {label}
      </dt>
      <dd
        className="numeric mt-2 text-xl leading-none"
        style={{ color: 'var(--text-primary)', fontWeight: 500, letterSpacing: '-0.02em' }}
      >
        {value}
      </dd>
      <dd className="t-caption mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
        {note}
      </dd>
    </div>
  );
}

function Section({
  id,
  title,
  standfirst,
  children,
}: {
  id: string;
  title: string;
  standfirst: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-14 scroll-mt-8">
      <div className="mb-6">
        <h2 className="display display-md tracking-tight" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="t-body mt-2" style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}>
          {standfirst}
        </p>
      </div>
      {children}
    </section>
  );
}

function Door({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="t-compact group inline-flex h-10 items-center gap-2 rounded-chip px-4 transition-all duration-200 hover:shadow-[var(--shadow-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-primary)',
        fontWeight: 500,
      }}
    >
      {label}
      <IconArrowRight
        size={14}
        aria-hidden
        className="transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        style={{ color: 'var(--text-tertiary)' }}
      />
    </Link>
  );
}
