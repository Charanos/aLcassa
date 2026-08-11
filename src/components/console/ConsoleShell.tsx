'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  IconAlertTriangle,
  IconBell,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconFileText,
  IconLayoutSidebar,
  IconLogout,
  IconMoon,
  IconSearch,
  IconSettings,
  IconSun,
  IconUser,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { CONSOLE_ICONS } from './icons';
import { SupportSessionBanner } from './SupportSessionBanner';
import { StartSessionDialog } from './StartSessionDialog';
import type {
  ConsoleAccount,
  ConsoleNavGroup,
  ConsoleNotice,
  ConsoleWorkspace,
  NoticeKind,
} from './types';
import type { SupportSession, NavState, Density } from '@/lib/console/session';
import type { ResolvedTheme } from '@/lib/theme-shared';
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE } from '@/lib/theme-shared';

/**
 * The platform console shell. `Console-Shell.dc.html`, made real.
 *
 * ⚠ WHAT CHANGED ON THE WAY IN, and why each change was necessary rather than
 * a matter of taste. The design file is a single-document preview; four of its
 * mechanisms do not survive contact with an App Router application.
 *
 *  1. NAVIGATION IS ROUTES, NOT STATE. The design tracks `screen` in component
 *     state and swaps `<dc-import>` blocks. Here every nav item is a real URL
 *     and the active item is derived from `usePathname()`, so the back button,
 *     deep links, middleware auth and per-route metadata all work. This is the
 *     single biggest structural difference.
 *
 *  2. THE CHROME PAINTS AT ITS CORRECT SIZE. The design writes `--nav-w` from
 *     a client effect. Server-rendered, that guarantees a visible snap: the
 *     server emits 248px, hydration discovers a collapsed preference, the
 *     whole layout jumps. Width and density arrive as an inline style computed
 *     from a cookie the server already read, and the toggle writes back
 *     through a server action.
 *
 *  3. SUPPORT MODE IS SERVER STATE. See `lib/console/session.ts` — a client
 *     boolean cannot be allowed to influence an RLS input.
 *
 *  4. THE MAIN PANE STAYS A SERVER COMPONENT. `children` is passed through as
 *     a prop rather than rendered by a router switch, so putting `'use client'`
 *     at the top of this file does not drag every console page across the
 *     boundary with it.
 *
 * Everything else — the inverted chrome, the two nav groups, the 2px active
 * mark with its neumorphic lift, the glass dropdowns, ⌘K and ⌘B, the switcher
 * that refuses to navigate straight in — is the design as drawn.
 */

const OVERLAY_Z = 60;

