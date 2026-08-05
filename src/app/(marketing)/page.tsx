import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconMessage,
  IconArrowRight,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { Button } from '@/components/primitives/Button';
import { FloatingHeader } from '@/components/marketing/FloatingHeader';
import { HeroDiagram } from '@/components/marketing/HeroDiagram';
import { InteractiveFeatures } from '@/components/marketing/InteractiveFeatures';
import { SecuritySection } from '@/components/marketing/SecuritySection';
import { LiveSpecPlayground } from '@/components/marketing/LiveSpecPlayground';
import { getThemePreference, resolveTheme } from '@/lib/theme';

export const metadata: Metadata = {
  title: { absolute: 'One inbox for every message your customers send · Conduit' },
  description:
    'WhatsApp, Instagram, Messenger and website chat, handled in one place by one team. Multi-tenant customer support platform foundation.',
};

const CHANNELS: Array<{ icon: TablerIcon; name: string; status: string; description: string }> = [
  {
    icon: IconBrandWhatsapp,
    name: 'WhatsApp Business',
    status: 'Coming soon',
    description: 'Direct Cloud API integration with automatic conversation routing.',
  },
  {
    icon: IconBrandInstagram,
    name: 'Instagram Direct',
    status: 'Coming soon',
    description: 'Handle customer DMs and story replies right alongside website chat.',
  },
  {
    icon: IconBrandMessenger,
    name: 'Facebook Messenger',
    status: 'Coming soon',
    description: 'Page messaging support with rich media and structured responses.',
  },
  {
    icon: IconMessage,
    name: 'Website Chat Widget',
    status: 'Coming soon',
    description: 'Embeddable web chat snippet with real-time WebSocket connection.',
  },
];

