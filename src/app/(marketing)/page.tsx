import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconHistory,
  IconLock,
  IconMessage,
  IconServer2,
  IconShieldLock,
  IconUsers,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { Button } from '@/components/primitives/Button';
import { HeroDiagram } from '@/components/marketing/HeroDiagram';

export const metadata: Metadata = {
  title: { absolute: 'One inbox for every message your customers send · Conduit' },
  description:
    'WhatsApp, Instagram, Messenger and your website, handled in one place by one team. Currently in development.',
};

/**
 * 02 §2 · 10 §2. THE MARKETING SURFACE IS ONE PAGE.
 *
 * Brian has not asked for a marketing site and it is not in scope. What exists
 * is the shell needed to sign in, sign up and satisfy legal obligations, built
 * out enough to be worth arriving at.
 *
 * THE CONSTRAINT THAT SHAPES EVERY WORD: the main surface of this product does
 * not exist yet, and Brian has real early customers with real accounts. So the
 * page says what is live and what is not, in the same size type, near the top.
 * A page that implied a working inbox would generate a support ticket on the
 * first click, and Brian is the support team.
 *
 * 03 §20 is the checklist this is drawn against: no gradient hero, no
 * glassmorphism, no band of large numbers with tiny labels, no counting
 * animation, no "powered by AI" badge. One honest sentence, and the type doing
 * the work.
 */

const CHANNELS: Array<{ icon: TablerIcon; name: string; status: string }> = [
  { icon: IconBrandWhatsapp, name: 'WhatsApp Business', status: 'Next phase' },
  { icon: IconBrandInstagram, name: 'Instagram', status: 'Next phase' },
  { icon: IconBrandMessenger, name: 'Messenger', status: 'Next phase' },
  { icon: IconMessage, name: 'Website chat', status: 'Next phase' },
];

const LIVE_NOW: Array<{ icon: TablerIcon; title: string; body: string }> = [
  {
    icon: IconUsers,
    title: 'Your team, with roles',
    body: 'Owners, admins and agents, with invitations and a real permission model. Built for a team from the first day rather than added when you outgrow one login.',
  },
  {
    icon: IconShieldLock,
    title: 'Your data, genuinely separated',
    body: 'Separation is enforced by the database on every table, not by application code that has to remember. It is tested automatically on every change, and the test blocks the release when it fails.',
  },
  {
    icon: IconLock,
    title: 'Your credentials, write-only',
    body: 'An API key is shown once, at creation, and never again. Not to us, not to support, not to the person who created it. Rotation replaces a key; it never re-reveals one.',
  },
  {
    icon: IconServer2,
    title: 'Your assistant rules, readable by machines',
    body: 'Set how the assistant should sound, what it should know, and when it should hand over to a person. A change is live through the API within five seconds, measured rather than asserted.',
  },
  {
    icon: IconHistory,
    title: 'A record of everything',
    body: 'Every change is written to an activity log that cannot be edited or deleted by anyone, including us. That includes every time our support team opens your workspace, and why.',
  },
];

