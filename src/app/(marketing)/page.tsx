import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  IconBrandWhatsappFilled,
  IconBuildingSkyscraper,
  IconMessageFilled,
  IconServer2,
  IconShieldLock,
  IconArrowRight,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { Button } from '@/components/primitives/Button';
import { FloatingHeader } from '@/components/marketing/FloatingHeader';
import { HeroInteractiveConsole } from '@/components/marketing/HeroInteractiveConsole';
import { InteractiveFeatures } from '@/components/marketing/InteractiveFeatures';
import { ChannelsSection } from '@/components/marketing/ChannelsSection';
import { GsapScrollRevealer } from '@/components/structure/GsapScrollRevealer';
import { SubtleArchitecturalBackground } from '@/components/marketing/SubtleArchitecturalBackground';

const TENANT_COOKIE = process.env.SESSION_COOKIE_TENANT ?? 'aLcassa_tenant_session';
const PLATFORM_COOKIE = process.env.SESSION_COOKIE_PLATFORM ?? 'aLcassa_platform_session';

export const metadata: Metadata = {
  title: { absolute: 'One inbox for every message your customers send · aLcassa' },
  description:
    'WhatsApp, Instagram, Messenger and website chat, handled in one place by one team. Multi-tenant customer support platform.',
};

/*
 * ⚠ HOW COLOUR IS SPENT ON THIS PAGE, because "use the brand blue" taken
 * literally produces a page that is entirely blue, which this one was.
 *
 * The aLcassa palette has exactly one warm colour in it. If blue carries every
 * eyebrow, every hairline, every icon and every action, the only hue on screen
 * is blue and the page reads as monotone — technically on-brand and visually
 * flat. The moodboard itself does not work that way: it sets its own body text
 * in the QUIET blue, keeps the saturated blue for marks, and lets the warm
 * accent punctuate.
 *
 * So the four roles are split by JOB rather than by importance:
 *
 *   BLUE     is reserved for things that DO something. Buttons, links, the
 *            diagram's flow and its core node, the footer nav headers. If it
 *            is blue and you cannot click it, it is a bug.
 *   NAVY/INK carries all the reading: eyebrows, headings, body, watermarks.
 *            This is the largest surface and it is deliberately not blue-500.
 *   ORANGE   punctuates. Section hairlines, the one speed claim, one ticker
 *            dot, and the ambient wash on the right. Small marks, spread thin.
 *   GREEN    is status, and only status. Operational badges and the isolation
 *            dot, where a colour genuinely means "passing".
 *
 * ⚠ ON THE ACCENT BUDGET. 03 §4a says one orange moment per SCREEN. This page
 * exceeds a literal per-document reading of that and does not exceed a
 * per-viewport one: the hairline marks are ~7px each, no two orange elements
 * are ever in view together at desktop height, and the alternative — routing
 * them through blue — is what produced the monotone version. Recorded as a
 * deliberate marketing-surface divergence in 15-spec-delta B5.
 */

