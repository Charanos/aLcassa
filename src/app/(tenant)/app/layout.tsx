import {
  IconBuilding,
  IconCreditCard,
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
import type { NewAction } from '@/components/structure/TenantHeader';
import { currentSessionOrNull } from '@/lib/auth/resolve';
import { getShell } from '@/lib/tenant/data';
import { loadMe } from '@/modules/identity';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { safeReturnPath } from '@/lib/auth/returnPath';
import { demoAccessEnabled } from '@/lib/auth/demoAccess';

/** Resolve workspace identity and role on the server; filter navigation against the current membership. */

const navigation: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/app', label: 'Overview', icon: <IconLayoutDashboard size={16} stroke={1.5} /> },
      // 02 §5 · 01 D-05. DESIGNED placeholders, in the navigation, not
      // disabled and not a dead link. Grouped with Overview rather than
      // Settings because both are primary workspace surfaces, not
      // administration.
      { href: '/app/inbox', label: 'Inbox', icon: <IconInbox size={16} stroke={1.5} /> },
      {
        href: '/app/billing',
        label: 'Billing',
        icon: <IconCreditCard size={16} stroke={1.5} />,
        roles: ['owner', 'support'],
      },
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
        href: '/app/settings/appearance',
        label: 'Appearance',
        icon: <IconLayoutDashboard size={16} stroke={1.5} />,
        roles: ['owner', 'admin'],
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
        roles: ['owner'],
      },
      {
        href: '/app/settings/ai-rules',
        label: 'Assistant rules',
        icon: <IconFileText size={16} stroke={1.5} />,
        roles: ['owner', 'admin', 'support'],
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
    items: [
      { href: '/app/account', label: 'Your account', icon: <IconUser size={16} stroke={1.5} /> },
    ],
  },
];

/* Quick-create links use implemented routes and the same server-side role filter as navigation. */
const NEW_ACTIONS: (NewAction & { roles?: string[] })[] = [
  {
    key: 'invite',
    label: 'Invite a teammate',
    href: '/app/settings/team/invite',
    icon: <IconUsers size={16} stroke={1.5} />,
    roles: ['owner', 'admin', 'support'],
  },
  {
    key: 'credential',
    label: 'Create a credential',
    href: '/app/settings/credentials/new',
    icon: <IconKey size={16} stroke={1.5} />,
    roles: ['owner'],
  },
];

/** "owner" → "Owner". The role is a database enum; the header is prose. */
function roleLabel(role: string) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** "Amina Yusuf" → "AY". Falls back to one letter for a single-word name. */
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const first = parts[0]![0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : '';
  return (first + last).toUpperCase();
}

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const ctx = await currentSessionOrNull();
  if (!ctx && !demoAccessEnabled()) {
    const path = safeReturnPath((await headers()).get('x-auth-return-path'), '/app');
    redirect(`/sign-in?next=${encodeURIComponent(path)}`);
  }
  const me = ctx ? await loadMe(ctx) : null;
  const shell = me ? null : await getShell();

  const tenantName = me?.tenant?.name ?? 'Acme Industrial';
  const role = me?.membership?.role ?? 'owner';
  const operatorName = me?.user?.fullName ?? 'Amina Yusuf';

  return (
    <AppShell
      application="tenant"
      titleBlock={{ label: 'Workspace', value: tenantName }}
      navigation={navigation}
      role={role}
      workspaces={shell?.workspaces}
      newActions={NEW_ACTIONS.filter((a) => !a.roles || a.roles.includes(role))}
      notifications={shell?.notifications}
      notificationCount={shell?.unread ?? 0}
      planMeter={shell?.planMeter}
      account={{
        name: operatorName,
        role: roleLabel(role),
        initials: initialsOf(operatorName),
      }}
      helpHref="/docs/00-INDEX"
      /* Show the customer boundary notice when a support visit targets this workspace, rather than when the reader is the support actor. */
      supportMode={me?.supportMode ?? null}
    >
      {children}
    </AppShell>
  );
}
