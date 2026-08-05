import {
  IconBuilding,
  IconFileText,
  IconHistory,
  IconInbox,
  IconKey,
  IconLayoutList,
  IconLayoutDashboard,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { AppShell, type NavGroup } from '@/components/structure/AppShell';
import { getThemePreference, resolveTheme } from '@/lib/theme';

/**
 * 02 §4 · 02 §8. The tenant application.
 *
 * Navigation is ROLE-FILTERED rather than role-disabled: an agent simply does
 * not see Credentials. A disabled item that a person cannot use is an
 * invitation to ask why, and Brian is the support team.
 *
 * ⚠ The role and tenant below are placeholders until the identity module lands
 * at M2. They come from `/v1/me` (07 §3), which returns everything needed to
 * render this shell in one round trip, INCLUDING the `supportMode` object that
 * drives the boundary frame. That object is server-driven and never read from a
 * query parameter, because a frame that could be suppressed by editing a URL
 * would be worthless.
 */

const navigation: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/app', label: 'Overview', icon: <IconLayoutDashboard size={16} stroke={1.5} /> },
      // 02 §5 · 01 D-05. A DESIGNED placeholder, in the navigation, not
      // disabled and not a dead link.
      { href: '/app/inbox', label: 'Inbox', icon: <IconInbox size={16} stroke={1.5} /> },
    ],
  },
  {
    label: 'Settings',
    items: [
      {
        href: '/app/settings/company',
        label: 'Company',
        icon: <IconBuilding size={16} stroke={1.5} />,
        roles: ['owner', 'admin', 'support'],
      },
      {
        href: '/app/settings/team',
        label: 'Team',
        icon: <IconUsers size={16} stroke={1.5} />,
        roles: ['owner', 'admin', 'support'],
      },
      {
        href: '/app/settings/credentials',
        label: 'Credentials',
        icon: <IconKey size={16} stroke={1.5} />,
        roles: ['owner', 'support'],
      },
      {
        href: '/app/settings/ai-rules',
        label: 'Assistant rules',
        icon: <IconFileText size={16} stroke={1.5} />,
      },
      {
        href: '/app/settings/subscription',
        label: 'Plan and usage',
        icon: <IconLayoutList size={16} stroke={1.5} />,
        roles: ['owner', 'admin', 'support'],
      },
      {
        href: '/app/settings/audit',
        label: 'Activity',
        icon: <IconHistory size={16} stroke={1.5} />,
        roles: ['owner', 'admin', 'support'],
      },
    ],
  },
  {
    label: 'Account',
    items: [{ href: '/app/account', label: 'Your account', icon: <IconUser size={16} stroke={1.5} /> }],
  },
];

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  // TODO(M2): replace with `await getMe()` once the identity module lands.
  const tenantName = 'Acme Industrial';
  const role = 'owner';
  const theme = await resolveTheme(await getThemePreference());

  return (
    <AppShell
      application="tenant"
      titleBlock={{ label: 'Workspace', value: tenantName }}
      navigation={navigation}
      role={role}
      theme={theme}
    >
      {children}
    </AppShell>
  );
}