export default function MarketingPage() {
  return (
    <div style={{ background: 'var(--surface-page)' }}>
      {/* ── Chrome ────────────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{ background: 'var(--surface-page)', borderColor: 'var(--rule-soft)' }}
      >
        <div
          className="mx-auto flex h-16 items-center gap-4 px-5 md:px-8"
          style={{ maxWidth: 'var(--surface-width)' }}
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-chip focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--focus)]"
          >
            <Mark size={20} />
            <span className="t-chip text-[var(--ink-primary)]">Conduit</span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="quiet" size="md">
              <Link href="/sign-in">Sign in</Link>
            </Button>
            <Button asChild variant="primary" size="md">
              <Link href="/sign-up">Request access</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto px-5 pb-24 md:px-8" style={{ maxWidth: 'var(--surface-width)' }}>
        {/*
          ── Hero ───────────────────────────────────────────────────────

          ⚠ REVAMPED. The tracker's hero read as more considered than this
          one for two nameable reasons rather than a vague polish gap: it
          carried a small TITLE-BLOCK fact row (prepared for, issued, status,
          duration) that gave it the density and specificity of a drafting
          sheet rather than a generic SaaS hero, and it filled the width
          rather than sitting as a lone column of text in a lot of empty
          page. Both are addressed here: the fact row below is the same
          drafting-sheet motif restated in marketing terms, and the schematic
          on the right gives the hero a second thing to look at without
          resorting to a screenshot or a gradient. 03 §20's checklist still
          holds throughout: no gradient, no glass, nothing that counts up.
        */}
        <section className="grid gap-12 pt-16 md:pt-24 lg:grid-cols-[1.05fr_auto] lg:items-center lg:gap-10">
          <div>
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="block h-px w-7"
                style={{ background: 'var(--copper-rule)' }}
              />
              <p className="t-eyebrow text-[var(--copper-ink)]">Customer support platform</p>
            </div>

            <h1 className="t-display mt-6 text-[var(--ink-primary)]" style={{ maxWidth: '17ch' }}>
              One inbox for every message your customers send.
            </h1>

            <p
              className="t-lede mt-7 text-[var(--ink-secondary)]"
              style={{ maxWidth: 'var(--measure-prose)' }}
            >
              WhatsApp, Instagram, Messenger and your website, handled in one place by one team.
              Currently in development.
            </p>

            <dl className="mt-9 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <div>
                <dt className="t-eyebrow text-[var(--ink-tertiary)]">Status</dt>
                <dd className="t-data mt-1.5" style={{ color: 'var(--ochre-ink)' }}>
                  In development
                </dd>
              </div>
              <div>
                <dt className="t-eyebrow text-[var(--ink-tertiary)]">Foundation</dt>
                <dd className="t-data mt-1.5" style={{ color: 'var(--verdigris-ink)' }}>
                  Live
                </dd>
              </div>
              <div>
                <dt className="t-eyebrow text-[var(--ink-tertiary)]">Channels</dt>
                <dd className="t-data mt-1.5 text-[var(--ink-primary)]">Next phase</dd>
              </div>
              <div>
                <dt className="t-eyebrow text-[var(--ink-tertiary)]">Built for</dt>
                <dd className="t-data mt-1.5 text-[var(--ink-primary)]">B2B teams</dd>
              </div>
            </dl>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/sign-up">Request access</Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>

          <div className="hidden justify-self-end lg:block">
            <HeroDiagram />
          </div>
        </section>

        {/* ── The honest status line ──────────────────────────────────── */}
        <section
          className="mt-16 rounded-panel border p-6 md:mt-24 md:p-8"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--rule-soft)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <p className="t-eyebrow text-[var(--ink-tertiary)]">Where this is</p>
          <p
            className="t-lede mt-3 text-[var(--ink-primary)]"
            style={{ maxWidth: 'var(--measure-prose)' }}
          >
            The platform foundation is live. Channel connections arrive in the next phase. If you
            are an early customer, your workspace is already provisioned and you can set up your
            team now.
          </p>
        </section>

        {/* ── Channels ────────────────────────────────────────────────── */}
        <section className="mt-16 md:mt-24">
          <h2 className="t-heading text-[var(--ink-primary)]">Where the messages will come from</h2>
          <p
            className="t-body mt-3 text-[var(--ink-secondary)]"
            style={{ maxWidth: 'var(--measure-prose)' }}
          >
            Four channels, one thread per customer. Connecting them is the focus of the next phase,
            and the platform underneath is built and running now.
          </p>

          <ul className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CHANNELS.map((channel) => (
              <li
                key={channel.name}
                className="rounded-panel border p-5"
                style={{
                  background: 'var(--surface-raised)',
                  borderColor: 'var(--rule-soft)',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <channel.icon
                  size={20}
                  stroke={1.5}
                  aria-hidden
                  className="text-[var(--ink-tertiary)]"
                />
                <p className="t-compact mt-3 text-[var(--ink-primary)]">{channel.name}</p>
                <p className="t-eyebrow mt-2 text-[var(--ink-tertiary)]">{channel.status}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── What is live ────────────────────────────────────────────── */}
        <section className="mt-16 md:mt-24">
          <h2 className="t-heading text-[var(--ink-primary)]">What is already working</h2>
          <p
            className="t-body mt-3 text-[var(--ink-secondary)]"
            style={{ maxWidth: 'var(--measure-prose)' }}
          >
            The layer beneath the inbox, which is the part that has to be right before any message
            arrives.
          </p>

          <ul className="mt-7 grid gap-3 md:grid-cols-2">
            {LIVE_NOW.map((item, index) => (
              <li
                key={item.title}
                className="rounded-panel border p-6"
                style={{
                  background: 'var(--surface-raised)',
                  borderColor: 'var(--rule-soft)',
                  boxShadow: 'var(--shadow-card)',
                  // The last card spans both columns on an odd count, so the
                  // grid does not end on a gap the eye reads as something
                  // missing.
                  gridColumn:
                    index === LIVE_NOW.length - 1 && LIVE_NOW.length % 2 === 1
                      ? 'span 2'
                      : undefined,
                }}
              >
                <item.icon size={20} stroke={1.5} aria-hidden className="text-[var(--copper-ink)]" />
                <h3 className="t-panel mt-3 text-[var(--ink-primary)]">{item.title}</h3>
                <p
                  className="t-compact mt-2 text-[var(--ink-secondary)]"
                  style={{ maxWidth: 'var(--measure-prose)' }}
                >
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* ── The isolation claim, stated plainly ─────────────────────── */}
        <section className="mt-16 md:mt-24">
          <div
            className="rounded-panel border p-6 md:p-10"
            style={{
              background: 'var(--surface-invert)',
              borderColor: 'var(--surface-invert)',
              color: 'var(--ink-inverse)',
            }}
          >
            <p className="t-eyebrow" style={{ color: 'var(--copper-ink)' }}>
              The part that matters
            </p>
            <h2 className="t-heading mt-4" style={{ color: 'var(--ink-inverse)', maxWidth: '24ch' }}>
              You can see every time we look at your workspace.
            </h2>
            <p
              className="t-body mt-5"
              style={{
                color: 'var(--ink-inverse)',
                opacity: 0.78,
                maxWidth: 'var(--measure-prose)',
              }}
            >
              When our support team opens your account, they do it through a scoped session bound by
              exactly the same rules that protect you from every other business on the platform. Not
              a master key. The session is read-only, it expires after thirty minutes, it is written
              to your own activity log with a reason, and you can end it yourself.
            </p>
            <p
              className="t-caption mt-4"
              style={{
                color: 'var(--ink-inverse)',
                opacity: 0.55,
                maxWidth: 'var(--measure-prose)',
              }}
            >
              Very few vendors in this category can say that, which is why it is on this page rather
              than in a document nobody opens.
            </p>
          </div>
        </section>

        {/* ── Close ───────────────────────────────────────────────────── */}
        <section className="mt-16 md:mt-24">
          <h2 className="t-heading text-[var(--ink-primary)]">Set your team up now</h2>
          <p
            className="t-body mt-3 text-[var(--ink-secondary)]"
            style={{ maxWidth: 'var(--measure-prose)' }}
          >
            Your workspace, your team, your credentials and your assistant rules are all live. When
            channels arrive, there is nothing left to configure.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href="/sign-up">Request access</Link>
            </Button>
            <Button asChild variant="quiet" size="lg">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: 'var(--rule-soft)' }}>
        <div
          className="mx-auto flex flex-wrap items-start justify-between gap-8 px-5 py-10 md:px-8"
          style={{ maxWidth: 'var(--surface-width)' }}
        >
          <div className="flex items-center gap-2.5">
            <Mark size={20} />
            <span className="t-chip text-[var(--ink-primary)]">Conduit</span>
          </div>

          <nav aria-label="Legal and status" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link
              className="t-caption text-[var(--ink-tertiary)] hover:text-[var(--copper-ink)]"
              href="/legal/terms"
            >
              Terms of service
            </Link>
            <Link
              className="t-caption text-[var(--ink-tertiary)] hover:text-[var(--copper-ink)]"
              href="/legal/privacy"
            >
              Privacy notice
            </Link>
            {/*
              02 §2. The data processing terms are NOT decoration. The platform
              is a processor for its tenants, who are controllers for their own
              customers, and that relationship needs to exist in writing before
              the first paying customer. A linked page is the cheapest correct
              version of it. 01 D-09.
            */}
            <Link
              className="t-caption text-[var(--ink-tertiary)] hover:text-[var(--copper-ink)]"
              href="/legal/dpa"
            >
              Data processing terms
            </Link>
            <Link
              className="t-caption text-[var(--ink-tertiary)] hover:text-[var(--copper-ink)]"
              href="/status"
            >
              Status
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
