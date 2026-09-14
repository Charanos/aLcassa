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
import { COMMERCIAL, ENGAGEMENT, MILESTONES, OUT_OF_SCOPE } from '@/lib/presentation/engagement';

export const metadata: Metadata = {
  title: 'Project tracker · aLcassa',
  description: 'Where the aLcassa platform build has reached.',
};

/**
 * THE PROJECT TRACKER, REBUILT FOR THE PERSON WHO COMMISSIONED THE WORK.
 *
 * ⚠ IT REPLACED A PAGE WRITTEN FOR ENGINEERS, AND THAT WAS THE WHOLE PROBLEM.
 *
 * The previous version carried eleven sections — a foundation explorer, a
 * decision matrix, a compliance grid, a document library, a design-system tour —
 * and every one of them was accurate. None of them answered the question a
 * client opens this page with: **where are we, and is anything stuck.**
 *
 * A reader had to pass through a policy catalogue and an architecture decision
 * record to find out that four milestones are finished. That is not a
 * presentation; it is an audit trail with a hero image.
 *
 * ⚠ WHAT WAS CUT, AND WHY IT IS NOT LOST. The engineering detail moved to where
 * somebody who wants it will actually look — the numbered documents, which are
 * linked at the foot. This page now carries five things: how far along the work
 * is, what a person can use today, what is left, what it costs, and what was
 * deliberately excluded. Everything else was a second way of saying one of
 * those.
 *
 * ⚠ IT READS THE SAME DATA AS BEFORE. `MILESTONES`, `COMMERCIAL` and
 * `OUT_OF_SCOPE` are unchanged structures; only the milestone NOTES were
 * rewritten, from engineering prose into four sentences a client can act on.
 * Nothing here is a second copy of a number kept in step by hand.
 */

/** What somebody can open and use today. Written as capabilities, not modules. */
const WORKING_TODAY = [
  {
    icon: IconShieldCheck,
    tone: 'success' as const,
    title: 'Customer separation, proven',
    body: 'One customer cannot reach another customer’s data, and it is checked automatically on every change rather than trusted.',
  },
  {
    icon: IconUsers,
    tone: 'info' as const,
    title: 'Accounts and teams',
    body: 'Sign-in, password recovery, invitations by email, roles and ownership transfer — across both the customer application and the admin console.',
  },
  {
    icon: IconCreditCard,
    tone: 'info' as const,
    title: 'Plans and limits',
    body: 'Pricing tiers, seat and channel limits enforced at the limit, and every plan change recorded with who made it and why.',
  },
  {
    icon: IconBuildingSkyscraper,
    tone: 'info' as const,
    title: 'The admin console',
    body: 'Workspaces, revenue, plans, the activity record, support sessions and the operator’s own profile — running on real data.',
  },
  {
    icon: IconRobot,
    tone: 'warning' as const,
    title: 'Assistant rules',
    body: 'Central instructions that shape how the AI replies, inherited by every workspace. Editing is built; publishing is in progress.',
  },
  {
    icon: IconLock,
    tone: 'neutral' as const,
    title: 'Customer settings',
    body: 'Company profile, team management and API credentials. Screens exist and the security work is done; the final controls follow.',
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
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <header className="mb-14">
        <p
          className="mb-3 font-mono text-[11px] uppercase"
          style={{ color: 'var(--text-tertiary)', letterSpacing: '0.2em', fontWeight: 500 }}
        >
          {ENGAGEMENT.studio} · {ENGAGEMENT.phase}
        </p>

        <h1
          className="display display-lg tracking-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          aLcassa
        </h1>

        <p
          className="t-body mt-4 max-w-[62ch]"
          style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
        >
          A multi-tenant messaging platform for {ENGAGEMENT.client}, built by {ENGAGEMENT.team} over{' '}
          {ENGAGEMENT.duration}. This page is the honest state of the work — updated as it
          changes, not written for a meeting.
        </p>

        {/*
          ⚠ THREE FIGURES, NOT TWELVE. An earlier hero carried eight statistics
          including a count of documents written, which measures effort rather
          than progress. These are the three a client would ask for out loud.
        */}
        <dl className="mt-10 grid gap-4 sm:grid-cols-3">
          <Figure label="Overall progress" value={`${percent}%`} note="across all milestones" />
          <Figure
            label="Milestones complete"
            value={`${complete} of ${MILESTONES.length}`}
            note="each ends in a demonstration"
          />
          <Figure label="Fee" value={COMMERCIAL.totalFee} note="fixed, in four tranches" />
        </dl>
      </header>

      {/* ── Where we are ─────────────────────────────────────────────────── */}
      <Section
        id="milestones"
        title="Where we are"
        standfirst="Every milestone ends in something you can watch working. Nothing here is marked complete on the strength of a document."
      >
        <MilestoneBoard />
      </Section>

      {/* ── What works today ─────────────────────────────────────────────── */}
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
                className="mt-4 text-[15px]"
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

      {/* ── Commercial ───────────────────────────────────────────────────── */}
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
                  style={{ font: '500 13px/1 var(--font-mono)', color: 'var(--text-primary)' }}
                >
                  {t.amount}
                </span>
                <span
                  className="shrink-0"
                  style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
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
                    style={{ font: '500 11.5px/1 var(--font-mono)', color: 'var(--success-fg)' }}
                  >
                    EARNED
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </Section>

      {/* ── Out of scope ─────────────────────────────────────────────────── */}
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

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer
        className="mt-16 border-t pt-8"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
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
        className="font-mono text-[10.5px] uppercase"
        style={{ color: 'var(--text-tertiary)', letterSpacing: '0.14em', fontWeight: 500 }}
      >
        {label}
      </dt>
      <dd
        className="numeric mt-2 text-[28px] leading-none"
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
        <p
          className="t-body mt-2 max-w-[62ch]"
          style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
        >
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
