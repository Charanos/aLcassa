import Link from 'next/link';
import type { Metadata } from 'next';
import {
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconMessage,
  IconArrowRight,
  IconServer2,
  type Icon as TablerIcon,
  IconBrandWhatsappFilled,
  IconMessageFilled,
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
    <div style={{ background: 'var(--surface-page)' }} className="relative min-h-screen overflow-x-hidden">
      {/* ── True Edge-to-Edge Full Bleed Background Artwork ── */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[780px] w-full overflow-hidden"
        aria-hidden="true"
      >
        {/* Ambient Radial Color Washes (Verdigris & Copper Tints) */}
        <div
          className="absolute -left-20 top-10 size-[600px] rounded-full blur-3xl opacity-30 dark:opacity-20"
          style={{ background: 'radial-gradient(circle, var(--verdigris-tint) 0%, transparent 70%)' }}
        />
        <div
          className="absolute right-0 top-10 size-[700px] rounded-full blur-3xl opacity-25 dark:opacity-15"
          style={{ background: 'radial-gradient(circle, var(--copper-tint) 0%, transparent 70%)' }}
        />

        {/* Blueprint Grid Vector Layer */}
        <svg
          className="absolute inset-0 h-full w-full stroke-[var(--rule-soft)] opacity-35 dark:opacity-25"
          aria-hidden="true"
        >
          <defs>
            <pattern id="fullbleed-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" strokeWidth="0.75" />
              <circle cx="48" cy="48" r="1.5" fill="var(--copper-rule)" opacity="0.5" />
            </pattern>
            <pattern id="crosshatch" width="96" height="96" patternUnits="userSpaceOnUse">
              <path d="M 0 96 L 96 0 M 0 0 L 96 96" fill="none" stroke="var(--rule-soft)" strokeWidth="0.5" strokeDasharray="3 6" opacity="0.3" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fullbleed-grid)" />
          <rect width="100%" height="100%" fill="url(#crosshatch)" opacity="0.25" />
        </svg>

        {/* 2 Widely Distributed Iconography Watermarks (Visible on desktop lg screens only, anchored to outer margins) */}
        <div className="hidden lg:block absolute -top-6 -left-20 text-[var(--slate-ink)] opacity-[0.06] dark:opacity-[0.08] transform -rotate-12">
          <IconServer2 size={320} stroke={0.75} />
        </div>
        <div className="hidden md:block absolute top-[5%] -right-20 text-[var(--copper-ink)] opacity-[0.06] dark:opacity-[0.08] transform rotate-12">
          <IconMessage size={460} stroke={0.75} />
        </div>
        <div className="hidden md:block absolute -bottom-20 right-[60%] text-[var(--verdigris-ink)] opacity-[0.05] dark:opacity-[0.07] transform rotate-10">
          <IconBrandWhatsapp size={480} stroke={0.75} />
        </div>
      </div>

      {/* ── Fixed Top Header Navigation (No Floating Gap) ───────────── */}
      <FloatingHeader theme={theme} />

      <main id="main" className="relative z-10 mx-auto px-5 pt-20 pb-32 md:px-8" style={{ maxWidth: '1280px' }}>
        {/* ── Hero Section (Diagram on Left, Copy Text on Right) ─────── */}
        <section id="overview" className="relative grid gap-12 pt-12 md:pt-28 lg:grid-cols-[520px_1fr] lg:items-center lg:gap-14">

          {/* Left Column: Living Node Network Diagram (Hidden on mobile/tablet, visible on lg) */}
          <div className="hidden lg:flex relative z-10 justify-self-start w-full overflow-hidden justify-center" style={{ maxWidth: '520px', height: '430px' }}>
            <HeroDiagram />
          </div>

          {/* Right Column: Hero Copy & Specification Block */}
          <div className="relative z-10 animate-hero-reveal" style={{ animationDelay: '100ms' }}>
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
            <div className="mt-8 flex flex-wrap items-center gap-3 animate-hero-reveal" style={{ animationDelay: '250ms' }}>
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

        {/* ── Development Status Line (Clean Uncarded Layout) ─────── */}
        <section className="mt-16 md:mt-24 border-y py-6 relative overflow-hidden" style={{ borderColor: 'var(--rule-strong)' }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--ochre-solid)] opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-[var(--ochre-solid)]" />
                </span>
                <p className="t-eyebrow text-[var(--copper-ink)]">Where this is today</p>
              </div>
              <p className="t-lede mt-3 text-[var(--ink-primary)]" style={{ maxWidth: 'var(--measure-prose)' }}>
                The platform underneath is live and running. Channel connections are what we are
                building next. If you are an early customer, your workspace is already provisioned and
                you can set your team up now.
              </p>
            </div>

            {/* Quick Spec Metadata Badge */}
            <div className="flex items-center gap-4 border-l pl-6 border-[var(--rule-soft)] hidden lg:flex">
              <div>
                <div className="t-eyebrow text-[var(--ink-tertiary)]">Architecture</div>
                <div className="t-compact text-[var(--ink-primary)] mt-0.5">Isolated Row-Level</div>
              </div>
              <div>
                <div className="t-eyebrow text-[var(--ink-tertiary)]">AI Engine</div>
                <div className="t-compact text-[var(--verdigris-ink)] mt-0.5">Machine-Readable</div>
              </div>
            </div>
          </div>
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
                className={`flex flex-col justify-between ${idx > 0 ? 'lg:border-l lg:border-[var(--rule-soft)] lg:pl-8' : ''
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

        {/* ── Final Call to Action (Technical Blueprint CTA Block with Visible Background Artwork) ────────────── */}
        <section className="mt-28 md:mt-40 border-t py-20 relative overflow-hidden bg-gradient-to-b from-transparent via-[var(--surface-sunken)]/60 to-transparent" style={{ borderColor: 'var(--rule-strong)' }}>
          {/* Ambient Background Radial Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl h-64 bg-[radial-gradient(ellipse_at_center,var(--copper-tint)_0%,transparent_70%)] opacity-60 blur-3xl pointer-events-none" />

          {/* Visible Background Artwork Icons (Desktop) */}
          <div className="hidden lg:block absolute top-6 -left-12 text-[var(--verdigris-ink)] opacity-[0.08] dark:opacity-[0.1] pointer-events-none transform -rotate-12">
            <IconBrandWhatsappFilled size={280} stroke={0.75} />
          </div>
          <div className="hidden lg:block absolute top-6 -right-12 text-[var(--copper-ink)] opacity-[0.08] dark:opacity-[0.1] pointer-events-none transform rotate-12">
            <IconMessageFilled size={260} stroke={0.75} />
          </div>

          <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto px-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="size-2 rounded-full bg-[var(--verdigris-solid)] animate-pulse" />
              <span className="t-eyebrow text-[var(--copper-ink)] font-mono">PROVISIONING READY · CORE ENGINE ONLINE</span>
            </div>

            <h2 className="t-display text-[var(--ink-primary)]">Set your team up now</h2>
            <p className="t-lede mt-4 text-[var(--ink-secondary)]" style={{ maxWidth: 'var(--measure-prose)' }}>
              Your workspace, your team, your credentials and your assistant rules are all live. When
              channels arrive, there is nothing left to configure.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Button asChild variant="primary" size="lg">
                <Link href="/sign-up" className="gap-2">
                  Request access <IconArrowRight size={16} />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>

            {/* Spec Ticker Pills Below CTA */}
            <div className="mt-10 flex flex-wrap justify-center gap-6 border-t pt-6 text-[var(--ink-tertiary)] t-micro" style={{ borderColor: 'var(--rule-soft)' }}>
              <span className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-[var(--verdigris-solid)]" /> ROW-LEVEL ISOLATED</span>
              <span className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-[var(--ochre-solid)]" /> ARGON2 HASHED</span>
              <span className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-[var(--copper-solid)]" /> &lt;5S PROPAGATION</span>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t relative overflow-hidden" style={{ borderColor: 'var(--copper-rule)' }}>
        {/* Footer Background Blueprint Pattern & Watermark Artwork */}
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none">
          <svg width="100%" height="100%">
            <pattern id="footer-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M 32 0 L 0 0 0 32" fill="none" stroke="var(--rule-strong)" strokeWidth="1" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#footer-grid)" />
          </svg>
        </div>

        {/* Footer Corner Watermark Artwork */}
        <div className="hidden lg:block absolute bottom-2 right-8 text-[var(--copper-ink)] opacity-[0.07] dark:opacity-[0.09] pointer-events-none transform -rotate-12">
          <IconServer2 size={240} stroke={0.75} />
        </div>

        <div className="relative z-10 mx-auto px-5 py-16 md:px-8" style={{ maxWidth: '1280px' }}>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {/* Column 1: Brand & Status Identity */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <Mark size={26} />
                <div>
                  <span className="t-title text-[var(--ink-primary)] tracking-wide">CONDUIT</span>
                  <p className="t-caption text-[var(--ink-tertiary)]">Multi-Tenant Customer Support Engine</p>
                </div>
              </div>
              <p className="t-compact text-[var(--ink-secondary)] max-w-sm">
                Architected for strict database tenant isolation, machine-readable assistant rules, and zero master key vulnerability.
              </p>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-chip bg-[var(--verdigris-tint)] border border-[var(--verdigris-rule)] t-eyebrow text-[var(--verdigris-ink)]">
                <span className="size-1.5 rounded-full bg-[var(--verdigris-solid)] animate-pulse" />
                <span>SYSTEM OPERATIONAL</span>
              </div>
            </div>

            {/* Column 2: Platform */}
            <div className="space-y-3">
              <div className="t-eyebrow text-[var(--copper-ink)]">PLATFORM</div>
              <ul className="space-y-2 t-compact">
                <li><Link href="#overview" className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">Hero Overview</Link></li>
                <li><Link href="#live-engine" className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">Live Engine</Link></li>
                <li><Link href="#channels" className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">Channels</Link></li>
                <li><Link href="#security" className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">Security Model</Link></li>
              </ul>
            </div>

            {/* Column 3: Architecture */}
            <div className="space-y-3">
              <div className="t-eyebrow text-[var(--copper-ink)]">ARCHITECTURE</div>
              <ul className="space-y-2 t-compact text-[var(--ink-secondary)]">
                <li>Postgres RLS Policy</li>
                <li>Argon2 Key Hashing</li>
                <li>Multi-Tenant RBAC</li>
                <li>Append-Only Audit</li>
              </ul>
            </div>

            {/* Column 4: Legal & Status */}
            <div className="space-y-3">
              <div className="t-eyebrow text-[var(--copper-ink)]">LEGAL &amp; STATUS</div>
              <ul className="space-y-2 t-compact">
                <li><Link href="/legal/terms" className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">Terms of Service</Link></li>
                <li><Link href="/legal/privacy" className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">Privacy Notice</Link></li>
                <li><Link href="/legal/dpa" className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">Data Processing (DPA)</Link></li>
                <li><Link href="/status" className="text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition-colors">System Status</Link></li>
              </ul>
            </div>
          </div>

          {/* Sub-Footer Copyright Bar */}
          <div
            className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
            style={{ borderColor: 'var(--rule-soft)' }}
          >
            <div className="flex items-center gap-2 t-eyebrow text-[var(--ink-tertiary)]">
              <span>© 2026 Andishi</span>
              <span>·</span>
              <span>Northern Bypass, Nairobi</span>
            </div>
            <div className="flex items-center gap-4 t-micro text-[var(--ink-faint)] font-mono">
              <span>VERSION 1.0.0-BETA</span>
              <span>·</span>
              <span>ISOLATED TENANCY</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