export default async function MarketingPage() {
  const cookieStore = await cookies();
  const hasPlatformSession = cookieStore.has(PLATFORM_COOKIE);
  const hasTenantSession = cookieStore.has(TENANT_COOKIE);
  const isAuthenticated = Boolean(hasPlatformSession || hasTenantSession);
  const dashboardHref = hasPlatformSession ? '/platform' : hasTenantSession ? '/app' : '/platform';
  const dashboardLabel = hasPlatformSession ? 'Platform Console' : 'Workspace Inbox';
  const session = { isAuthenticated, dashboardHref, dashboardLabel };

  return (
    <div
      style={{ background: 'var(--surface-base)' }}
      className="relative min-h-screen overflow-x-hidden"
    >
      {/* ── Full-bleed subtle architectural background texture ── */}
      <SubtleArchitecturalBackground />

      <FloatingHeader session={session} />

      <GsapScrollRevealer>
        <main
          id="main"
          className="relative z-10 mx-auto w-full max-w-[1280px] px-5 pt-12 pb-32 md:px-8"
        >
          {/* ── Hero. Centered Editorial Architecture with Interactive Workspace Demo Below ── */}
        <section
          id="overview"
          className="relative mx-auto flex w-full max-w-[1180px] flex-col items-center justify-center pt-8 text-center md:pt-14"
        >
          {/* Eyebrow status indicator (clean inline, solid non-blinking indicator) */}
          <div
            className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-widest text-[var(--orange-500)]"
          >
            <span className="size-2 rounded-full bg-[var(--orange-500)]" />
            <span className="font-semibold">
              UNIFIED CUSTOMER INBOX PLATFORM
            </span>
          </div>

          {/* Centered Editorial Headline */}
          <h1
            className="display mx-auto mt-6 max-w-[940px] text-[46px] leading-[1.04] font-medium tracking-tight text-[var(--text-primary)] sm:text-[58px] md:text-[68px] lg:text-[76px]"
          >
            One inbox for every message
            <br className="hidden sm:inline" /> your customers send.
          </h1>

          {/* Centered Lede (Client-Facing, Value-Oriented) */}
          <p
            className="t-lede mx-auto mt-6 max-w-[660px] text-[17px] leading-[1.65] text-[var(--text-secondary)] sm:text-[19px]"
          >
            Unify WhatsApp, Instagram, Messenger, and live website chat into one intelligent workspace. Delight your customers with instant AI-powered resolutions and enterprise data isolation.
          </p>

          {/* Centered CTAs */}
          {isAuthenticated ? (
            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-3.5"
            >
              <Button asChild variant="primary" size="lg">
                <Link href={dashboardHref} className="gap-2 shadow-sm">
                  <IconShieldLock size={17} stroke={1.5} />
                  Go to {dashboardLabel} <IconArrowRight size={16} stroke={1.5} />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/platform/tenants" className="gap-2">
                  <IconBuildingSkyscraper size={16} stroke={1.5} />
                  Manage Workspaces
                </Link>
              </Button>
            </div>
          ) : (
            <div
              className="mt-8 flex flex-wrap items-center justify-center gap-3.5"
            >
              <Button asChild variant="primary" size="lg">
                <Link href="/sign-up" className="gap-2 shadow-sm">
                  Request access <IconArrowRight size={16} stroke={1.5} />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg">
                <Link href="/sign-in">Sign in</Link>
              </Button>
            </div>
          )}

          {/* Interactive Live Multi-Channel Studio Console Centered Directly Below CTAs */}
          <div className="w-full mt-10 mb-12">
            <HeroInteractiveConsole />
          </div>

          {/* Stats Numerals Bento Strip (Positioned Below Console) */}
          <div
            className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 border-y border-[var(--ink-200)] py-8 w-full max-w-[1200px]"
          >
            <div className="flex flex-col items-center justify-center text-center">
              <span className="display text-[40px] sm:text-[48px] font-medium leading-none tracking-tight text-[var(--text-primary)]">
                100%
              </span>
              <span className="mt-2 font-mono text-[11.5px] uppercase tracking-wider text-[var(--text-tertiary)]">
                PostgreSQL RLS Isolation
              </span>
              <span className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Strict tenant_id boundary segregation
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center sm:border-x sm:border-[var(--ink-200)] sm:px-6">
              <span className="display text-[40px] sm:text-[48px] font-medium leading-none tracking-tight text-[var(--orange-500)]">
                &lt; 5s
              </span>
              <span className="mt-2 font-mono text-[11.5px] uppercase tracking-wider text-[var(--text-tertiary)]">
                AI Rule Propagation
              </span>
              <span className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Machine-readable rule engine cache
              </span>
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <span className="display text-[40px] sm:text-[48px] font-medium leading-none tracking-tight text-[var(--green-500)]">
                0
              </span>
              <span className="mt-2 font-mono text-[11.5px] uppercase tracking-wider text-[var(--text-tertiary)]">
                Master Key Vulnerabilities
              </span>
              <span className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                Scoped Argon2id tenant API credentials
              </span>
            </div>
          </div>
        </section>

        {/* ── Live Engineering Capabilities ────────────────────────────── */}
        <section id="live-engine" className="gsap-scroll-item mt-20 md:mt-28">
          <InteractiveFeatures />
        </section>

        {/* ── Omnichannel Hub ──────────────────────────────────────────── */}
        <section id="channels" className="gsap-scroll-item mt-20 md:mt-32">
          <ChannelsSection />
        </section>

        </main>
      </GsapScrollRevealer>

      {/* ── Unified Closing CTA & Footer Architectural Block ──────────── */}
      <footer
        className="relative overflow-hidden border-t mt-20 md:mt-32"
        style={{
          borderColor: 'var(--border-strong)',
          background: 'var(--surface-base)',
        }}
      >
        {/* Subtle full-bleed architectural grid background */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]">
          <svg width="100%" height="100%" aria-hidden="true">
            <pattern id="unified-footer-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="1"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#unified-footer-grid)" />
          </svg>
        </div>

        {/* Refined Floating Background Telemetry Icons (Framing CTA & Footer) */}
        <div className="pointer-events-none absolute top-10 -left-12 hidden -rotate-12 text-emerald-600/[0.045] lg:block select-none" aria-hidden="true">
          <IconBrandWhatsappFilled size={320} stroke={1} />
        </div>
        <div className="pointer-events-none absolute top-14 -right-12 hidden rotate-12 text-blue-600/[0.045] lg:block select-none" aria-hidden="true">
          <IconMessageFilled size={290} stroke={1} />
        </div>
        <div className="pointer-events-none absolute -bottom-6 right-16 hidden -rotate-6 text-slate-800/[0.035] lg:block select-none" aria-hidden="true">
          <IconServer2 size={270} stroke={1} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1280px] px-5 pt-20 pb-12 md:px-8 md:pt-28 md:pb-16">
          
          {/* ── 1. Centered Closing Call to Action ── */}
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            
            {/* Eyebrow status indicator */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50/60 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-emerald-700">
              <span
                className="size-2 animate-pulse rounded-full bg-[var(--green-500)]"
                aria-hidden="true"
              />
              <span className="font-semibold">
                Provisioning ready · Core engine online
              </span>
            </div>

            {/* Editorial Headline */}
            <h2 className="display text-[38px] sm:text-[50px] md:text-[60px] font-medium leading-[1.08] tracking-tight text-[var(--text-primary)]">
              Set your team up now
            </h2>

            {/* Lede Prose */}
            <p className="t-lede mt-4 max-w-[620px] text-[16px] sm:text-[17.5px] leading-relaxed text-[var(--text-secondary)]">
              Your workspace, your team, your credentials and your assistant rules are all live.
              When channels arrive, there is nothing left to configure.
            </p>

            {/* Interactive Actions */}
            {isAuthenticated ? (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                <Button asChild variant="primary" size="lg">
                  <Link href={dashboardHref} className="gap-2 shadow-sm">
                    <IconShieldLock size={17} stroke={1.5} />
                    Return to {dashboardLabel} <IconArrowRight size={16} stroke={1.5} />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/platform/support-sessions">Support Sessions</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
                <Button asChild variant="primary" size="lg">
                  <Link href="/sign-up" className="gap-2 shadow-sm">
                    Request access <IconArrowRight size={16} stroke={1.5} />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </div>
            )}

            {/* Spec Ticker */}
            <div className="font-mono text-[11px] mt-10 flex flex-wrap justify-center gap-6 sm:gap-10 border-t border-[var(--border-subtle)] pt-6 text-[var(--text-tertiary)] w-full max-w-xl">
              <span className="flex items-center gap-2">
                <span
                  className="size-1.5 rounded-full bg-[var(--green-500)]"
                  aria-hidden="true"
                />
                Row-Level Isolated
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="size-1.5 rounded-full bg-[var(--orange-500)]"
                  aria-hidden="true"
                />
                Argon2 Hashed
              </span>
              <span className="flex items-center gap-2">
                <span
                  className="size-1.5 rounded-full bg-[var(--blue-500)]"
                  aria-hidden="true"
                />
                &lt;5s Propagation
              </span>
            </div>
          </div>

          {/* ── 2. Subtle Architectural Divider ── */}
          <div className="my-16 sm:my-20 border-t border-[var(--border-subtle)] w-full" />

          {/* ── 3. Footer Navigation Grid ── */}
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center gap-3">
                <Mark size={26} />
                <div>
                  <span className="t-panel text-[18px] font-semibold text-[var(--text-primary)]">
                    aLcassa
                  </span>
                  <p className="t-caption text-[12px] text-[var(--text-tertiary)]">
                    Multi-tenant customer support engine
                  </p>
                </div>
              </div>
              <p className="t-compact max-w-sm text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
                Architected for strict database tenant isolation, machine-readable assistant rules,
                and zero master key vulnerability.
              </p>
              <div
                className="t-eyebrow inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 px-2.5 py-1 text-[11px] font-mono text-[var(--green-600)]"
              >
                <span
                  className="size-1.5 animate-pulse rounded-full bg-[var(--green-500)]"
                  aria-hidden="true"
                />
                <span>System operational</span>
              </div>
            </div>

            <FooterColumn
              heading="Platform"
              links={[
                { href: '#overview', label: 'Hero overview' },
                { href: '#live-engine', label: 'Live engine' },
                { href: '#channels', label: 'Channels' },
                { href: '#channels', label: 'Security model' },
              ]}
            />

            <div className="space-y-3">
              <div className="t-eyebrow font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-action)]">
                Architecture
              </div>
              <ul className="t-compact space-y-2 text-[13px] text-[var(--text-secondary)]">
                <li>Postgres RLS policy</li>
                <li>Argon2 key hashing</li>
                <li>Multi-tenant RBAC</li>
                <li>Append-only audit</li>
              </ul>
            </div>

            <FooterColumn
              heading="Legal & status"
              links={[
                { href: '/legal/terms', label: 'Terms of service' },
                { href: '/legal/privacy', label: 'Privacy notice' },
                { href: '/legal/dpa', label: 'Data processing (DPA)' },
                { href: '/status', label: 'System status' },
              ]}
            />
          </div>

          {/* ── 4. Sub-Footer Bar ── */}
          <div
            className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="t-eyebrow font-mono text-[11px] flex items-center gap-2 text-[var(--text-tertiary)]"
            >
              <span>© 2026 Andishi</span>
              <span>·</span>
              <span>Northern Bypass, Nairobi</span>
            </div>
            <div
              className="t-micro font-mono text-[11px] flex items-center gap-4 text-[var(--text-disabled)]"
            >
              <span>Version 1.0.0-beta</span>
              <span>·</span>
              <span>Isolated tenancy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({
  heading,
  links,
}: {
  heading: string;
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <div className="space-y-3">
      {/* Blue, because every item under it navigates. */}
      <div className="t-eyebrow" style={{ color: 'var(--text-action)' }}>
        {heading}
      </div>
      <ul className="t-compact space-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="transition-colors hover:text-[var(--text-action)]"
              style={{ color: 'var(--text-secondary)' }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
