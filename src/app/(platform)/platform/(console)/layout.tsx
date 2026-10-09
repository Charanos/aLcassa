import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { demoAccessEnabled } from '@/lib/auth/demoAccess';
import { safeReturnPath } from '@/lib/auth/returnPath';
import { ConsoleShell } from '@/components/console/ConsoleShell';
import type {
  ConsoleAccount,
  ConsoleNavGroup,
  ConsoleNotice,
  ConsoleWorkspace,
} from '@/components/console/types';
import { getConsoleChrome, resolveSupportSession } from '@/lib/console/session';
import { getIsolationStatus, PORTFOLIO_COUNT } from '@/lib/console/data';
import { getLiveIsolationStatus } from '@/lib/console/live';
import { getLiveConsoleChrome } from '@/lib/console/liveChrome';
import { endSupportSession, startSupportSession } from './actions';

/** Resolve chrome, support state and isolation on the server; pass interactive shell data without converting child pages to client components. */

export const metadata: Metadata = {
  title: { default: 'Platform', template: '%s · Platform · aLcassa' },
  // 02 §10. Nothing under /platform is indexed.
  robots: { index: false, follow: false },
};

const navigation: ConsoleNavGroup[] = [
  {
    label: 'Platform',
    items: [
      { href: '/platform', label: 'Overview', icon: 'dashboard' },
      /* One count, derived once. It was typed here, in the settings lede, in
         the rules tab and in four comments; five places to be wrong about how
         many customers the business has. */
      { href: '/platform/tenants', label: 'Workspaces', icon: 'building', badge: PORTFOLIO_COUNT },
      { href: '/platform/plans', label: 'Plans', icon: 'list' },
      { href: '/platform/revenue', label: 'Subscription value', icon: 'coin' },
      { href: '/platform/ai-rules', label: 'Master rules', icon: 'file' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/platform/health', label: 'Health', icon: 'pulse' },
      { href: '/platform/audit', label: 'Audit log', icon: 'history' },
      {
        href: '/platform/support-sessions',
        label: 'Support sessions',
        icon: 'users',
      },
      { href: '/platform/admins', label: 'Admins', icon: 'shield' },
      { href: '/platform/settings', label: 'Settings', icon: 'sliders' },
    ],
  },
];

/* Demo fixtures supply workspaces and account details only without a platform session; notification storage is not implemented. */

const workspaces: ConsoleWorkspace[] = [
  {
    id: 't_kilimanjaro',
    name: 'Kilimanjaro Logistics Group Ltd',
    slug: 'kilimanjaro-logistics',
    plan: 'Scale',
    initials: 'KL',
  },
  {
    id: 't_sarova',
    name: 'Sarova Hospitality Collection',
    slug: 'sarova-hospitality',
    plan: 'Growth',
    initials: 'SH',
  },
  {
    id: 't_northwind',
    name: 'Northwind Traders East Africa',
    slug: 'northwind-ea',
    plan: 'Growth',
    initials: 'NT',
  },
  {
    id: 't_peridot',
    name: 'Peridot Health Clinics',
    slug: 'peridot-health',
    plan: 'Starter',
    initials: 'PH',
  },
];

const notices: ConsoleNotice[] = [
  {
    id: 'n_1',
    kind: 'danger',
    title: 'Payment failed',
    body: 'Kilimanjaro Logistics · KES 184,000 declined',
    time: '6d',
    href: '/platform/tenants/kilimanjaro-logistics',
  },
  {
    id: 'n_2',
    kind: 'warning',
    title: '94% of the events limit',
    body: 'Sarova Hospitality · 19 days left in the period',
    time: '2h',
    href: '/platform/tenants/sarova-hospitality',
  },
  {
    id: 'n_3',
    kind: 'plain',
    title: 'Trial ends Sunday',
    body: 'Peridot Health Clinics · no plan assigned',
    time: '5h',
    href: '/platform/tenants',
  },
  {
    id: 'n_4',
    kind: 'plain',
    title: 'Master rules propagated',
    body: `Version 24 reached ${PORTFOLIO_COUNT} workspaces in 3.1s`,
    time: '1d',
    href: '/platform/ai-rules',
  },
];

const account: ConsoleAccount = {
  name: 'Brian Masira',
  email: 'brian@andishi.co.ke',
  role: 'platform_admin',
  initials: 'BM',
};

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  /**
   * The isolation chip under the navigation, verified against the live
   * database on every render rather than read from a literal. Sheet 05 puts
   * it here precisely so it is not something to go and check; a number
   * somebody typed in would defeat that.
   */
  const [chrome, session, live, liveChrome] = await Promise.all([
    getConsoleChrome(),
    resolveSupportSession(),
    getLiveIsolationStatus(),
    getLiveConsoleChrome(),
  ]);
  if (!liveChrome && !demoAccessEnabled()) {
    const path = safeReturnPath((await headers()).get('x-auth-return-path'), '/platform');
    redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  }
  const isolation = live ?? (await getIsolationStatus());

  /* Resolve live shell identity and workspace options; keep unavailable notification data distinct from authenticated records. */
  /** Keep a genuinely empty live workspace list empty; fixture fallback applies only to demo mode. */
  const switcherWorkspaces = liveChrome?.workspaces ?? workspaces;
  const signedInAccount = liveChrome?.account ?? account;

  /* The rail's badges, from the database when there is an operator. The
     support badge was a typed `1`: it claimed somebody was inside a customer's
     workspace on every page, whether or not anyone was. It shows only when a
     visit is open, and counts them. Doc 24 · Stage 6. */
  const railNavigation: ConsoleNavGroup[] = liveChrome
    ? navigation.map((group) => ({
        ...group,
        items: group.items.map((item) =>
          item.href === '/platform/tenants'
            ? { ...item, badge: liveChrome.workspaceCount }
            : item.href === '/platform/support-sessions'
              ? { ...item, badge: liveChrome.openSupportSessions || undefined }
              : item,
        ),
      }))
    : navigation;

  return (
    <ConsoleShell
      navigation={railNavigation}
      workspaces={switcherWorkspaces}
      notices={liveChrome ? [] : notices}
      account={signedInAccount}
      nav={chrome.nav}
      density={chrome.density}
      session={session}
      isolation={isolation}
      preview={!liveChrome}
      onStartSession={startSupportSession}
      onEndSession={endSupportSession}
    >
      {children}
    </ConsoleShell>
  );
}
