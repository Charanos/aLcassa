import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import {
  IconBrandInstagram,
  IconBrandMessenger,
  IconBrandWhatsapp,
  IconBrandWhatsappFilled,
  IconBuildingSkyscraper,
  IconMessage,
  IconMessageFilled,
  IconServer2,
  IconShieldLock,
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

const TENANT_COOKIE = process.env.SESSION_COOKIE_TENANT ?? 'conduit_tenant_session';
const PLATFORM_COOKIE = process.env.SESSION_COOKIE_PLATFORM ?? 'conduit_platform_session';

export const metadata: Metadata = {
  title: { absolute: 'One inbox for every message your customers send · aLcassa' },
  description:
    'WhatsApp, Instagram, Messenger and website chat, handled in one place by one team. Multi-tenant customer support platform.',
};

const CHANNELS: Array<{ 
  icon: TablerIcon; 
  name: string; 
  status: string; 
  description: string;
  iconColorClass: string;
  iconBgClass: string;
}> = [
  {
    icon: IconBrandWhatsapp,
    name: 'WhatsApp Business',
    status: 'Coming soon',
    description: 'Direct Cloud API integration with automatic conversation routing.',
    iconColorClass: 'text-emerald-600 dark:text-emerald-400',
    iconBgClass: 'bg-emerald-50 border-emerald-200/60 dark:bg-emerald-500/15 dark:border-emerald-500/30',
  },
  {
    icon: IconBrandInstagram,
    name: 'Instagram Direct',
    status: 'Coming soon',
    description: 'Handle customer DMs and story replies right alongside website chat.',
    iconColorClass: 'text-rose-600 dark:text-rose-400',
    iconBgClass: 'bg-rose-50 border-rose-200/60 dark:bg-rose-500/15 dark:border-rose-500/30',
  },
  {
    icon: IconBrandMessenger,
    name: 'Facebook Messenger',
    status: 'Coming soon',
    description: 'Page messaging support with rich media and structured responses.',
    iconColorClass: 'text-blue-600 dark:text-blue-400',
    iconBgClass: 'bg-blue-50 border-blue-200/60 dark:bg-blue-500/15 dark:border-blue-500/30',
  },
  {
    icon: IconMessage,
    name: 'Website Chat Widget',
    status: 'Coming soon',
    description: 'Embeddable web chat snippet with a real-time WebSocket connection.',
    iconColorClass: 'text-amber-600 dark:text-amber-400',
    iconBgClass: 'bg-amber-50 border-amber-200/60 dark:bg-amber-500/15 dark:border-amber-500/30',
  },
];

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
  const theme = await resolveTheme(await getThemePreference());
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
      {/* ── Full-bleed background artwork ─────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[780px] w-full overflow-hidden"
        aria-hidden="true"
      >
        {/* Ambient radial washes: balanced two-temperature lighting (soft slate & warm ember) */}
        <div
          className="absolute top-8 -left-20 size-[620px] rounded-full opacity-35 blur-3xl dark:opacity-15"
          style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--ink-600) 25%, transparent) 0%, transparent 70%)' }}
        />
        <div
          className="absolute top-8 right-0 size-[680px] rounded-full opacity-30 blur-3xl dark:opacity-15"
          style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--orange-400) 25%, transparent) 0%, transparent 70%)' }}
        />


        {/* Iconography watermarks with soft architectural multi-tonal tints */}
        <div className="absolute -top-6 -left-20 hidden -rotate-12 text-slate-500/[0.08] dark:text-slate-300/[0.12] lg:block">
          <IconServer2 size={320} stroke={1} />
        </div>
        <div className="absolute top-[5%] -right-20 hidden rotate-12 text-amber-600/[0.08] dark:text-amber-300/[0.13] md:block">
          <IconMessage size={440} stroke={1} />
        </div>
        <div className="absolute right-[60%] -bottom-20 hidden rotate-[10deg] text-emerald-600/[0.08] dark:text-emerald-300/[0.13] md:block">
          <IconBrandWhatsapp size={460} stroke={1} />
        </div>
      </div>

      <FloatingHeader theme={theme} session={session} />

      <main
        id="main"
        className="relative z-10 mx-auto px-5 pt-6 pb-32 md:px-8"
        style={{ maxWidth: 'var(--content-max)' }}
      >
        {/* ── Hero. Spacious balanced layout: Diagram left, expansive copy right. ── */}
        <section
          id="overview"
          className="relative grid gap-10 pt-12 md:pt-24 lg:grid-cols-[450px_1fr] xl:grid-cols-[480px_1fr] lg:items-center lg:gap-14"
        >
          <div
            className="relative z-10 hidden justify-center justify-self-start lg:flex shrink-0"
            style={{ width: '490px', height: '420px' }}
          >
            <HeroDiagram />
          </div>

          <div className="animate-hero-reveal relative z-10 lg:pl-2" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="block h-px w-8"
                style={{ background: 'var(--accent-mark)' }}
              />
              <p className="t-eyebrow font-medium tracking-widest text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Customer support platform
              </p>
            </div>

            <h1 
              className="display mt-5 text-[38px] sm:text-[46px] md:text-[50px] lg:text-[48px] xl:text-[54px] font-medium leading-[1.12]" 
              style={{ color: 'var(--text-primary)' }}
            >
              One inbox for every message<br className="hidden sm:inline" /> your customers send.
            </h1>

            <p
              className="t-lede mt-5"
              style={{ color: 'var(--text-secondary)', maxWidth: 'var(--measure-prose)' }}
            >
              WhatsApp, Instagram, Messenger and your website, handled in one place by one team.
              Currently in development.
            </p>

            {isAuthenticated ? (
              <div
                className="animate-hero-reveal mt-8 flex flex-col gap-3.5"
                style={{ animationDelay: '250ms' }}
              >
                <div className="flex flex-wrap items-center gap-3.5">
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
              </div>
            ) : (
              <div
                className="animate-hero-reveal mt-8 flex flex-wrap items-center gap-3.5"
                style={{ animationDelay: '250ms' }}
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

            {/* Metrics row. Tripartite harmony: Navy (100%) + Ember (< 5s) + Emerald (0) */}
            <div
              className="mt-10 grid grid-cols-3 gap-6 border-t pt-6"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <div className="display display-lg" style={{ color: 'var(--text-primary)' }}>
                  100%
                </div>
                <div className="t-eyebrow mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Database isolation
                </div>
              </div>
              <div>
                <div className="display display-lg" style={{ color: 'var(--accent-mark-text)' }}>
                  &lt; 5s
                </div>
                <div className="t-eyebrow mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  AI rule propagation
                </div>
              </div>
              <div>
                <div className="display display-lg" style={{ color: 'var(--success-fg)' }}>
                  0
                </div>
                <div className="t-eyebrow mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  Master key vulnerabilities
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Where this is today ───────────────────────────────────────── */}
        <section
          className="relative mt-16 overflow-hidden border-y py-6 md:mt-24"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="relative flex size-2" aria-hidden>
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                    style={{ background: 'var(--accent-mark)' }}
                  />
                  <span
                    className="relative inline-flex size-2 rounded-full"
                    style={{ background: 'var(--accent-mark)' }}
                  />
                </span>
                <p className="t-eyebrow font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Where this is today
                </p>
              </div>
              <p
                className="t-lede mt-3"
                style={{ color: 'var(--text-primary)', maxWidth: 'var(--measure-prose)' }}
              >
                The platform underneath is live and running. Channel connections are what we are
                building next. If you are an early customer, your workspace is already provisioned
                and you can set your team up now.
              </p>
            </div>

            <div
              className="hidden items-center gap-6 border-l pl-6 lg:flex"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <div className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                  Architecture
                </div>
                <div className="t-compact mt-0.5" style={{ color: 'var(--text-primary)' }}>
                  Isolated row-level
                </div>
              </div>
              <div>
                <div className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                  AI engine
                </div>
                <div className="t-compact mt-0.5" style={{ color: 'var(--success-fg)' }}>
                  Machine-readable
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Live capabilities ─────────────────────────────────────────── */}
        <section id="live-engine" className="mt-20 md:mt-32">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="block h-px w-7"
                style={{ background: 'var(--accent-mark)' }}
              />
              <p className="t-eyebrow font-medium" style={{ color: 'var(--text-secondary)' }}>
                Live capabilities
              </p>
            </div>
            <h2 className="display display-md mt-3" style={{ color: 'var(--text-primary)' }}>
              What is already working
            </h2>
            <p
              className="t-body mt-2"
              style={{ color: 'var(--text-secondary)', maxWidth: 'var(--measure-prose)' }}
            >
              The infrastructure layer beneath the inbox, which is the part that has to be right
              before any message arrives.
            </p>
          </div>

          <InteractiveFeatures />
        </section>

        {/* ── Channels ──────────────────────────────────────────────────── */}
        <section id="channels" className="mt-20 md:mt-32">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="block h-px w-7"
                style={{ background: 'var(--accent-mark)' }}
              />
              <p className="t-eyebrow font-medium" style={{ color: 'var(--text-secondary)' }}>
                Channels
              </p>
            </div>
            <h2 className="display display-md mt-3" style={{ color: 'var(--text-primary)' }}>
              Where the messages will come from
            </h2>
            <p
              className="t-body mt-2 text-right"
              style={{ color: 'var(--text-secondary)', maxWidth: 'var(--measure-prose)' }}
            >
              Four channels, one thread per customer. Connecting them is what we are building next.
              The platform underneath is built and running now.
            </p>
          </div>

          <ul
            className="mt-10 grid gap-8 border-t pt-8 sm:grid-cols-2 lg:grid-cols-4"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {CHANNELS.map((channel, idx) => (
              <li
                key={channel.name}
                className={`flex flex-col justify-between ${idx > 0 ? 'lg:border-l lg:pl-8' : ''}`}
                style={idx > 0 ? { borderColor: 'var(--border-subtle)' } : undefined}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-chip border ${channel.iconBgClass}`}>
                      <channel.icon
                        size={19}
                        stroke={1.75}
                        className={channel.iconColorClass}
                        aria-hidden
                      />
                    </span>
                    <span className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                      {channel.status}
                    </span>
                  </div>
                  <h3 className="t-panel mt-4" style={{ color: 'var(--text-primary)' }}>
                    {channel.name}
                  </h3>
                  <p className="t-compact mt-2" style={{ color: 'var(--text-secondary)' }}>
                    {channel.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Security ──────────────────────────────────────────────────── */}
        <div id="security">
          <SecuritySection />
        </div>

        <LiveSpecPlayground />

        {/* ── Close ─────────────────────────────────────────────────────── */}
        <section
          className="relative mt-20 overflow-hidden border-t py-20 md:mt-32"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          <div className="pointer-events-none absolute top-6 -left-12 hidden -rotate-12 text-emerald-600/[0.08] dark:text-emerald-400/[0.14] lg:block">
            <IconBrandWhatsappFilled size={280} stroke={1} />
          </div>
          <div className="pointer-events-none absolute top-6 -right-12 hidden rotate-12 text-rose-600/[0.08] dark:text-rose-400/[0.14] lg:block">
            <IconMessageFilled size={260} stroke={1} />
          </div>

          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center px-4 text-center">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="size-2 animate-pulse rounded-full"
                style={{ background: 'var(--success-fg)' }}
                aria-hidden
              />
              <span className="t-eyebrow font-medium" style={{ color: 'var(--text-secondary)' }}>
                Provisioning ready · Core engine online
              </span>
            </div>

            <h2 className="display display-lg" style={{ color: 'var(--text-primary)' }}>
              Set your team up now
            </h2>
            <p
              className="t-lede mt-4"
              style={{ color: 'var(--text-secondary)', maxWidth: 'var(--measure-prose)' }}
            >
              Your workspace, your team, your credentials and your assistant rules are all live.
              When channels arrive, there is nothing left to configure.
            </p>

            {isAuthenticated ? (
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button asChild variant="primary" size="lg">
                  <Link href={dashboardHref} className="gap-2 shadow-sm">
                    <IconShieldLock size={17} stroke={1.5} />
                    Return to {dashboardLabel} <IconArrowRight size={16} stroke={1.5} />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/platform/support-sessions">
                    Support Sessions
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Button asChild variant="accent" size="lg">
                  <Link href="/sign-up" className="gap-2">
                    Request access <IconArrowRight size={16} stroke={1.5} />
                  </Link>
                </Button>
                <Button asChild variant="secondary" size="lg">
                  <Link href="/sign-in">Sign in</Link>
                </Button>
              </div>
            )}

            {/* Spec ticker. Three hues, each meaning something different:
                green is a passing state, orange is the one accent mark, blue
                is the speed claim that the primary CTA also owns. */}
            <div
              className="t-micro mt-10 flex flex-wrap justify-center gap-6 border-t pt-6"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="size-1 rounded-full"
                  style={{ background: 'var(--success-fg)' }}
                  aria-hidden
                />
                Row-level isolated
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="size-1 rounded-full"
                  style={{ background: 'var(--accent-mark)' }}
                  aria-hidden
                />
                Argon2 hashed
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="size-1 rounded-full"
                  style={{ background: 'var(--blue-500)' }}
                  aria-hidden
                />
                &lt;5s propagation
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer
        className="relative overflow-hidden border-t"
        style={{ borderColor: 'var(--border-strong)' }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.06]">
          <svg width="100%" height="100%" aria-hidden="true">
            <pattern id="footer-grid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="var(--border-strong)"
                strokeWidth="1"
              />
            </pattern>
            <rect width="100%" height="100%" fill="url(#footer-grid)" />
          </svg>
        </div>

        <div className="pointer-events-none absolute right-8 bottom-2 hidden -rotate-12 text-slate-500/[0.08] dark:text-slate-300/[0.12] lg:block">
          <IconServer2 size={240} stroke={1} />
        </div>

        <div
          className="relative z-10 mx-auto px-5 py-16 md:px-8"
          style={{ maxWidth: 'var(--content-max)' }}
        >
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-2">
              <div className="flex items-center gap-3">
                <Mark size={26} />
                <div>
                  {/* The wordmark is `aLcassa`, mixed case, capital L. The
                      previous uppercase treatment is not available to it:
                      BRAND.md §1 permits ALCASSA only where mixed case is
                      technically impossible, and CSS `text-transform` is not
                      an impossibility. */}
                  <span className="t-panel" style={{ color: 'var(--text-primary)' }}>
                    aLcassa
                  </span>
                  <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
                    Multi-tenant customer support engine
                  </p>
                </div>
              </div>
              <p className="t-compact max-w-sm" style={{ color: 'var(--text-secondary)' }}>
                Architected for strict database tenant isolation, machine-readable assistant rules,
                and zero master key vulnerability.
              </p>
              <div
                className="t-eyebrow inline-flex items-center gap-2 rounded-chip px-2.5 py-1"
                style={{ background: 'var(--success-bg)', color: 'var(--success-fg)' }}
              >
                <span
                  className="size-1.5 animate-pulse rounded-full"
                  style={{ background: 'var(--success-fg)' }}
                  aria-hidden
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
                { href: '#security', label: 'Security model' },
              ]}
            />

            <div className="space-y-3">
              <div className="t-eyebrow" style={{ color: 'var(--text-action)' }}>
                Architecture
              </div>
              <ul className="t-compact space-y-2" style={{ color: 'var(--text-secondary)' }}>
                <li>Postgres RLS policy</li>
                <li>Argon2 key hashing</li>
                <li>Multi-tenant RBAC</li>
                <li>Append-only audit</li>
              </ul>
            </div>

            <FooterColumn
              heading="Legal &amp; status"
              links={[
                { href: '/legal/terms', label: 'Terms of service' },
                { href: '/legal/privacy', label: 'Privacy notice' },
                { href: '/legal/dpa', label: 'Data processing (DPA)' },
                { href: '/status', label: 'System status' },
              ]}
            />
          </div>

          <div
            className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="t-eyebrow flex items-center gap-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <span>© 2026 Andishi</span>
              <span>·</span>
              <span>Northern Bypass, Nairobi</span>
            </div>
            <div
              className="t-micro flex items-center gap-4"
              style={{ color: 'var(--text-disabled)' }}
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
