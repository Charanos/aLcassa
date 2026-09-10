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

/**
 * 02 §4 · 02 §8. The tenant application.
 *
 * Navigation is ROLE-FILTERED rather than role-disabled: an agent simply does
 * not see Credentials. A disabled item that a person cannot use is an
 * invitation to ask why, and Brian is the support team.
 *
 * ⚠ AS OF 27 Aug 2026 THE ROLE AND TENANT ARE REAL. M2 landed the identity
 * module, so this shell reads `loadMe` — the one round trip 07 §3 specifies —
 * and the role that filters the navigation is the one on the membership row
 * rather than a constant.
 *
 * That matters more than it looks: an agent does not see Credentials because
 * the SERVER did not send it, not because the client hid it. A filter applied
 * after the fact is a filter that can be un-applied in a browser.
 *
 * `supportMode` likewise comes from the payload, and the payload reads it
 * from the sessions table — never from a query parameter, because a frame
 * that could be suppressed by editing a URL would be worthless.
 *
 * When there is no session — the review deployment's demo cookie — it falls
 * back to the designed values, exactly as the read model does.
 */

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
        roles: ['owner', 'support'],
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

/*
 * 02 §5. The header's quick-create menu. BOTH DESTINATIONS ARE REAL ROUTES.
 * `Tenant-Shell` offers four — a conversation, a broadcast, a contact and a
 * template — behind screens this build does not have; a menu whose items 404
 * teaches the reader not to open it, so it lists what exists and grows when
 * the rest lands.
 *
 * Role-filtered by the same rule as the navigation (02 §8): an agent does not
 * see what an agent cannot do, and the filter is applied on the SERVER.
 */
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
    roles: ['owner', 'support'],
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
  const me = ctx ? await loadMe(ctx) : null;
  const shell = await getShell();

  const tenantName = me?.tenant?.name ?? 'Acme Industrial';
  const role = me?.membership?.role ?? 'owner';
  const operatorName = me?.user?.fullName ?? 'Amina Yusuf';

  return (
    <AppShell
      application="tenant"
      titleBlock={{ label: 'Workspace', value: tenantName }}
      navigation={navigation}
      role={role}
      /*
       * ⚠ THE WORKSPACE LIST IS STILL THE SEAM'S, NOT `loadMe`'S. `Me` carries
       * ONE tenant — the session's — because that is what the session resolves
       * to; the set a person belongs to is a different query against
       * memberships that M2 has not grown yet. Wiring the switcher to the one
       * tenant we know about would render a switcher that cannot switch, so it
       * reads the fixture until that query exists and the shape it reads is
       * the shape that query returns.
       */
      workspaces={shell.workspaces}
      newActions={NEW_ACTIONS.filter((a) => !a.roles || a.roles.includes(role))}
      notifications={shell.notifications}
      notificationCount={shell.unread}
      planMeter={shell.planMeter}
      account={{
        name: operatorName,
        role: roleLabel(role),
        initials: initialsOf(operatorName),
      }}
      helpHref="/docs/00-INDEX"
      /*
       * ⚠ THE FRAME IS ON WHEN SOMEONE IS LOOKING IN, NOT WHEN THE READER IS
       *   THE ONE LOOKING.
       *
       * `loadMe` reads this from an open support session against THIS
       * workspace, so the owner sees the boundary frame while the platform is
       * inside — which is the only reader for whom it means anything. It is
       * not `ctx.supportMode`, which is true only for the platform's own
       * session and would therefore show the frame to everyone except the
       * person it is meant to inform.
       */
      supportMode={me?.supportMode ?? null}
    >
      {children}
    </AppShell>
  );
}