export type ConsoleShellProps = {
  navigation: ConsoleNavGroup[];
  workspaces: ConsoleWorkspace[];
  notices: ConsoleNotice[];
  account: ConsoleAccount;
  theme: ResolvedTheme;
  nav: NavState;
  density: Density;
  session: SupportSession | null;
  onNavStateChange: (nav: NavState) => Promise<void>;
  onStartSession: (input: {
    tenantId: string;
    tenantName: string;
    reason: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
  onEndSession: () => Promise<void>;
  children: React.ReactNode;
};

const NOTICE_INK: Record<NoticeKind, { bg: string; fg: string }> = {
  danger: { bg: 'var(--danger-bg)', fg: 'var(--danger-fg)' },
  warning: { bg: 'var(--warning-bg)', fg: 'var(--warning-fg)' },
  plain: { bg: 'var(--surface-inset)', fg: 'var(--text-secondary)' },
};

export function ConsoleShell({
  navigation,
  workspaces,
  notices,
  account,
  theme,
  nav,
  density,
  session,
  onNavStateChange,
  onStartSession,
  onEndSession,
  children,
}: ConsoleShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [collapsed, setCollapsed] = useState(nav === 'collapsed');
  const [openMenu, setOpenMenu] = useState<'switcher' | 'notices' | 'account' | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingWorkspace, setPendingWorkspace] = useState<ConsoleWorkspace | null>(null);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [, startTransition] = useTransition();

  const paletteInput = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const expanded = !collapsed;

  const closeAll = useCallback(() => {
    setOpenMenu(null);
    setPaletteOpen(false);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      startTransition(() => void onNavStateChange(next ? 'collapsed' : 'expanded'));
      return next;
    });
  }, [onNavStateChange]);

  /* ⌘K / ⌘B / Escape. One listener rather than three, so the ordering between
     them is explicit instead of depending on registration order. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((p) => !p);
        setQuery('');
        setOpenMenu(null);
        return;
      }
      if (meta && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
        return;
      }
      if (e.key === 'Escape') closeAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCollapse, closeAll]);

  useEffect(() => {
    if (paletteOpen) paletteInput.current?.focus();
  }, [paletteOpen]);

  /* A dropdown that only closes on Escape is a dropdown that stays open while
     the operator clicks something else entirely. The design file has no
     outside-click handling because a preview never loses focus. */
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openMenu]);

  /* Navigating closes every transient surface. Without this, following a link
     from the palette leaves the overlay sitting over the page it opened. */
  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  function toggleTheme() {
    const next = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${THEME_COOKIE_MAX_AGE}; samesite=lax`;
    setCurrentTheme(next);
  }

  const paletteHits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const screens = navigation.flatMap((g) =>
      g.items.map((i) => ({
        key: i.href,
        label: i.label,
        hint: i.href,
        kind: 'SCREEN',
        icon: i.icon,
      })),
    );
    const spaces = workspaces.map((w) => ({
      key: `/platform/tenants/${w.slug}`,
      label: w.name,
      hint: `/platform/tenants/${w.slug}`,
      kind: 'WORKSPACE',
      icon: 'building',
    }));
    const actions = [
      {
        key: '/platform/tenants/new',
        label: 'Provision a workspace',
        hint: '/platform/tenants/new',
        kind: 'ACTION',
        icon: 'plus',
      },
      {
        key: '/platform/profile',
        label: 'Your profile',
        hint: '/platform/profile',
        kind: 'ACCOUNT',
        icon: 'user',
      },
    ];
    const all = [...screens, ...spaces, ...actions];
    if (!q) return all;
    return all.filter(
      (h) => h.label.toLowerCase().includes(q) || h.hint.toLowerCase().includes(q),
    );
  }, [query, navigation, workspaces]);

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={{
        background: 'var(--surface-base)',
        color: 'var(--text-primary)',
        // Server-computed. See note 2 in the header comment.
        ['--nav-w' as string]: collapsed ? '60px' : '248px',
        ['--row-h' as string]: density === 'dense' ? '36px' : '44px',
        ['--row-pad' as string]: density === 'dense' ? '6px' : '10px',
      }}
    >
      {session ? <SupportSessionBanner session={session} onEnd={onEndSession} /> : null}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        ref={headerRef}
        className="relative flex shrink-0 items-center gap-3 pr-3 pl-4"
        style={{
          height: 'var(--topbar-height)',
          background: 'var(--chrome-bg)',
          color: 'var(--chrome-fg)',
          borderBottom: '1px solid var(--chrome-rule)',
          boxShadow: 'var(--chrome-highlight)',
          zIndex: 30,
        }}
      >
        <Link
          href="/platform"
          className="inline-flex shrink-0 items-center gap-2.5"
          style={{ color: 'var(--chrome-fg)' }}
        >
          {/* `tone="chrome"` rather than `brand`: on the navy slab the
              saturated brand blue is 2.52:1. See the chrome tier note. */}
          <Mark size={22} tone="chrome" title="aLcassa" />
          <span
            className="hidden sm:inline"
            style={{
              font: '500 var(--text-lg)/1 var(--font-ui)',
              letterSpacing: '-0.015em',
              color: 'var(--chrome-fg)',
            }}
          >
            aLcassa
          </span>
        </Link>

        <span
          aria-hidden
          className="hidden shrink-0 md:block"
          style={{ width: 1, height: 22, background: 'var(--chrome-rule)' }}
        />

        {/* ── Workspace switcher ─────────────────────────────────────── */}
        <div className="relative hidden shrink-0 md:block">
          <ChromeButton
            onClick={() => setOpenMenu((m) => (m === 'switcher' ? null : 'switcher'))}
            expanded={openMenu === 'switcher'}
            bordered
          >
            <span
              className="grid size-5 place-items-center rounded-chip"
              style={{
                background: 'var(--chrome-active-bg)',
                color: 'var(--chrome-action)',
                font: '500 10px/1 var(--font-mono)',
              }}
              aria-hidden
            >
              ◎
            </span>
            <span className="whitespace-nowrap">Switch into workspace</span>
            <IconChevronDown
              size={14}
              stroke={1.5}
              style={{ color: 'var(--chrome-fg-muted)' }}
              aria-hidden
            />
          </ChromeButton>

          {openMenu === 'switcher' ? (
            <Dropdown className="left-0 w-[380px] p-1.5">
              <p
                className="t-eyebrow px-2.5 pt-2 pb-1.5"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Recent workspaces
              </p>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    setOpenMenu(null);
                    setPendingWorkspace(w);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-panel px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--surface-inset)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span
                    className="grid size-[26px] shrink-0 place-items-center rounded-panel"
                    style={{
                      background: 'var(--blue-50)',
                      color: 'var(--blue-500)',
                      font: '500 11px/1 var(--font-mono)',
                    }}
                    aria-hidden
                  >
                    {w.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="t-compact block truncate">{w.name}</span>
                    <span
                      className="block truncate"
                      style={{ font: '400 11px/1.4 var(--font-mono)', color: 'var(--text-tertiary)' }}
                    >
                      {w.slug}
                    </span>
                  </span>
                  <span
                    style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                  >
                    {w.plan}
                  </span>
                </button>
              ))}
              <p
                className="t-compact mx-2.5 mt-1.5 mb-2 border-t pt-2"
                style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                Selecting a workspace opens a confirmation. It never navigates straight in.
              </p>
            </Dropdown>
          ) : null}
        </div>

        {/* ── Command palette trigger ─────────────────────────────────── */}
        <button
          type="button"
          onClick={() => {
            setPaletteOpen(true);
            setQuery('');
          }}
          className="flex h-[34px] min-w-0 flex-1 items-center gap-2.5 rounded-panel pr-2 pl-2.5 text-left transition-colors md:max-w-[320px]"
          style={{
            border: '1px solid var(--chrome-rule)',
            background: 'transparent',
            color: 'var(--chrome-fg-muted)',
            font: '400 var(--text-sm)/1 var(--font-ui)',
          }}
        >
          <IconSearch size={16} stroke={1.5} aria-hidden />
          <span className="flex-1 truncate">Search or jump to</span>
          <kbd
            className="hidden h-5 items-center rounded-chip px-1.5 sm:inline-flex"
            style={{
              border: '1px solid var(--chrome-rule-strong)',
              font: '500 11px/1 var(--font-mono)',
              color: 'var(--chrome-fg-muted)',
            }}
          >
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {/* ── Notifications ─────────────────────────────────────────── */}
          <div className="relative">
            <ChromeIconButton
              label="Notifications"
              active={openMenu === 'notices'}
              onClick={() => setOpenMenu((m) => (m === 'notices' ? null : 'notices'))}
            >
              <IconBell size={18} stroke={1.5} aria-hidden />
              {notices.length > 0 ? (
                <span
                  className="absolute top-1.5 right-2 size-1.5 rounded-full"
                  style={{ background: 'var(--chrome-action)' }}
                  aria-hidden
                />
              ) : null}
            </ChromeIconButton>

            {openMenu === 'notices' ? (
              <Dropdown className="right-0 w-[372px] overflow-hidden">
                <div
                  className="flex items-center justify-between gap-3 border-b px-4 py-3"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                    Notifications
                  </p>
                  <button
                    type="button"
                    className="t-caption"
                    style={{ color: 'var(--text-action)' }}
                  >
                    Mark all read
                  </button>
                </div>
                {notices.map((n) => {
                  const ink = NOTICE_INK[n.kind];
                  return (
                    <Link
                      key={n.id}
                      href={n.href}
                      className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors hover:bg-[var(--surface-inset)]"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-primary)' }}
                    >
                      <span
                        className="grid size-[26px] shrink-0 place-items-center rounded-panel"
                        style={{ background: ink.bg, color: ink.fg }}
                        aria-hidden
                      >
                        {n.kind === 'plain' ? (
                          <IconFileText size={14} stroke={1.5} />
                        ) : (
                          <IconAlertTriangle size={14} stroke={1.5} />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="t-compact block">{n.title}</span>
                        <span
                          className="mt-0.5 block"
                          style={{
                            font: '400 11.5px/1.45 var(--font-ui)',
                            color: 'var(--text-secondary)',
                            textWrap: 'pretty',
                          }}
                        >
                          {n.body}
                        </span>
                      </span>
                      <span
                        className="shrink-0"
                        style={{ font: '400 11px/1.5 var(--font-mono)', color: 'var(--text-tertiary)' }}
                      >
                        {n.time}
                      </span>
                    </Link>
                  );
                })}
                <div className="px-4 py-3" style={{ background: 'var(--surface-sunken)' }}>
                  <Link
                    href="/platform/settings"
                    className="t-caption"
                    style={{ color: 'var(--text-action)' }}
                  >
                    Notification settings
                  </Link>
                </div>
              </Dropdown>
            ) : null}
          </div>

          <ChromeIconButton label="Toggle colour theme" onClick={toggleTheme}>
            {currentTheme === 'dark' ? (
              <IconSun size={18} stroke={1.5} aria-hidden />
            ) : (
              <IconMoon size={18} stroke={1.5} aria-hidden />
            )}
          </ChromeIconButton>

          <span
            aria-hidden
            className="mx-1.5 hidden sm:block"
            style={{ width: 1, height: 22, background: 'var(--chrome-rule)' }}
          />

          {/* ── Account ───────────────────────────────────────────────── */}
          <div className="relative">
            <ChromeButton
              onClick={() => setOpenMenu((m) => (m === 'account' ? null : 'account'))}
              expanded={openMenu === 'account'}
            >
              <span
                className="grid size-[26px] shrink-0 place-items-center rounded-full"
                style={{
                  background: 'var(--chrome-active-bg)',
                  color: 'var(--chrome-action)',
                  font: '500 11px/1 var(--font-mono)',
                }}
                aria-hidden
              >
                {account.initials}
              </span>
              <span className="hidden lg:inline">{account.name}</span>
            </ChromeButton>

            {openMenu === 'account' ? (
              <Dropdown className="right-0 w-[254px] p-1.5">
                <div
                  className="mb-1.5 flex items-center gap-2.5 border-b px-2.5 pt-2.5 pb-3"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
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
                    <span className="t-compact block truncate">{account.name}</span>
                    <span
                      className="block truncate"
                      style={{ font: '400 11px/1.4 var(--font-mono)', color: 'var(--text-tertiary)' }}
                    >
                      {account.email}
                    </span>
                  </span>
                </div>
                <MenuLink href="/platform/profile" icon={IconUser}>
                  Your profile
                </MenuLink>
                <MenuLink href="/platform/settings" icon={IconSettings}>
                  Settings
                </MenuLink>
                <MenuLink href="/platform/sign-in" icon={IconLogout} danger>
                  Sign out
                </MenuLink>
              </Dropdown>
            ) : null}
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1">
        <nav
          aria-label="Platform navigation"
          className="hidden shrink-0 flex-col md:flex"
          style={{
            width: 'var(--nav-w)',
            background: 'var(--chrome-bg)',
            borderRight: '1px solid var(--chrome-rule)',
            transition: 'width var(--duration-base) var(--ease-standard)',
            zIndex: 20,
          }}
        >
          <div className="flex-1 overflow-y-auto px-2.5 pt-4 pb-2">
            {navigation.map((group) => (
              <div key={group.label} className="mb-5">
                {expanded ? (
                  <p
                    className="t-eyebrow mb-2 ml-2.5"
                    style={{ color: 'var(--chrome-fg-faint)' }}
                  >
                    {group.label}
                  </p>
                ) : null}
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    /* Exact match for the index route, prefix match for the
                       rest — otherwise `/platform` stays highlighted on every
                       child page and the nav stops telling you where you are. */
                    const active =
                      item.href === '/platform'
                        ? pathname === '/platform'
                        : pathname.startsWith(item.href);
                    const Icon = CONSOLE_ICONS[item.icon] ?? IconLayoutSidebar;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        className="relative flex h-9 items-center gap-2.5 rounded-panel px-2.5 transition-colors"
                        style={{
                          background: active ? 'var(--chrome-active-bg)' : 'transparent',
                          color: active ? 'var(--chrome-fg)' : 'var(--chrome-fg-muted)',
                          boxShadow: active ? 'var(--chrome-neu)' : undefined,
                          font: '400 var(--text-sm)/1 var(--font-ui)',
                        }}
                      >
                        <span
                          aria-hidden
                          className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full"
                          style={{ background: active ? 'var(--chrome-action)' : 'transparent' }}
                        />
                        <Icon size={18} stroke={1.5} className="shrink-0" aria-hidden />
                        {expanded ? <span className="flex-1 truncate">{item.label}</span> : null}
                        {expanded && item.badge ? (
                          <span
                            className="grid h-[18px] min-w-5 place-items-center rounded-full px-1.5"
                            style={{
                              background: 'var(--chrome-rule-strong)',
                              color: 'var(--chrome-fg)',
                              font: '500 11px/1 var(--font-mono)',
                            }}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div
            className="shrink-0 p-2.5"
            style={{ borderTop: '1px solid var(--chrome-rule)' }}
          >
            <div
              className="flex items-center gap-2.5 rounded-panel p-2"
              style={{ background: 'var(--chrome-hover)', boxShadow: 'var(--chrome-highlight)' }}
            >
              <span
                className="grid size-[30px] shrink-0 place-items-center rounded-full"
                style={{
                  background: 'var(--chrome-active-bg)',
                  color: 'var(--chrome-action)',
                  font: '500 11px/1 var(--font-mono)',
                }}
                aria-hidden
              >
                {account.initials}
              </span>
              {expanded ? (
                <span className="min-w-0 flex-1">
                  <span
                    className="block truncate"
                    style={{ font: '400 12.5px/1.3 var(--font-ui)', color: 'var(--chrome-fg)' }}
                  >
                    {account.name}
                  </span>
                  <span
                    className="block truncate"
                    style={{ font: '400 11px/1.4 var(--font-mono)', color: 'var(--chrome-fg-faint)' }}
                  >
                    {account.role}
                  </span>
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={toggleCollapse}
              className="mt-1.5 flex h-8 w-full items-center gap-2.5 rounded-panel px-2.5 transition-colors"
              style={{
                background: 'transparent',
                color: 'var(--chrome-fg-faint)',
                font: '400 12.5px/1 var(--font-ui)',
              }}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <IconChevronRight size={16} stroke={1.5} className="shrink-0" aria-hidden />
              ) : (
                <IconChevronLeft size={16} stroke={1.5} className="shrink-0" aria-hidden />
              )}
              {expanded ? (
                <>
                  <span>Collapse</span>
                  <kbd
                    className="ml-auto"
                    style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--chrome-fg-faint)' }}
                  >
                    ⌘B
                  </kbd>
                </>
              ) : null}
            </button>
          </div>
        </nav>

        <main className="min-w-0 flex-1 overflow-y-auto" style={{ background: 'var(--surface-base)' }}>
          {children}
        </main>
      </div>

      {/* ── Command palette ────────────────────────────────────────────── */}
      {paletteOpen ? (
        <div
          onClick={closeAll}
          className="fixed inset-0 flex justify-center"
          style={{
            zIndex: 80,
            background: 'var(--surface-overlay)',
            paddingTop: '12vh',
            animation: 'overlay-in var(--duration-fast) linear',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="surface-glass-strong flex w-[620px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-overlay"
            style={{ maxHeight: '62vh', animation: 'panel-in var(--duration-base) var(--ease-out)' }}
          >
            <div
              className="flex items-center gap-2.5 border-b px-4 py-3.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <IconSearch
                size={18}
                stroke={1.5}
                style={{ color: 'var(--text-tertiary)' }}
                aria-hidden
              />
              <input
                ref={paletteInput}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && paletteHits[0]) {
                    router.push(paletteHits[0].key);
                  }
                }}
                placeholder="Jump to a screen, a workspace, or an action"
                className="flex-1 border-none bg-transparent outline-none"
                style={{ font: '400 var(--text-md)/1.4 var(--font-ui)', color: 'var(--text-primary)' }}
              />
              <kbd
                className="h-5 rounded-chip px-1.5"
                style={{
                  border: '1px solid var(--border-subtle)',
                  font: '500 11px/20px var(--font-mono)',
                  color: 'var(--text-tertiary)',
                }}
              >
                ESC
              </kbd>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5">
              {paletteHits.length === 0 ? (
                <p
                  className="t-compact px-2.5 py-6 text-center"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Nothing matches “{query}”.
                </p>
              ) : (
                paletteHits.map((hit) => {
                  const Icon = CONSOLE_ICONS[hit.icon] ?? IconLayoutSidebar;
                  return (
                    <Link
                      key={`${hit.kind}-${hit.key}`}
                      href={hit.key}
                      className="flex w-full items-center gap-3 rounded-panel px-2.5 py-2.5 text-left transition-colors hover:bg-[var(--surface-inset)]"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <span
                        className="grid size-[26px] shrink-0 place-items-center rounded-panel"
                        style={{
                          background: 'var(--surface-sunken)',
                          color: 'var(--text-secondary)',
                        }}
                        aria-hidden
                      >
                        <Icon size={16} stroke={1.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="t-compact block truncate">{hit.label}</span>
                        <span
                          className="block truncate"
                          style={{
                            font: '400 11px/1.4 var(--font-mono)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          {hit.hint}
                        </span>
                      </span>
                      <span
                        className="shrink-0"
                        style={{
                          font: '400 11px/1 var(--font-mono)',
                          letterSpacing: '0.06em',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {hit.kind}
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {pendingWorkspace ? (
        <StartSessionDialog
          workspace={pendingWorkspace}
          onCancel={() => setPendingWorkspace(null)}
          onConfirm={async (reason) => {
            const result = await onStartSession({
              tenantId: pendingWorkspace.id,
              tenantName: pendingWorkspace.name,
              reason,
            });
            if (result.ok) setPendingWorkspace(null);
            return result;
          }}
        />
      ) : null}
    </div>
  );
}

/* ── Chrome-local primitives ────────────────────────────────────────────────
 * These live here rather than in `components/primitives` on purpose. Every
 * primitive in that folder reads the PAGE semantic tokens; these read the
 * CHROME tier, and a Button that silently changed palette depending on where
 * it was mounted would be a worse abstraction than two small local ones.
 */

function ChromeButton({
  children,
  onClick,
  expanded,
  bordered,
}: {
  children: React.ReactNode;
  onClick: () => void;
  expanded: boolean;
  bordered?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="inline-flex h-[34px] items-center gap-2.5 rounded-panel py-0 pr-2.5 pl-2 transition-colors"
      style={{
        border: bordered ? '1px solid var(--chrome-rule)' : '1px solid transparent',
        background: expanded ? 'var(--chrome-hover)' : bordered ? 'var(--chrome-hover)' : 'transparent',
        color: 'var(--chrome-fg)',
        font: '400 var(--text-sm)/1 var(--font-ui)',
      }}
    >
      {children}
    </button>
  );
}

function ChromeIconButton({
  children,
  label,
  onClick,
  active,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative grid size-[34px] place-items-center rounded-panel transition-colors"
      style={{
        border: 'none',
        background: active ? 'var(--chrome-hover)' : 'transparent',
        color: 'var(--chrome-fg-muted)',
      }}
    >
      {children}
    </button>
  );
}

/**
 * A dropdown panel.
 *
 * ⚠ IT USES THE PAGE TOKENS, NOT THE CHROME TOKENS, and that is deliberate
 * even though it hangs off the chrome. A dropdown is a floating sheet over the
 * CONTENT, not a part of the bar it drops from — glass tinted to the chrome
 * would read as the header stretching downward, and its rows would need a
 * third colour scheme for their own hover states. 03 §7b names the popover as
 * a glass surface and glass takes the surface beneath it.
 */
function Dropdown({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`surface-glass-strong absolute top-[42px] rounded-overlay ${className}`}
      style={{ zIndex: OVERLAY_Z, animation: 'panel-in var(--duration-base) var(--ease-out)' }}
    >
      {children}
    </div>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
  danger,
}: {
  href: string;
  icon: TablerIcon;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex h-[34px] w-full items-center gap-3 rounded-panel px-2.5 transition-colors hover:bg-[var(--surface-inset)]"
      style={{
        color: danger ? 'var(--danger-fg)' : 'var(--text-primary)',
        font: '400 var(--text-sm)/1 var(--font-ui)',
      }}
    >
      <Icon size={15} stroke={1.5} className="shrink-0" aria-hidden />
      {children}
    </Link>
  );
}
