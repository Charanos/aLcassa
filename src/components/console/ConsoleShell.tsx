'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import gsap from 'gsap';
import * as Dialog from '@radix-ui/react-dialog';
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconBell,
  IconChevronDown,
  IconChevronLeft,
  IconFileText,
  IconGlobe,
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
import { gsapSafe, prefersReducedMotion } from '@/lib/motion';
import { useToast } from '@/components/primitives/Toast';
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

/**
 * Persists nav-state via a plain Route Handler instead of a Server Action.
 * Server Actions always trigger an RSC tree re-render after they settle —
 * this fetch call does not touch React at all, eliminating the post-animation
 * shell "twinge".
 */
function saveNavPref(nav: NavState): void {
  fetch('/api/console/prefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nav }),
  }).catch(() => {
    // Preference write failures are silent — the cookie will be reset on the
    // next hard navigation and the UI is already correct.
  });
}

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
  onNavStateChange: _onNavStateChange, /* eslint-disable-line @typescript-eslint/no-unused-vars */
  onStartSession,
  onEndSession,
  children,
}: ConsoleShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const pushToast = useToast();

  const [collapsed, setCollapsed] = useState(nav === 'collapsed');
  const [openMenu, setOpenMenu] = useState<'switcher' | 'notices' | 'account' | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingWorkspace, setPendingWorkspace] = useState<ConsoleWorkspace | null>(null);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [, startTransition] = useTransition();
  void startTransition; // retained for future use

  const paletteInput = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navElRef = useRef<HTMLElement>(null);

  const expanded = !collapsed;
  void expanded; // used structurally via `collapsed` inverse

  const closeAll = useCallback(() => {
    setOpenMenu(null);
    setPaletteOpen(false);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      saveNavPref(next ? 'collapsed' : 'expanded');
      return next;
    });
  }, []);

  // Track collapse state in a ref so GSAP effects can read current value
  // without needing to be in their dependency arrays.
  const collapsedRef = useRef(nav === 'collapsed');

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
      {
        key: '/',
        label: 'Marketing site (Landing page)',
        hint: 'Return to public home',
        kind: 'ACTION',
        icon: 'globe',
      },
    ];
    const all = [...screens, ...spaces, ...actions];
    if (!q) return all;
    return all.filter(
      (h) => h.label.toLowerCase().includes(q) || h.hint.toLowerCase().includes(q),
    );
  }, [query, navigation, workspaces]);

  /* ── GSAP Sidebar Navigation Indicator & Motion ──────────────────── */
  const navContainerRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<string, HTMLElement | null>>({});
  const isInitialNavRender = useRef(true);
  const indicatorSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Scopes every nav tween to the nav container: `.revert()` on unmount kills
     anything still running and restores original inline styles, so a tween
     started right before a route/layout swap can never animate a detached or
     recycled node. */
  const navCtx = useRef<gsap.Context | null>(null);
  useEffect(() => {
    navCtx.current = gsap.context(() => {}, navContainerRef);
    return () => navCtx.current?.revert();
  }, []);

  /**
   * Snaps the GSAP indicator to the active nav item.
   * Always reads offsetTop AFTER CSS transitions have settled so measurements
   * are never taken mid-transition (which caused the floating artefact).
   */
  const snapIndicator = useCallback((activeHref: string, immediate = false) => {
    navCtx.current?.add(() => {
      const activeEl = itemRefs.current[activeHref];
      const indicator = indicatorRef.current;

      if (!activeEl || !indicator) {
        if (indicator) gsap.set(indicator, { opacity: 0 });
        return;
      }

      const top = activeEl.offsetTop;
      const height = activeEl.offsetHeight;

      if (immediate || isInitialNavRender.current) {
        gsap.killTweensOf(indicator);
        gsap.set(indicator, { top, height, opacity: 1 });
        isInitialNavRender.current = false;
      } else {
        gsap.killTweensOf(indicator);
        gsapSafe.to(indicator, {
          top,
          height,
          opacity: 1,
          duration: 0.3,
          ease: 'power3.out',
        });
      }
    });
  }, []);

  const updateNavIndicator = useCallback((activeHref: string, immediate = false) => {
    const activeEl = itemRefs.current[activeHref];
    const indicator = indicatorRef.current;

    snapIndicator(activeHref, immediate);

    // Micro-interaction on the active item's icon & label (nav-change only, not collapse)
    if (!immediate && !isInitialNavRender.current && activeEl) {
      const iconSvg = activeEl.querySelector('svg');
      const labelSpan = activeEl.querySelector('.nav-label');
      if (iconSvg) {
        gsapSafe.fromTo(
          iconSvg,
          { scale: 0.75, rotate: -8 },
          { scale: 1, rotate: 0, duration: 0.38, ease: 'back.out(2.4)' }
        );
      }
      if (labelSpan && indicator) {
        gsapSafe.fromTo(
          labelSpan,
          { x: -3, opacity: 0.8 },
          { x: 0, opacity: 1, duration: 0.25, ease: 'power2.out' }
        );
      }
    }
  }, [snapIndicator]);

  // When collapsed state changes: hide indicator immediately, then re-snap
  // once the CSS nav-width transition actually finishes.
  useEffect(() => {
    const indicator = indicatorRef.current;
    const navEl = navElRef.current;
    if (!indicator) return;

    collapsedRef.current = collapsed;

    // Immediately hide to prevent mid-transition floating artefact
    gsap.killTweensOf(indicator);
    gsap.set(indicator, { opacity: 0 });

    if (indicatorSettleTimer.current) clearTimeout(indicatorSettleTimer.current);

    const resnap = () => {
      const activeItem = navigation
        .flatMap((g) => g.items)
        .find((item) =>
          item.href === '/platform'
            ? pathname === '/platform'
            : pathname.startsWith(item.href)
        );
      if (activeItem) snapIndicator(activeItem.href, true);
    };

    // `transitionend` fires when the width transition actually completes —
    // measuring on a fixed delay silently desyncs from the indicator the
    // moment `--duration-base`/the nav's own transition duration changes.
    // The timeout below is a fallback only, for `prefers-reduced-motion`
    // (where the CSS transition is skipped and `transitionend` never fires)
    // and for the rare case the listener is attached after the transition
    // has already started.
    let settled = false;
    const onTransitionEnd = (e: TransitionEvent) => {
      if (e.target !== navEl || e.propertyName !== 'width') return;
      settled = true;
      resnap();
    };

    if (navEl && !prefersReducedMotion()) {
      navEl.addEventListener('transitionend', onTransitionEnd);
      indicatorSettleTimer.current = setTimeout(() => {
        if (!settled) resnap();
      }, 400);
    } else {
      indicatorSettleTimer.current = setTimeout(resnap, 0);
    }

    return () => {
      if (indicatorSettleTimer.current) clearTimeout(indicatorSettleTimer.current);
      navEl?.removeEventListener('transitionend', onTransitionEnd);
    };
  }, [collapsed, pathname, navigation, snapIndicator]);

  // Route change: re-snap indicator (no collapse involved)
  useEffect(() => {
    const activeItem = navigation
      .flatMap((g) => g.items)
      .find((item) =>
        item.href === '/platform'
          ? pathname === '/platform'
          : pathname.startsWith(item.href)
      );
    if (activeItem) updateNavIndicator(activeItem.href, isInitialNavRender.current);
  }, [pathname, navigation, updateNavIndicator]);

  useEffect(() => {
    const handleResize = () => {
      const activeItem = navigation
        .flatMap((g) => g.items)
        .find((item) =>
          item.href === '/platform'
            ? pathname === '/platform'
            : pathname.startsWith(item.href)
        );
      if (activeItem) snapIndicator(activeItem.href, true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pathname, navigation, snapIndicator]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const target = e.currentTarget;
    if (!prefersReducedMotion()) {
      gsap.timeline()
        .to(target, { scale: 0.95, duration: 0.08, ease: 'power1.in' })
        .to(target, { scale: 1, duration: 0.3, ease: 'back.out(2.2)' });
    }
    updateNavIndicator(href);
  };

  const handleNavHover = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const target = e.currentTarget;
    const active =
      href === '/platform' ? pathname === '/platform' : pathname.startsWith(href);
    if (!active) {
      gsapSafe.to(target, { x: 3, duration: 0.18, ease: 'power2.out' });
    }
  };

  const handleNavLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const target = e.currentTarget;
    gsapSafe.to(target, { x: 0, duration: 0.22, ease: 'power2.out' });
  };

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden"
      style={{
        background: 'var(--surface-base)',
        color: 'var(--text-primary)',
        // Server-computed. See note 2 in the header comment.
        ['--nav-w' as string]: collapsed ? '58px' : '240px',
        ['--row-h' as string]: density === 'dense' ? '36px' : '40px',
        ['--row-pad' as string]: density === 'dense' ? '6px' : '8px',
      }}
    >
      {session ? <SupportSessionBanner session={session} onEnd={onEndSession} /> : null}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        ref={headerRef}
        className="relative flex shrink-0 items-center gap-3 px-4 md:px-5"
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
          className="inline-flex shrink-0 items-center gap-3"
          style={{ color: 'var(--chrome-fg)' }}
        >
          <Mark size={20} tone="chrome" title="aLcassa" />
          <span
            className="hidden sm:inline"
            style={{
              font: '500 15px/1 var(--font-ui)',
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
          style={{ width: 1, height: 18, background: 'var(--chrome-rule)' }}
        />

        {/* ── Workspace switcher ─────────────────────────────────────── */}
        <div className="relative hidden shrink-0 md:block">
          <ChromeButton
            onClick={() => setOpenMenu((m) => (m === 'switcher' ? null : 'switcher'))}
            expanded={openMenu === 'switcher'}
            bordered
          >
            <span
              className="grid size-4 place-items-center rounded-[3px]"
              style={{
                background: 'var(--chrome-active-bg)',
                color: 'var(--chrome-action)',
                font: '500 9px/1 var(--font-mono)',
              }}
              aria-hidden
            >
              ◎
            </span>
            <span className="whitespace-nowrap text-[12.5px]">Switch workspace</span>
            <IconChevronDown
              size={13}
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
          className="flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-left transition-all hover:bg-[var(--chrome-hover)] hover:border-[var(--chrome-rule-strong)] md:max-w-[280px]"
          style={{
            border: '1px solid var(--chrome-rule)',
            background: 'transparent',
            color: 'var(--chrome-fg-muted)',
            font: '400 12.5px/1 var(--font-ui)',
          }}
        >
          <IconSearch size={14} stroke={1.5} aria-hidden />
          <span className="flex-1 truncate">Search or jump to...</span>
          <kbd
            className="hidden h-[18px] items-center rounded-[4px] px-1.5 sm:inline-flex"
            style={{
              border: '1px solid var(--chrome-rule-strong)',
              font: '500 10px/1 var(--font-mono)',
              color: 'var(--chrome-fg-muted)',
            }}
          >
            ⌘K
          </kbd>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {/* ── Notifications ─────────────────────────────────────────── */}
          <div className="relative">
            <ChromeIconButton
              label="Notifications"
              active={openMenu === 'notices'}
              onClick={(e) => {
                const icon = e.currentTarget.querySelector('svg');
                if (icon && !prefersReducedMotion()) {
                  gsap.timeline()
                    .to(icon, { rotate: -14, duration: 0.08 })
                    .to(icon, { rotate: 14, duration: 0.08 })
                    .to(icon, { rotate: -8, duration: 0.06 })
                    .to(icon, { rotate: 0, duration: 0.1, ease: 'back.out(2)' });
                }
                setOpenMenu((m) => (m === 'notices' ? null : 'notices'));
              }}
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
                    href="/platform/settings?tab=notifications"
                    className="t-caption"
                    style={{ color: 'var(--text-action)' }}
                  >
                    Notification settings
                  </Link>
                </div>
              </Dropdown>
            ) : null}
          </div>

          <Link
            href="/"
            aria-label="View marketing landing page"
            title="Marketing landing page"
            className="relative grid size-8 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)]"
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--chrome-fg-muted)',
            }}
          >
            <IconGlobe size={18} stroke={1.5} aria-hidden />
          </Link>

          <ChromeIconButton
            label="Toggle colour theme"
            onClick={(e) => {
              const icon = e.currentTarget.querySelector('svg');
              if (icon) {
                gsapSafe.fromTo(
                  icon,
                  { rotate: -120, scale: 0.6 },
                  { rotate: 0, scale: 1, duration: 0.38, ease: 'back.out(2.2)' }
                );
              }
              toggleTheme();
            }}
          >
            {currentTheme === 'dark' ? (
              <IconSun size={18} stroke={1.5} aria-hidden />
            ) : (
              <IconMoon size={18} stroke={1.5} aria-hidden />
            )}
          </ChromeIconButton>

          <span
            aria-hidden
            className="mx-1 hidden sm:block"
            style={{ width: 1, height: 18, background: 'var(--chrome-rule)' }}
          />

          {/* ── Account ───────────────────────────────────────────────── */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu((m) => (m === 'account' ? null : 'account'))}
              aria-expanded={openMenu === 'account'}
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg py-0 pr-2 pl-1 transition-colors hover:bg-[var(--chrome-hover)]"
              style={{
                border: '1px solid transparent',
                color: 'var(--chrome-fg)',
              }}
            >
              <div className="relative size-[24px] shrink-0 overflow-hidden rounded-full border border-[var(--chrome-rule)]">
                <Image
                  src="https://images.unsplash.com/photo-1614023342667-6f060e9d1e04?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjR8fGJsYWNrJTIwbWFufGVufDB8fDB8fHww"
                  alt={account.name}
                  width={24}
                  height={24}
                  className="size-full object-cover"
                />
              </div>
              <span className="hidden text-[12.5px] font-medium lg:inline">{account.name}</span>
              <IconChevronDown
                size={12}
                stroke={1.5}
                style={{ color: 'var(--chrome-fg-muted)' }}
                aria-hidden
              />
            </button>

            {openMenu === 'account' ? (
              <Dropdown className="right-0 w-[254px] p-1.5">
                <div
                  className="mb-1.5 flex items-center gap-2.5 border-b px-2.5 pt-2.5 pb-3"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <div className="relative size-[34px] shrink-0 overflow-hidden rounded-full border border-[var(--border-subtle)]">
                    <Image
                      src="https://images.unsplash.com/photo-1614023342667-6f060e9d1e04?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjR8fGJsYWNrJTIwbWFufGVufDB8fDB8fHww"
                      alt={account.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span
                      className="t-compact block truncate font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {account.name}
                    </span>
                    <span
                      className="block truncate"
                      style={{ font: '400 11px/1.4 var(--font-mono)', color: 'var(--text-tertiary)' }}
                    >
                      {account.email}
                    </span>
                  </span>
                </div>
                <MenuLink href="/" icon={IconGlobe}>
                  Marketing site
                </MenuLink>
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
          ref={navElRef}
          aria-label="Platform navigation"
          className="hidden shrink-0 flex-col md:flex select-none"
          style={{
            width: collapsed ? '58px' : '240px',
            background: 'var(--chrome-bg)',
            borderRight: '1px solid var(--chrome-rule)',
            transition: 'width 260ms cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'width',
            contain: 'layout style',
            zIndex: 20,
          }}
        >
          <div
            ref={navContainerRef}
            className="relative flex-1 overflow-x-hidden overflow-y-auto px-2.5 pt-6 pb-4"
          >
            {/* GSAP Smooth Sliding Active Pill Indicator */}
            <div
              ref={indicatorRef}
              className="pointer-events-none absolute left-2.5 right-2.5 z-0 rounded-lg"
              style={{
                background: 'var(--chrome-active-bg)',
                boxShadow: 'var(--chrome-highlight)',
                opacity: 0,
                willChange: 'top, opacity',
              }}
              aria-hidden="true"
            />

            {navigation.map((group, gIdx) => (
              <div key={group.label} className={gIdx === 0 ? 'mb-4' : 'mb-4 mt-4'}>
                <p
                  className="t-eyebrow mb-2 ml-2 tracking-wider overflow-hidden whitespace-nowrap"
                  style={{
                    color: 'var(--chrome-fg-faint)',
                    fontSize: '10.5px',
                    opacity: collapsed ? 0 : 1,
                    maxHeight: collapsed ? '0px' : '20px',
                    marginBottom: collapsed ? '0px' : '8px',
                    transform: collapsed ? 'translateY(-6px)' : 'translateY(0)',
                    transition:
                      'opacity 180ms ease, max-height 240ms cubic-bezier(0.2,0,0,1), transform 180ms ease, margin-bottom 240ms ease',
                  }}
                >
                  {group.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const active =
                      item.href === '/platform'
                        ? pathname === '/platform'
                        : pathname.startsWith(item.href);
                    const Icon = CONSOLE_ICONS[item.icon] ?? IconLayoutSidebar;
                    return (
                      <Link
                        key={item.href}
                        ref={(el) => {
                          itemRefs.current[item.href] = el;
                        }}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        onClick={(e) => handleNavClick(e, item.href)}
                        onMouseEnter={(e) => handleNavHover(e, item.href)}
                        onMouseLeave={handleNavLeave}
                        className="group relative z-10 flex h-[36px] cursor-pointer items-center rounded-lg select-none transition-colors hover:text-[var(--chrome-fg)]"
                        style={{
                          paddingLeft: collapsed ? '11px' : '10px',
                          paddingRight: collapsed ? '11px' : '10px',
                          gap: collapsed ? '0px' : '10px',
                          color: active ? 'var(--chrome-fg)' : 'var(--chrome-fg-muted)',
                          font: active ? '500 13px/1 var(--font-ui)' : '400 13px/1 var(--font-ui)',
                          transition:
                            'padding 240ms cubic-bezier(0.2,0,0,1), gap 240ms cubic-bezier(0.2,0,0,1), color 150ms ease',
                        }}
                      >
                        <span className="flex size-4 shrink-0 items-center justify-center">
                          <Icon
                            size={16}
                            stroke={active ? 1.8 : 1.5}
                            className="transition-colors"
                            style={{ color: active ? 'var(--chrome-action)' : 'currentColor' }}
                            aria-hidden
                          />
                        </span>
                        <span
                          className="nav-label min-w-0 flex-1 truncate overflow-hidden whitespace-nowrap"
                          style={{
                            opacity: collapsed ? 0 : 1,
                            maxWidth: collapsed ? '0px' : '160px',
                            transform: collapsed ? 'translateX(-8px)' : 'translateX(0)',
                            pointerEvents: collapsed ? 'none' : 'auto',
                            transition:
                              'opacity 180ms ease, max-width 240ms cubic-bezier(0.2,0,0,1), transform 200ms cubic-bezier(0.2,0,0,1)',
                          }}
                        >
                          {item.label}
                        </span>
                        {item.badge ? (
                          <span
                            className="grid h-4 min-w-4 place-items-center rounded-full px-1 overflow-hidden"
                            style={{
                              opacity: collapsed ? 0 : 1,
                              transform: collapsed ? 'scale(0.4)' : 'scale(1)',
                              pointerEvents: collapsed ? 'none' : 'auto',
                              background: active ? 'var(--chrome-action)' : 'var(--chrome-rule-strong)',
                              color: active ? 'var(--chrome-bg)' : 'var(--chrome-fg)',
                              font: '500 10px/1 var(--font-mono)',
                              transition: 'opacity 160ms ease, transform 200ms cubic-bezier(0.2,0,0,1)',
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
            className="shrink-0 p-2"
            style={{ borderTop: '1px solid var(--chrome-rule)' }}
          >
            {/* Quick exit to public marketing site */}
            <Link
              href="/"
              className="flex items-center rounded-lg p-1.5 text-[12px] transition-all hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)]"
              style={{
                color: 'var(--chrome-fg-muted)',
                gap: collapsed ? '0px' : '10px',
                paddingLeft: collapsed ? '7px' : '8px',
                paddingRight: collapsed ? '7px' : '8px',
                transition: 'gap 240ms cubic-bezier(0.2,0,0,1), padding 240ms cubic-bezier(0.2,0,0,1)',
              }}
              title={collapsed ? 'Public marketing site' : undefined}
            >
              <span className="flex size-6 shrink-0 items-center justify-center">
                <IconArrowUpRight size={15} stroke={1.5} aria-hidden />
              </span>
              <span
                className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
                style={{
                  opacity: collapsed ? 0 : 1,
                  maxWidth: collapsed ? '0px' : '140px',
                  transform: collapsed ? 'translateX(-6px)' : 'translateX(0)',
                  pointerEvents: collapsed ? 'none' : 'auto',
                  transition:
                    'opacity 180ms ease, max-width 240ms cubic-bezier(0.2,0,0,1), transform 200ms cubic-bezier(0.2,0,0,1)',
                }}
              >
                Public site
              </span>
            </Link>

            <div
              className="flex items-center rounded-lg p-1.5 transition-all hover:bg-[var(--chrome-hover)]"
              style={{
                background: 'var(--chrome-hover)',
                boxShadow: 'var(--chrome-highlight)',
                gap: collapsed ? '0px' : '10px',
                paddingLeft: collapsed ? '7px' : '8px',
                paddingRight: collapsed ? '7px' : '8px',
                transition: 'gap 240ms cubic-bezier(0.2,0,0,1), padding 240ms cubic-bezier(0.2,0,0,1)',
              }}
            >
              <div className="relative size-6 shrink-0 overflow-hidden rounded-full border border-[var(--chrome-rule)]">
                <Image
                  src="https://images.unsplash.com/photo-1614023342667-6f060e9d1e04?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MjR8fGJsYWNrJTIwbWFufGVufDB8fDB8fHww"
                  alt={account.name}
                  width={24}
                  height={24}
                  className="size-full object-cover"
                />
              </div>
              <span
                className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
                style={{
                  opacity: collapsed ? 0 : 1,
                  maxWidth: collapsed ? '0px' : '140px',
                  transform: collapsed ? 'translateX(-6px)' : 'translateX(0)',
                  pointerEvents: collapsed ? 'none' : 'auto',
                  transition:
                    'opacity 180ms ease, max-width 240ms cubic-bezier(0.2,0,0,1), transform 200ms cubic-bezier(0.2,0,0,1)',
                }}
              >
                <span
                  className="block truncate text-[12px] font-medium"
                  style={{ color: 'var(--chrome-fg)' }}
                >
                  {account.name}
                </span>
                <span
                  className="block truncate text-[10px] font-mono"
                  style={{ color: 'var(--chrome-fg-faint)' }}
                >
                  {account.role}
                </span>
              </span>
            </div>

            <button
              type="button"
              onClick={toggleCollapse}
              className="mt-1 flex h-7 w-full cursor-pointer items-center rounded-lg text-[11.5px] transition-all hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)]"
              style={{
                background: 'transparent',
                color: 'var(--chrome-fg-faint)',
                paddingLeft: collapsed ? '11px' : '8px',
                paddingRight: collapsed ? '11px' : '8px',
                gap: collapsed ? '0px' : '8px',
                transition: 'gap 240ms cubic-bezier(0.2,0,0,1), padding 240ms cubic-bezier(0.2,0,0,1)',
              }}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                <IconChevronLeft
                  size={14}
                  stroke={1.5}
                  style={{
                    transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 260ms cubic-bezier(0.2,0,0,1)',
                  }}
                  aria-hidden
                />
              </span>
              <span
                className="flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap"
                style={{
                  opacity: collapsed ? 0 : 1,
                  maxWidth: collapsed ? '0px' : '150px',
                  transform: collapsed ? 'translateX(-6px)' : 'translateX(0)',
                  pointerEvents: collapsed ? 'none' : 'auto',
                  transition:
                    'opacity 180ms ease, max-width 240ms cubic-bezier(0.2,0,0,1), transform 200ms cubic-bezier(0.2,0,0,1)',
                }}
              >
                <span>Collapse</span>
                <kbd
                  className="ml-auto text-[10px] font-mono"
                  style={{ color: 'var(--chrome-fg-faint)' }}
                >
                  ⌘B
                </kbd>
              </span>
            </button>
          </div>
        </nav>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto" style={{ background: 'var(--surface-base)' }}>
          {children}
        </main>
      </div>

      {/* ── Command palette ────────────────────────────────────────────── */}
      <Dialog.Root
        open={paletteOpen}
        onOpenChange={(next) => {
          if (next) setPaletteOpen(true);
          else closeAll();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay
            ref={(el) => {
              if (el) gsapSafe.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
            }}
            className="fixed inset-0 flex justify-center"
            style={{
              zIndex: 80,
              background: 'var(--surface-overlay)',
              paddingTop: '12vh',
            }}
          />
          <Dialog.Content
            ref={(el) => {
              if (el) {
                gsapSafe.fromTo(
                  el,
                  { opacity: 0, y: -24, scale: 0.95 },
                  { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power3.out' }
                );
              }
            }}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              paletteInput.current?.focus();
            }}
            aria-describedby={undefined}
            className="surface-glass-strong fixed top-[12vh] left-1/2 z-[81] flex w-[620px] max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col overflow-hidden rounded-overlay"
            style={{ maxHeight: '62vh' }}
          >
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
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
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

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
            if (result.ok) {
              setPendingWorkspace(null);
              pushToast({
                title: `Support session started in ${pendingWorkspace.name}`,
                description: 'Read-only, expires in 30 minutes.',
                tone: 'success',
              });
            }
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
      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg py-0 pr-2.5 pl-2 transition-colors hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)]"
      style={{
        border: bordered ? '1px solid var(--chrome-rule)' : '1px solid transparent',
        background: expanded ? 'var(--chrome-hover)' : bordered ? 'var(--chrome-hover)' : 'transparent',
        color: 'var(--chrome-fg)',
        font: '400 12.5px/1 var(--font-ui)',
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
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative grid size-8 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)]"
      style={{
        border: 'none',
        background: active ? 'var(--chrome-hover)' : 'transparent',
        color: active ? 'var(--chrome-fg)' : 'var(--chrome-fg-muted)',
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
/**
 * A dropdown panel with custom GSAP entrance and staggered item reveal.
 */
function Dropdown({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsapSafe.fromTo(
      ref.current,
      { opacity: 0, y: -10, scale: 0.95, transformOrigin: 'top right' },
      { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: 'back.out(2)' }
    );

    const items = ref.current.querySelectorAll('a, button');
    if (items.length > 0) {
      gsapSafe.fromTo(
        items,
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, stagger: 0.025, duration: 0.2, ease: 'power2.out', delay: 0.04 }
      );
    }
  }, []);

  return (
    <div
      ref={ref}
      className={`surface-glass-strong absolute top-[42px] rounded-overlay ${className}`}
      style={{
        color: 'var(--text-primary)',
        zIndex: OVERLAY_Z,
        boxShadow: 'var(--glass-highlight), var(--shadow-md)',
      }}
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
      onMouseEnter={(e) => {
        const icon = e.currentTarget.querySelector('svg');
        if (icon) gsapSafe.to(icon, { x: 2, duration: 0.15, ease: 'power1.out' });
      }}
      onMouseLeave={(e) => {
        const icon = e.currentTarget.querySelector('svg');
        if (icon) gsapSafe.to(icon, { x: 0, duration: 0.2, ease: 'power1.out' });
      }}
      className="flex h-[34px] w-full items-center gap-3 rounded-panel px-2.5 transition-colors hover:bg-[var(--surface-inset)]"
      style={{
        color: danger ? 'var(--danger-fg)' : 'var(--text-primary)',
        font: '400 var(--text-sm)/1 var(--font-ui)',
      }}
    >
      <Icon size={15} stroke={1.5} className="shrink-0 transition-transform" aria-hidden />
      {children}
    </Link>
  );
}
