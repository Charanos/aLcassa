import type { Metadata } from 'next';
import { ConsoleShell } from '@/components/console/ConsoleShell';
import type {
  ConsoleAccount,
  ConsoleNavGroup,
  ConsoleNotice,
  ConsoleWorkspace,
} from '@/components/console/types';
import { getConsoleChrome, resolveSupportSession } from '@/lib/console/session';
import { getIsolationStatus } from '@/lib/console/data';
import { getThemePreference, resolveTheme } from '@/lib/theme';
import { endSupportSession, setNavState, startSupportSession } from './actions';

/**
 * 02 §6 · 09 §1. The platform console. Brian's workspace, and the one interface
 * in this system built for a person who will live in it.
 *
 * This layout is a SERVER component and stays one. It reads the three things
 * that have to be known before the first byte — theme, chrome geometry, and
 * whether a support session is open — and hands them to the client shell as
 * data. `children` passes straight through, so every console page underneath
 * remains server-rendered despite the shell being interactive.
 */

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
      { href: '/platform/tenants', label: 'Workspaces', icon: 'building', badge: 47 },
      { href: '/platform/plans', label: 'Plans', icon: 'list' },
      { href: '/platform/revenue', label: 'Revenue', icon: 'coin' },
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
        badge: 1,
      },
      { href: '/platform/admins', label: 'Admins', icon: 'shield' },
      { href: '/platform/settings', label: 'Settings', icon: 'sliders' },
    ],
  },
];

/*
 * ⚠ PLACEHOLDER DATA, AND IT IS MARKED AS SUCH ON PURPOSE.
 *
 * These three constants are the seam where M1 and M4 will connect. Each is
 * shaped exactly as the query that replaces it will return, so swapping them
 * is a function call and not a refactor:
 *
 *   workspaces →  dbAsService.select(...).from(tenants).orderBy(lastSeenAt)
 *                 A platform record operation, and one of the few legitimate
 *                 service-role reads: the console owner is listing tenants,
 *                 not reading tenant business data. 11 §6 rule 3.
 *   notices    →  a platform notifications query, once that table exists.
 *   account    →  the resolved platform admin session.
 *
 * They are deliberately NOT faked deeper in the component tree. Keeping the
 * fixtures at the boundary means the shell below has never seen anything but
 * its real prop shape, so it cannot grow a dependency on mock-only fields.
 */

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
    body: 'Version 24 reached 47 workspaces in 3.1s',
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
  const [theme, chrome, session, isolation] = await Promise.all([
    resolveTheme(await getThemePreference()),
    getConsoleChrome(),
    resolveSupportSession(),
    getIsolationStatus(),
  ]);

  return (
    <ConsoleShell
      navigation={navigation}
      workspaces={workspaces}
      notices={notices}
      account={account}
      theme={theme}
      nav={chrome.nav}
      density={chrome.density}
      session={session}
      isolation={isolation}
      onNavStateChange={setNavState}
      onStartSession={startSupportSession}
      onEndSession={endSupportSession}
    >
      {children}
    </ConsoleShell>
  );
}