export default async function MarketingPage() {
  const theme = await resolveTheme(await getThemePreference());

  return (
    <div style={{ background: 'var(--surface-page)' }} className="min-h-screen">
      {/* ── Fixed Top Header Navigation (No Floating Gap) ───────────── */}
      <FloatingHeader theme={theme} />

      <main id="main" className="mx-auto px-5 pb-32 md:px-8" style={{ maxWidth: '1280px' }}>
        {/* ── Hero Section (Diagram on Left, Copy Text on Right) ─────── */}
        <section id="overview" className="grid gap-12 pt-10 md:pt-26 lg:grid-cols-[520px_1fr] lg:items-center lg:gap-14">
          {/* Left Column: Living Node Network Diagram */}
          <div className="hidden justify-self-start lg:block">
            <HeroDiagram />
          </div>

          {/* Right Column: Hero Copy & Specification Block */}
          <div>
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="block h-px w-7"
                style={{ background: 'var(--copper-rule)' }}
              />
              {/*
                ⚠ "Phase 1" removed, and the same edit applies everywhere on
                this surface. Phase numbers are DELIVERY vocabulary: they mean
                something to Andishi and to the client reading the tracker,
                and nothing at all to a business owner deciding whether to
                sign up. Worse, "Phase 1" reads as unfinished in a way the
                product is not: the platform genuinely works.

                What must survive the edit is the HONESTY, not the jargon.
                01 D-05 and 10 §2 require this page never to imply a working
                inbox. It still does not: "Currently in development" stays in
                the lede, the status panel stays, and each channel is marked
                "Coming soon" rather than "Phase 2". Customer language,
                identical claim.
              */}
              <p className="t-eyebrow text-[var(--copper-ink)]">Customer support platform</p>
            </div>

            <h1 className="t-display mt-5 text-[var(--ink-primary)]">
              One inbox for every message your customers send.
            </h1>

            <p className="t-lede mt-5 text-[var(--ink-secondary)]" style={{ maxWidth: 'var(--measure-prose)' }}>
              WhatsApp, Instagram, Messenger and your website, handled in one place by one team.
              Currently in development.
            </p>

            {/* Action CTA Group */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/sign-up" className="gap-2">
                  Request access <IconArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>

            {/* Metrics Counters Row (Uncarded, hairline border top) */}
            <div className="mt-10 grid grid-cols-3 gap-6 border-t pt-6" style={{ borderColor: 'var(--rule-soft)' }}>
              <div>
                <div className="t-display text-[var(--ink-primary)]">100%</div>
                <div className="t-eyebrow mt-1 text-[var(--ink-tertiary)]">Database Isolation</div>
              </div>
              <div>
                <div className="t-display text-[var(--copper-ink)]">&lt; 5s</div>
                <div className="t-eyebrow mt-1 text-[var(--ink-tertiary)]">AI Rule Propagation</div>
              </div>
              <div>
                <div className="t-display text-[var(--verdigris-ink)]">0</div>
                <div className="t-eyebrow mt-1 text-[var(--ink-tertiary)]">Master Key Vulnerabilities</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Development Status Line (Uncarded, Clean Borderless) ─────── */}
        <section className="mt-16 md:mt-24 border-y py-6" style={{ borderColor: 'var(--rule-soft)' }}>
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ochre-solid)] opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--ochre-solid)]" />
            </span>
            <p className="t-eyebrow text-[var(--ink-tertiary)]">Where this is today</p>
          </div>
          <p className="t-lede mt-3 text-[var(--ink-primary)]" style={{ maxWidth: 'var(--measure-prose)' }}>
            The platform underneath is live and running. Channel connections are what we are
            building next. If you are an early customer, your workspace is already provisioned and
            you can set your team up now.
          </p>
        </section>

        {/* ── Live Capabilities Section ────────────────────────────────── */}
        <section id="live-engine" className="mt-20 md:mt-32">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-3">
              <span aria-hidden className="block h-px w-7" style={{ background: 'var(--copper-rule)' }} />
              <p className="t-eyebrow text-[var(--copper-ink)]">Live Capabilities</p>
            </div>
            <h2 className="t-heading mt-3 text-[var(--ink-primary)]">What is already working</h2>
            <p className="t-body mt-2 text-[var(--ink-secondary)]" style={{ maxWidth: 'var(--measure-prose)' }}>
              The infrastructure layer beneath the inbox, which is the part that has to be right before any message arrives.
            </p>
          </div>

          <InteractiveFeatures />
        </section>

        {/* ── Channels Section (Uncarded 4-Column Drafting Specs Layout) ─ */}
        <section id="channels" className="mt-20 md:mt-32">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-3">
              <span aria-hidden className="block h-px w-7" style={{ background: 'var(--copper-rule)' }} />
              <p className="t-eyebrow text-[var(--copper-ink)]">Channels</p>
            </div>
            <h2 className="t-heading mt-3 text-[var(--ink-primary)]">Where the messages will come from</h2>
            <p className="t-body mt-2 text-[var(--ink-secondary)]" style={{ maxWidth: 'var(--measure-prose)' }}>
              Four channels, one thread per customer. Connecting them is what we are building next.
              The platform underneath is built and running now.
            </p>
          </div>

          {/* Uncarded Column Grid with vertical hairline rules */}
          <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 border-t pt-8" style={{ borderColor: 'var(--rule-soft)' }}>
            {CHANNELS.map((channel, idx) => (
              <li
                key={channel.name}
                className={`flex flex-col justify-between ${
                  idx > 0 ? 'lg:border-l lg:border-[var(--rule-soft)] lg:pl-8' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <channel.icon size={22} stroke={1.5} className="text-[var(--copper-ink)]" />
                    <span className="t-eyebrow text-[var(--ink-tertiary)]">{channel.status}</span>
                  </div>
                  <h3 className="t-panel mt-4 text-[var(--ink-primary)]">{channel.name}</h3>
                  <p className="t-compact mt-2 text-[var(--ink-secondary)]">{channel.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Security & Isolation Section ────────────────────────────── */}
        <div id="security">
          <SecuritySection />
        </div>

        {/* ── Interactive Spec Playground Section ──────────────────────── */}
        <LiveSpecPlayground />

        {/* ── Final Call to Action (Uncarded, Clean Section) ────────────── */}
        <section className="mt-24 md:mt-36 border-t pt-16" style={{ borderColor: 'var(--rule-soft)' }}>
          <div className="flex flex-col items-center text-center">
            <h2 className="t-heading text-[var(--ink-primary)]">Set your team up now</h2>
            <p className="t-body mt-4 text-[var(--ink-secondary)]" style={{ maxWidth: 'var(--measure-prose)' }}>
              Your workspace, your team, your credentials and your assistant rules are all live. When
              channels arrive, there is nothing left to configure.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href="/sign-up" className="gap-2">
                  Request access <IconArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild variant="quiet" size="lg">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t" style={{ borderColor: 'var(--rule-soft)' }}>
        <div className="mx-auto px-5 py-12 md:px-8" style={{ maxWidth: '1280px' }}>
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div className="flex items-center gap-3">
              <Mark size={22} />
              <div>
                <span className="t-chip text-[var(--ink-primary)]">Conduit</span>
                <p className="t-caption text-[var(--ink-tertiary)]">Multi-Tenant Customer Support Engine</p>
              </div>
            </div>

            <nav aria-label="Legal and status" className="flex flex-wrap gap-x-8 gap-y-2">
              <Link className="t-caption text-[var(--ink-tertiary)] hover:text-[var(--copper-ink)]" href="/legal/terms">
                Terms of service
              </Link>
              <Link className="t-caption text-[var(--ink-tertiary)] hover:text-[var(--copper-ink)]" href="/legal/privacy">
                Privacy notice
              </Link>
              <Link className="t-caption text-[var(--ink-tertiary)] hover:text-[var(--copper-ink)]" href="/legal/dpa">
                Data processing terms
              </Link>
              <Link className="t-caption text-[var(--ink-tertiary)] hover:text-[var(--copper-ink)]" href="/status">
                Status
              </Link>
            </nav>
          </div>

          <div
            className="mt-10 flex flex-wrap items-baseline justify-between gap-4 border-t pt-6"
            style={{ borderColor: 'var(--rule-soft)' }}
          >
            <span className="t-eyebrow text-[var(--ink-tertiary)]">
              Andishi · Northern Bypass, Nairobi
            </span>
            <span className="t-caption text-[var(--ink-faint)]">
              Currently in development. Channel connections are coming.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
