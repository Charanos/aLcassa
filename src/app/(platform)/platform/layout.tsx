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
import type { TenantSummary } from '@/components/structure/TenantSwitcher';
import { getThemePreference, resolveTheme } from '@/lib/theme';

/**
 * 02 §6 · 09 §1. The platform console. Brian's workspace, and the one interface
 * in this system built for a person who will live in it.
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

const tenants: TenantSummary[] = [
  { id: 't_1', name: 'Acme Logistics Ltd', plan: 'Scale', status: 'active' },
  { id: 't_2', name: 'Northwind Traders', plan: 'Growth', status: 'trial' },
];

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const environment = process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'development';
  const theme = await resolveTheme(await getThemePreference());

  return (
    <AppShell
      application="platform"
      titleBlock={{ label: 'Platform', value: environment.toUpperCase(), revision: 'rev 3.1' }}
      navigation={navigation}
      role="platform_admin"
      theme={theme}
      defaultCollapsed={false}
      tenants={tenants}
      notificationCount={0}
      adminProfile={{
        name: 'Rafiqur Rahman',
        email: 'rafiqur51@jira.com',
        role: 'Platform Admin',
        initials: 'RR',
      }}
    >
      {children}
    </AppShell>
  );
}
