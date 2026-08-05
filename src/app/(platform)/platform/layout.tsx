import {
  IconActivityHeartbeat,
  IconBuildings,
  IconHistory,
  IconFileText,
  IconLayoutDashboard,
  IconLayoutList,
  IconShieldLock,
} from '@tabler/icons-react';
import { AppShell, type NavGroup } from '@/components/structure/AppShell';
import { getThemePreference, resolveTheme } from '@/lib/theme';

/**
 * 02 §6 · 09 §1. The platform console. Brian's workspace, and the one interface
 * in this system built for a person who will live in it.
 *
 *   tenant application            platform console
 *   comfortable density           COMPACT density default
 *   guidance in the interface     guidance in the runbook
 *   mouse-first, mobile supported KEYBOARD-FIRST, desktop 1440, mobile read-only
 *   one primary action per screen many actions, all reachable from the palette
 *   prose explains                labels and data
 *
 * Same tokens, same components, different weighting. The inverted header comes
 * from `application="platform"` and is present on every page at all times.
 */

const navigation: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { href: '/platform', label: 'Overview', icon: <IconLayoutDashboard size={16} stroke={1.5} /> },
      { href: '/platform/tenants', label: 'Workspaces', icon: <IconBuildings size={16} stroke={1.5} /> },
      { href: '/platform/plans', label: 'Plans', icon: <IconLayoutList size={16} stroke={1.5} /> },
      { href: '/platform/ai-rules', label: 'Master rules', icon: <IconFileText size={16} stroke={1.5} /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/platform/health', label: 'Health', icon: <IconActivityHeartbeat size={16} stroke={1.5} /> },
      { href: '/platform/audit', label: 'Audit log', icon: <IconHistory size={16} stroke={1.5} /> },
      { href: '/platform/admins', label: 'Admins', icon: <IconShieldLock size={16} stroke={1.5} /> },
    ],
  },
];

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'development';
  const theme = await resolveTheme(await getThemePreference());

  return (
    <AppShell
      application="platform"
      // 03 §4. The console title block reads PLATFORM plus the environment name,
      // so a staging console is never mistaken for the live one even before the
      // slate boundary frame is noticed.
      titleBlock={{ label: 'Platform', value: environment.toUpperCase(), revision: 'rev 3.1' }}
      navigation={navigation}
      role="platform_admin"
      theme={theme}
      // TODO(M4): the organization switcher goes here. It is available from
      // EVERY console page, it is the SECOND focusable element after the skip
      // link (sheet 13: stepping into a tenant is the commonest keyboard action
      // the owner takes), and selecting a tenant opens a confirmation naming the
      // consequence rather than switching immediately. 09 §3.
    >
      {children}
    </AppShell>
  );
}
