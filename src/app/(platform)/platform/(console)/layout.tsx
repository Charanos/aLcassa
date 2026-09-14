import type { Metadata } from 'next';
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

/**
 * 02 §6 · 09 §1. The platform console. Brian's workspace, and the one interface
 * in this system built for a person who will live in it.
 *
 * This layout is a SERVER component and stays one. It reads the things that
 * have to be known before the first byte — chrome geometry, whether a support
 * session is open, and the isolation state the sidebar reports — and hands
 * them to the client shell as data. `children` passes straight through, so
 * every console page underneath remains server-rendered despite the shell
 * being interactive.
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
      /* One count, derived once. It was typed here, in the settings lede, in
         the rules tab and in four comments; five places to be wrong about how
         many customers the business has. */
      { href: '/platform/tenants', label: 'Workspaces', icon: 'building', badge: PORTFOLIO_COUNT },
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
 * ⚠ THESE ARE NOW THE FALLBACK, NOT THE SOURCE — EXCEPT `notices`.
 *
 * `workspaces` and `account` are served live by `getLiveConsoleChrome()`
 * below and these literals render only when there is no platform session,
 * which in practice means the review deployment's demo cookie. The switcher
 * needed it most: it lists workspaces to SWITCH INTO, so a fixture there was
 * offering a door to somewhere that does not exist.
 *
 *   workspaces →  live: recent tenants joined to their plan. DONE.
 *   account    →  live: the resolved platform admin. DONE.
 *   notices    →  a platform notifications query, ONCE THAT TABLE EXISTS.
 *                 It does not. There is no notifications table anywhere in
 *                 `src/db/schema`, which is also why the bell's "Mark all
 *                 read" control was removed rather than wired — there is no
 *                 read flag to set. This is the last fixture in the shell.
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
  const isolation = live ?? (await getIsolationStatus());

  /*
   * ⚠ TWO OF THE THREE FIXTURES ABOVE ARE NOW A FALLBACK RATHER THAN THE
   * SOURCE. `getLiveConsoleChrome` returns the real switcher list and the
   * real signed-in admin, or `null` when there is no platform session — the
   * review deployment's demo cookie — in which case the designed values below
   * still render and nothing breaks. Same contract as `getLiveIsolationStatus`
   * directly above.
   *
   * `notices` has no live form and stays a literal: there is no notifications
   * table in the schema to query. It is the last fixture in this shell.
   */
  /**
   * ⚠ `??` WAS THE WRONG OPERATOR FOR THE SWITCHER, AND THE BUG ONLY APPEARED
   * ONCE THE READER STARTED WORKING.
   *
   * An empty array is not nullish, so the moment `getLiveConsoleChrome` returned
   * `{ workspaces: [], … }` the fallback stopped firing and the switcher went
   * blank. And it returns empty for a structural reason rather than an
   * incidental one: the workspace list is a CROSS-TENANT read, `tenants_select`
   * admits only rows the reader is a member of, and a platform admin is a member
   * of none. That is the isolation guarantee, not a fault — the sanctioned path
   * for this list is `asService`, recorded in 21 §2.
   *
   * Until then: a length check rather than a null check, so an empty live answer
   * falls back to the designed list instead of offering a menu with no doors in
   * it. The ACCOUNT half is genuinely live now, because it reads the operator's
   * own rows under their own actor context.
   */
  const switcherWorkspaces = liveChrome?.workspaces?.length ? liveChrome.workspaces : workspaces;
  const signedInAccount = liveChrome?.account ?? account;

  return (
    <ConsoleShell
      navigation={navigation}
      workspaces={switcherWorkspaces}
      notices={notices}
      account={signedInAccount}
      nav={chrome.nav}
      density={chrome.density}
      session={session}
      isolation={isolation}
      onStartSession={startSupportSession}
      onEndSession={endSupportSession}
    >
      {children}
    </ConsoleShell>
  );
}
