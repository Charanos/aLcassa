'use client';

import Link from 'next/link';
import {
  IconBell,
  IconCheck,
  IconChevronDown,
  IconLogout,
  IconPlus,
  IconUserCircle,
} from '@tabler/icons-react';
import {
  HeaderMenu,
  HeaderMenuContent,
  HeaderMenuItem,
  HeaderMenuLabel,
  HeaderMenuSeparator,
  HeaderMenuTrigger,
} from './HeaderMenu';

/**
 * The tenant header's right-hand cluster: which workspace you are in, what you
 * can create, what happened while you were away, and who you are.
 *
 * ⚠ EVERY ONE OF THESE IS TENANT-ONLY AND OPT-IN. `AppShell` is shared with
 * the platform console, which has its own chrome and its own `Console-Shell`
 * design — so each of these renders only when the shell is handed the matching
 * prop. A tenant layout that passes nothing gets the header it had before.
 */

/* ── Workspace switcher ───────────────────────────────────────────────── */

export type WorkspaceSummary = {
  id: string;
  name: string;
  initials: string;
  /** The reader's role in THAT workspace, which is not always this one's. */
  role: string;
  current: boolean;
};

function Initials({ text, size }: { text: string; size: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-chip"
      style={{
        width: size,
        height: size,
        background: 'var(--blue-50)',
        color: 'var(--blue-500)',
        font: `500 ${Math.round(size * 0.42)}px/1 var(--font-mono)`,
      }}
      aria-hidden
    >
      {text}
    </span>
  );
}

export function WorkspaceSwitcher({ workspaces }: { workspaces: WorkspaceSummary[] }) {
  const current = workspaces.find((w) => w.current) ?? workspaces[0];
  if (!current) return null;

  // One workspace is not a choice. Rendering a disclosure that opens onto a
  // list of one is a control that teaches the reader it does nothing.
  if (workspaces.length === 1) {
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        <Initials text={current.initials} size={22} />
        <span className="t-compact truncate" style={{ color: 'var(--text-primary)' }}>
          {current.name}
        </span>
      </span>
    );
  }

  return (
    <HeaderMenu>
      <HeaderMenuTrigger asChild>
        <button
          type="button"
          className="flex h-[34px] min-w-0 cursor-pointer items-center gap-2.5 rounded-chip border pr-2.5 pl-[7px] transition-colors hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <Initials text={current.initials} size={22} />
          <span
            className="t-compact truncate"
            style={{ color: 'var(--text-primary)', maxWidth: '22ch' }}
          >
            {current.name}
          </span>
          <IconChevronDown
            size={14}
            stroke={1.5}
            style={{ color: 'var(--text-tertiary)' }}
            aria-hidden
          />
        </button>
      </HeaderMenuTrigger>

      <HeaderMenuContent width={320} align="start">
        <HeaderMenuLabel>Your workspaces</HeaderMenuLabel>
        {workspaces.map((w) => (
          <HeaderMenuItem key={w.id} asChild>
            <Link href={`/app?workspace=${w.id}`}>
              <Initials text={w.initials} size={26} />
              <span className="min-w-0 flex-1">
                <span className="t-compact block truncate">{w.name}</span>
                <span className="t-micro block truncate" style={{ color: 'var(--text-tertiary)' }}>
                  {w.role}
                </span>
              </span>
              {w.current ? (
                <IconCheck size={16} stroke={1.75} style={{ color: 'var(--blue-500)' }} />
              ) : null}
            </Link>
          </HeaderMenuItem>
        ))}
      </HeaderMenuContent>
    </HeaderMenu>
  );
}

/* ── Quick create ─────────────────────────────────────────────────────── */

export type NewAction = { key: string; label: string; href: string; icon: React.ReactNode };

export function NewMenu({ actions }: { actions: NewAction[] }) {
  if (actions.length === 0) return null;

  return (
    <HeaderMenu>
      <HeaderMenuTrigger asChild>
        <button
          type="button"
          className="flex h-[34px] cursor-pointer items-center gap-2 rounded-chip pr-3.5 pl-3 font-medium text-white transition-colors hover:bg-[var(--blue-600)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
          style={{ background: 'var(--blue-500)', boxShadow: 'var(--shadow-sm)' }}
        >
          <IconPlus size={15} stroke={1.8} aria-hidden />
          <span className="t-compact">New</span>
        </button>
      </HeaderMenuTrigger>

      <HeaderMenuContent width={246}>
        {actions.map((action) => (
          <HeaderMenuItem key={action.key} asChild>
            <Link href={action.href}>
              <span
                className="grid size-4 shrink-0 place-items-center"
                style={{ color: 'var(--text-secondary)' }}
                aria-hidden
              >
                {action.icon}
              </span>
              {action.label}
            </Link>
          </HeaderMenuItem>
        ))}
      </HeaderMenuContent>
    </HeaderMenu>
  );
}

/* ── Notifications ────────────────────────────────────────────────────── */

export type ShellNotification = {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: 'info' | 'warn' | 'danger';
  href: string;
};

const NOTICE_TONE = {
  info: { ink: 'var(--blue-500)', tint: 'var(--blue-50)' },
  warn: { ink: 'var(--warning-fg)', tint: 'var(--warning-bg)' },
  danger: { ink: 'var(--danger-fg)', tint: 'var(--danger-bg)' },
} as const;

export function NotificationsMenu({
  notifications,
  unread,
}: {
  notifications: ShellNotification[];
  unread: number;
}) {
  return (
    <HeaderMenu>
      <HeaderMenuTrigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          className="relative grid size-[34px] cursor-pointer place-items-center rounded-chip transition-colors hover:bg-[var(--surface-inset)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
          style={{ color: 'var(--text-secondary)' }}
        >
          <IconBell size={18} stroke={1.5} aria-hidden />
          {unread > 0 ? (
            <span
              aria-hidden
              className="absolute top-[7px] right-2 size-1.5 rounded-full"
              style={{ background: 'var(--orange-400)' }}
            />
          ) : null}
        </button>
      </HeaderMenuTrigger>

      <HeaderMenuContent width={366}>
        <HeaderMenuLabel>Notifications</HeaderMenuLabel>
        {notifications.length === 0 ? (
          <p className="t-compact px-2.5 py-4" style={{ color: 'var(--text-tertiary)' }}>
            Nothing new.
          </p>
        ) : (
          notifications.map((n) => {
            const tone = NOTICE_TONE[n.tone];
            return (
              <HeaderMenuItem key={n.id} asChild>
                <Link href={n.href} className="items-start">
                  <span
                    className="mt-0.5 grid size-[26px] shrink-0 place-items-center rounded-panel"
                    style={{ background: tone.tint, color: tone.ink }}
                    aria-hidden
                  >
                    <span className="size-1.5 rounded-full" style={{ background: tone.ink }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-compact block">{n.title}</span>
                    <span
                      className="t-caption mt-0.5 block text-pretty"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {n.body}
                    </span>
                  </span>
                  <span className="t-micro shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                    {n.time}
                  </span>
                </Link>
              </HeaderMenuItem>
            );
          })
        )}
      </HeaderMenuContent>
    </HeaderMenu>
  );
}

/* ── Account ──────────────────────────────────────────────────────────── */

export type AccountSummary = {
  name: string;
  role: string;
  initials: string;
};

export function AccountMenu({ account }: { account: AccountSummary }) {
  return (
    <HeaderMenu>
      <HeaderMenuTrigger asChild>
        <button
          type="button"
          aria-label="Your account"
          className="flex h-[34px] cursor-pointer items-center gap-2 rounded-chip pr-2 pl-1 transition-colors hover:bg-[var(--surface-inset)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
        >
          <span
            className="grid size-[26px] shrink-0 place-items-center rounded-full"
            style={{
              background: 'var(--blue-50)',
              color: 'var(--blue-500)',
              font: '500 11px/1 var(--font-mono)',
            }}
            aria-hidden
          >
            {account.initials}
          </span>
          <span className="t-compact hidden lg:inline" style={{ color: 'var(--text-primary)' }}>
            {account.name}
          </span>
        </button>
      </HeaderMenuTrigger>

      <HeaderMenuContent width={258}>
        <div className="flex items-center gap-2.5 px-2.5 pt-2 pb-3">
          <span
            className="grid size-[34px] shrink-0 place-items-center rounded-full"
            style={{
              background: 'var(--blue-50)',
              color: 'var(--blue-500)',
              font: '500 12px/1 var(--font-mono)',
            }}
            aria-hidden
          >
            {account.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="t-compact block truncate" style={{ color: 'var(--text-primary)' }}>
              {account.name}
            </span>
            <span className="t-micro block truncate" style={{ color: 'var(--text-tertiary)' }}>
              {account.role}
            </span>
          </span>
        </div>

        <HeaderMenuSeparator />

        <HeaderMenuItem asChild>
          <Link href="/app/account">
            <IconUserCircle size={16} stroke={1.5} aria-hidden />
            Your account
          </Link>
        </HeaderMenuItem>

        <HeaderMenuSeparator />

        {/*
          A POST form, matching `AdminProfileCard`. Sign-out revokes the
          session row, so it cannot be a link — a GET that destroys a session
          is one prefetch away from signing the reader out by accident.
        */}
        <HeaderMenuItem asChild tone="danger">
          <form method="post" action="/api/v1/auth/sign-out">
            <button type="submit" className="flex w-full cursor-pointer items-center gap-2.5">
              <IconLogout size={16} stroke={1.5} aria-hidden />
              Sign out
            </button>
          </form>
        </HeaderMenuItem>
      </HeaderMenuContent>
    </HeaderMenu>
  );
}
