'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import * as Dialog from '@radix-ui/react-dialog';
import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconArrowRight,
  IconBell,
  IconChevronDown,
  IconChevronLeft,
  IconCircleDot,
  IconFileText,
  IconLayoutSidebar,
  IconLogout,
  IconSearch,
  IconUser,
  IconHexagon,
  IconLayersIntersect,
  IconCube,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { Avatar } from '@/components/primitives/Avatar';
import { Mark } from '@/components/brand/Mark';
import { CONSOLE_ICONS } from './icons';
import { ConsoleMobileNav } from './ConsoleMobileNav';
import { SupportSessionBanner } from './SupportSessionBanner';
import { StartSessionDialog } from './StartSessionDialog';
import { ProvisionWorkspaceDialog } from './ProvisionWorkspaceDialog';
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
import type { IsolationStatus } from '@/lib/console/data';

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

/* ── Floating-rail geometry ───────────────────────────────────────────────
 * Four numbers that have to agree with each other, so they are declared once
 * instead of being typed into a style object twice. The layout track is
 * `width + INSET * 2`; if those two ever disagree the panel sits off-centre
 * in its own gutter, which is the kind of two-pixel wrongness that is very
 * hard to see and impossible to unsee.
 */
const RAIL_INSET = 12;
/*
 * ⚠ 60 AND 248 RECONCILE A DRIFT. `chromeStyle()` in `lib/console/session.ts`
 * has always published `--nav-w` as 60/248 while this file laid the rail out
 * at 58/240 — two sources of truth for one measurement, which stayed
 * invisible only because nothing ever read the custom property. Matching them
 * costs two pixels and removes the trap. The extra 8px on the open rail is
 * also the one place labels were tight: "Support sessions" plus its badge is
 * the longest row in the navigation.
 */
const RAIL_W = 60;
const RAIL_W_OPEN = 248;
/* Softer than `--radius-lg` (12px). At this height the panel reads as a tall
 * card, and a tall card wants a rounder corner than a button does or the ends
 * look pinched. Raised from 16 to 20 during the floating-rail polish — the
 * value was inlined at the call site at the time, which orphaned this constant
 * and split the geometry across two places again. */
const RAIL_RADIUS = 20;

export type ConsoleShellProps = {
  navigation: ConsoleNavGroup[];
  workspaces: ConsoleWorkspace[];
  notices: ConsoleNotice[];
  account: ConsoleAccount;
  nav: NavState;
  density: Density;
  session: SupportSession | null;
  /** Sheet 05: isolation state sits under the navigation permanently, rather
   *  than being something the operator has to go and check. */
  isolation: IsolationStatus;
  /*
   * ⚠ `onNavStateChange` USED TO LIVE HERE AND THE SHELL NEVER CALLED IT.
   * It was a required prop, the layout dutifully passed the `setNavState`
   * server action into it, and the destructure below silenced the unused
   * warning with an eslint-disable — three files cooperating to plumb a
   * value nowhere. `saveNavPref` replaced it deliberately (see that
   * function for why a Route Handler beats a Server Action for a cosmetic
   * cookie), and the action itself is gone: an exported `'use server'`
   * function is a POST-able endpoint whether or not anything calls it.
   */
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
  nav,
  density,
  session,
  isolation,
  onStartSession,
  onEndSession,
  children,
}: ConsoleShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pushToast = useToast();

  const isolationOk =
    isolation.tablesPoliced === isolation.tablesTotal &&
    isolation.crossTenantAttempts30d === isolation.crossTenantRefused30d;

  // `/platform/tenants/new` redirects to `?provision=1` rather than owning a
  // route, so the flow keeps a deep-linkable URL from any console page
  // without the modal needing its own server component parent.
  const provisionOpen = searchParams.get('provision') === '1';
  const closeProvision = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('provision');
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  /*
   * ── THE RAIL HAS TWO STATES AND THEY ARE NOT THE SAME THING ─────────────
   *
   * `locked` is the PREFERENCE — what the operator chose, what the cookie
   * holds, and what the server renders at on the next hard navigation.
   * `peeking` is a TRANSIENT hover expansion that exists only while the
   * pointer (or keyboard focus) is inside a locked-collapsed rail.
   *
   * Gmail's behaviour, and the reason it works: the rail sits collapsed, it
   * opens under the pointer so you can read a label without committing to
   * anything, and the button is what makes a choice stick. Peeking therefore
   * NEVER calls `saveNavPref` — a preference that changed because somebody's
   * cursor crossed the rail on the way to the page is not a preference.
   *
   * `collapsed` below stays the VISUAL flag, because roughly thirty style
   * branches in this file already branch on it and they all want "is the rail
   * narrow right now", not "what did the operator choose".
   */
  const [locked, setLocked] = useState<NavState>(nav);
  const [peeking, setPeeking] = useState(false);

  const lockedCollapsed = locked === 'collapsed';
  const collapsed = lockedCollapsed && !peeking;

  /*
   * The hue of the bell's unread dot: the most severe thing waiting behind
   * it. `danger` outranks `warning` outranks everything else, matching the
   * order `NOTICE_INK` already establishes for the rows themselves — so the
   * dot and the first chip the operator sees after opening it agree.
   */
  const noticeAccent = useMemo(() => {
    if (notices.some((n) => n.kind === 'danger')) return 'var(--danger-fg)';
    if (notices.some((n) => n.kind === 'warning')) return 'var(--warning-fg)';
    /* Nothing needs acting on, but something is unread. The accent mark is
       the system's "look here" that carries no severity of its own. */
    return 'var(--accent-mark)';
  }, [notices]);
  const [openMenu, setOpenMenu] = useState<'switcher' | 'notices' | 'account' | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pendingWorkspace, setPendingWorkspace] = useState<ConsoleWorkspace | null>(null);

  /** The highlighted row in the palette, driven by the arrow keys and by
   *  hover so the two can never disagree about what Enter will open. */
  const [paletteIndex, setPaletteIndex] = useState(0);
  const selectedHitRef = useRef<HTMLAnchorElement>(null);

  const paletteInput = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navElRef = useRef<HTMLElement>(null);

  /**
   * ⚠ WHICH CONTROL OPENED THE CURRENT MENU, SO FOCUS CAN GO BACK TO IT.
   *
   * The three top-bar menus are hand-rolled rather than Radix, so nothing was
   * managing focus. Escape closed them and left focus on `<body>` — a
   * keyboard operator pressed Escape and lost their place entirely, with the
   * next Tab starting again from the top of the document. Returning focus to
   * the trigger is the one thing every menu implementation owes the keyboard,
   * and it is the difference between "dismissed" and "vanished".
   */
  const menuTriggerRef = useRef<HTMLElement | null>(null);

  const closeAll = useCallback((restoreFocus = false) => {
    setOpenMenu(null);
    setPaletteOpen(false);
    if (restoreFocus) menuTriggerRef.current?.focus();
    menuTriggerRef.current = null;
  }, []);

  /** Records the trigger, then toggles. Used by all three top-bar menus so
   *  none of them can be the one that forgets. */
  const toggleMenu = useCallback(
    (kind: 'switcher' | 'notices' | 'account', el: HTMLElement | null) => {
      setOpenMenu((current) => {
        const next = current === kind ? null : kind;
        menuTriggerRef.current = next ? el : null;
        return next;
      });
    },
    [],
  );

  /**
   * The button and ⌘B. This is the only thing that writes the preference.
   *
   * ⚠ IT CLEARS THE PEEK. Locking the rail open while the pointer is still
   * inside it would otherwise leave `peeking` true underneath, and the rail
   * would appear to collapse on mouse-out despite having just been locked
   * open — the exact opposite of what the operator asked for.
   */
  const toggleCollapse = useCallback(() => {
    setPeeking(false);
    setLocked((prev) => {
      const next: NavState = prev === 'collapsed' ? 'expanded' : 'collapsed';
      saveNavPref(next);
      return next;
    });
  }, []);

  /*
   * ⚠ OPENING IS DELAYED, CLOSING IS NOT. This asymmetry is the difference
   * between a rail that feels intentional and one that flickers.
   *
   * The rail runs the full height of the window down the left edge, so the
   * pointer crosses it constantly — on the way to the browser's own chrome,
   * on the way back from a tab, on any diagonal toward the top-left of the
   * page. Opening instantly means a 182px panel flashing open and shut
   * several times a minute for someone who never asked for it. A short hold
   * asks the pointer to mean it.
   *
   * Closing has no delay because a rail that lingers after the pointer has
   * left is covering content the operator is already trying to read.
   */
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const PEEK_DELAY_MS = 140;

  const cancelPeekTimer = useCallback(() => {
    if (peekTimer.current) {
      clearTimeout(peekTimer.current);
      peekTimer.current = null;
    }
  }, []);

  /* Peeking is meaningless on an expanded rail, and a stale `true` left over
     from before a lock would fight the next collapse. */
  const startPeek = useCallback(() => {
    if (locked !== 'collapsed') return;
    cancelPeekTimer();
    peekTimer.current = setTimeout(() => setPeeking(true), PEEK_DELAY_MS);
  }, [locked, cancelPeekTimer]);

  const endPeek = useCallback(() => {
    cancelPeekTimer();
    setPeeking(false);
  }, [cancelPeekTimer]);

  /* Keyboard focus must NOT wait — a tab landing on a clipped icon needs the
     label immediately, and focus is unambiguous intent in a way that a
     passing cursor is not. */
  const focusPeek = useCallback(() => {
    if (locked !== 'collapsed') return;
    cancelPeekTimer();
    setPeeking(true);
  }, [locked, cancelPeekTimer]);

  /* An unmount mid-hover would otherwise leave a timer to fire into a dead
     component. */
  useEffect(() => cancelPeekTimer, [cancelPeekTimer]);

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
      if (e.key === 'Escape') closeAll(true);
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

  /*
   * A new query means a new list, and an index left pointing at row six of a
   * list that now has two would send Enter somewhere the operator never saw.
   * Reset on every change of the result set, not just of the query string.
   */
  useEffect(() => {
    setPaletteIndex(0);
  }, [query, paletteOpen]);

  /* Keep the highlighted row in view when the arrows walk past the fold.
     `block: 'nearest'` scrolls the minimum needed, so the list does not jump
     the selection to the middle on every keypress. */
  useEffect(() => {
    selectedHitRef.current?.scrollIntoView({ block: 'nearest' });
  }, [paletteIndex]);

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
        key: '/platform?provision=1',
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
    return all.filter((h) => h.label.toLowerCase().includes(q) || h.hint.toLowerCase().includes(q));
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

  const updateNavIndicator = useCallback(
    (activeHref: string, immediate = false) => {
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
            { scale: 1, rotate: 0, duration: 0.38, ease: 'back.out(2.4)' },
          );
        }
        if (labelSpan && indicator) {
          gsapSafe.fromTo(
            labelSpan,
            { x: -3, opacity: 0.8 },
            { x: 0, opacity: 1, duration: 0.25, ease: 'power2.out' },
          );
        }
      }
    },
    [snapIndicator],
  );

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
          item.href === '/platform' ? pathname === '/platform' : pathname.startsWith(item.href),
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
        item.href === '/platform' ? pathname === '/platform' : pathname.startsWith(item.href),
      );
    if (activeItem) updateNavIndicator(activeItem.href, isInitialNavRender.current);
  }, [pathname, navigation, updateNavIndicator]);

  useEffect(() => {
    const handleResize = () => {
      const activeItem = navigation
        .flatMap((g) => g.items)
        .find((item) =>
          item.href === '/platform' ? pathname === '/platform' : pathname.startsWith(item.href),
        );
      if (activeItem) snapIndicator(activeItem.href, true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [pathname, navigation, snapIndicator]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const target = e.currentTarget;
    if (!prefersReducedMotion()) {
      gsap
        .timeline()
        .to(target, { scale: 0.95, duration: 0.08, ease: 'power1.in' })
        .to(target, { scale: 1, duration: 0.3, ease: 'back.out(2.2)' });
    }
    updateNavIndicator(href);
  };

  const handleNavHover = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    const target = e.currentTarget;
    const active = href === '/platform' ? pathname === '/platform' : pathname.startsWith(href);
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
        /*
         * Server-computed. See note 2 in the header comment.
         *
         * ⚠ IT TRACKS THE LOCKED WIDTH, NOT THE VISIBLE ONE. This is the
         * rail's FOOTPRINT — what the page has to lay out around — and a peek
         * deliberately does not change that (it overlays instead). Wiring it
         * to `collapsed` would make the variable oscillate every time a
         * pointer crossed the rail, which is the one thing a layout variable
         * must never do.
         *
         * ⚠ NOTHING READS IT TODAY. `grep 'var(--nav-w)'` returns no hits,
         * and `chromeStyle` in `lib/console/session.ts` publishes a DIFFERENT
         * pair of numbers for the same variable (60/248 against 58/240 here)
         * — two sources of truth that have already drifted apart because
         * neither has a consumer to keep them honest. Before using this from
         * CSS, reconcile the two.
         */
        ['--nav-w' as string]: `${lockedCollapsed ? RAIL_W : RAIL_W_OPEN}px`,
        ['--row-h' as string]: density === 'dense' ? '36px' : '40px',
        ['--row-pad' as string]: density === 'dense' ? '6px' : '8px',
      }}
    >
      {/* Sheet 13: skip link is stop 01 — invisible until it has focus, then
          sits above everything else so a keyboard reader never has to tab
          through the header and sidebar to reach the page. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:rounded-overlay focus:px-4 focus:py-2.5"
        style={{
          background: 'var(--blue-500)',
          color: 'var(--chrome-fg)',
          font: '500 13px/1 var(--font-ui)',
        }}
      >
        Skip to content
      </a>

      {session ? <SupportSessionBanner session={session} onEnd={onEndSession} /> : null}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        ref={headerRef}
        data-slot="toolbar"
        /*
         * ⚠ TABBING OUT OF AN OPEN MENU CLOSES IT.
         *
         * The mousedown listener already dismissed these menus when a POINTER
         * went elsewhere, and nothing did the equivalent for the keyboard: Tab
         * past the last item and focus moved on into the page while the menu
         * stayed open above it — a panel covering content, anchored to nothing
         * the operator was looking at, dismissable only by reaching for the
         * mouse. React's `onBlur` bubbles (unlike the native event), so this
         * one handler covers every control and every item inside all three
         * menus.
         *
         * `relatedTarget` is where focus is GOING. It is null when focus
         * leaves the document entirely — switching tabs, clicking the browser
         * chrome — and in that case the menu is deliberately left alone,
         * because returning to the window should not have silently changed
         * what was on screen.
         */
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null;
          if (!next) return;
          if (!e.currentTarget.contains(next)) setOpenMenu(null);
        }}
        className="relative z-50 flex h-[var(--topbar-height)] shrink-0 items-center justify-between border-b px-4 lg:px-6"
        style={{
          background: 'var(--chrome-bg)',
          borderColor: 'var(--chrome-rule)',
        }}
      >
        {/* Subtle Architectural Top Bar Backdrop Art */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden select-none"
          aria-hidden="true"
        >
          <div
            className="absolute -top-14 left-10 size-[200px] rounded-full opacity-[0.05] blur-[60px]"
            style={{ background: 'var(--blue-500)' }}
          />
          <div
            className="absolute -top-14 right-24 size-[180px] rounded-full opacity-[0.035] blur-[60px]"
            style={{ background: 'var(--orange-500)' }}
          />
          <IconLayersIntersect
            size={110}
            stroke={0.8}
            className="absolute -top-4 left-[18%] rotate-[18deg] text-[var(--chrome-fg-muted)] opacity-[0.0418]"
          />
          <IconCube
            size={90}
            stroke={0.7}
            className="absolute right-[26%] -bottom-6 -rotate-[14deg] text-[var(--chrome-fg-muted)] opacity-[0.08]"
          />
        </div>
        {/* ── Left: Logo & Switcher ────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/platform"
            className="inline-flex shrink-0 items-center gap-3"
            style={{ color: 'var(--chrome-fg)' }}
          >
            <span className="inline-flex md:hidden">
              <Mark size={20} tone="inverse" title="aLcassa" />
            </span>
            <span className="hidden md:inline-flex">
              <Mark size={20} tone="brand" title="aLcassa" />
            </span>
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
              onClick={(e) => toggleMenu('switcher', e.currentTarget)}
              expanded={openMenu === 'switcher'}
              bordered
            >
              {/*
              ⚠ THIS WAS THE LITERAL CHARACTER `◎`.

              A Unicode glyph standing in for an icon in a bar where every
              other mark is Tabler: it renders at whatever weight and baseline
              the user's font stack decides, ignores `stroke`, and lands
              differently on Windows, macOS and Linux. It also could not take
              a colour independently of its label.

              A real icon can, and does — this is the one always-visible spot
              in the top bar where brand blue reads as identity rather than as
              a state, which is what keeps the bar from being a single flat
              navy note.
            */}
              <IconCircleDot
                size={15}
                stroke={1.5}
                className="shrink-0"
                style={{ color: 'var(--chrome-action)' }}
                aria-hidden
              />
              <span className="text-sm whitespace-nowrap">Switch workspace</span>
              <IconChevronDown
                size={13}
                stroke={1.25}
                className={`transition-transform duration-200 ${openMenu === 'switcher' ? 'rotate-180' : ''}`}
                style={{ color: 'var(--chrome-fg-muted)' }}
                aria-hidden
              />
            </ChromeButton>

            {openMenu === 'switcher' ? (
              <Dropdown className="left-0 w-[380px] p-2">
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
                    className="flex w-full items-center gap-3 rounded-panel px-2.5 py-2.5 text-left transition-colors hover:bg-[rgba(0,0,0,0.03)]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <span
                      className="grid size-[30px] shrink-0 place-items-center rounded-panel"
                      style={{
                        background: 'var(--blue-50)',
                        color: 'var(--blue-600)',
                        font: '600 12px/1 var(--font-mono)',
                      }}
                      aria-hidden
                    >
                      {w.initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className="block truncate text-base font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {w.name}
                      </span>
                      <span
                        className="mt-[2px] block truncate"
                        style={{
                          font: '400 12px/1.4 var(--font-mono)',
                          color: 'var(--text-tertiary)',
                        }}
                      >
                        {w.slug}
                      </span>
                    </span>
                    <span
                      style={{ font: '500 11px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                    >
                      {w.plan}
                    </span>
                  </button>
                ))}
                <p
                  className="mx-2.5 mt-1.5 mb-1 border-t pt-3 text-sm leading-relaxed font-medium"
                  style={{ borderColor: 'rgba(0,0,0,0.06)', color: 'var(--text-tertiary)' }}
                >
                  Selecting a workspace opens a confirmation. It never navigates straight in.
                </p>
              </Dropdown>
            ) : null}
          </div>
        </div>

        {/* ── Center: Command palette trigger ───────────────────────────── */}
        <div className="hidden flex-1 justify-center px-4 md:flex">
          <button
            type="button"
            onClick={() => {
              setPaletteOpen(true);
              setQuery('');
              setOpenMenu(null);
            }}
            className="group flex h-[32px] w-full max-w-[340px] cursor-pointer items-center gap-2.5 rounded-overlay px-2.5 text-left transition-all hover:border-[var(--chrome-rule-strong)] hover:bg-[var(--chrome-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chrome-rule-strong)]"
            style={{
              border: '1px solid var(--chrome-rule)',
              background: 'rgba(255, 255, 255, 0.02)',
              color: 'var(--chrome-fg-muted)',
              font: '400 12.5px/1 var(--font-ui)',
              boxShadow: 'var(--chrome-neu)',
            }}
          >
            <IconSearch
              size={14}
              stroke={1.3}
              className="transition-colors group-hover:text-[var(--chrome-fg)]"
              style={{ color: 'var(--chrome-fg-faint)' }}
              aria-hidden
            />
            <span className="flex-1 truncate text-sm transition-colors group-hover:text-[var(--chrome-fg)]">
              Search or jump to...
            </span>
            <kbd
              className="hidden h-[22px] items-center gap-[3px] rounded-panel px-1.5 select-none sm:inline-flex"
              style={{
                background: 'color-mix(in oklab, var(--chrome-active-bg) 60%, transparent)',
                border: '1px solid var(--chrome-rule-strong)',
                font: '500 11px/1 var(--font-mono)',
                color: 'var(--chrome-fg)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 1px rgba(0,0,0,0.2)',
              }}
            >
              <span style={{ opacity: 0.5, fontSize: '10px' }}>⌘</span>K
            </kbd>
          </button>
        </div>

        {/* ── Right: Actions ────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center gap-1.5">
          {/* ── Notifications ─────────────────────────────────────────── */}
          <div className="relative">
            <ChromeIconButton
              label="Notifications"
              active={openMenu === 'notices'}
              onClick={(e) => {
                const icon = e.currentTarget.querySelector('svg');
                if (icon && !prefersReducedMotion()) {
                  gsap
                    .timeline()
                    .to(icon, { rotate: -14, duration: 0.08 })
                    .to(icon, { rotate: 14, duration: 0.08 })
                    .to(icon, { rotate: -8, duration: 0.06 })
                    .to(icon, { rotate: 0, duration: 0.1, ease: 'back.out(2)' });
                }
                toggleMenu('notices', e.currentTarget);
              }}
            >
              <IconBell size={18} stroke={1.25} aria-hidden />
              {notices.length > 0 ? (
                /*
                 * ⚠ THE DOT NOW REPORTS THE WORST THING IN THE LIST.
                 *
                 * It was `--blue-400` regardless of contents, with a
                 * permanent `animate-ping`. Both were wrong in the same
                 * direction: blue reads INFORMATIONAL, and the fixture behind
                 * it opens with a declined payment and a workspace at 94% of
                 * its events limit. An operator glancing at that bell was
                 * being told "something happened" in the one hue the system
                 * reserves for "nothing is wrong".
                 *
                 * 03 §14's taxonomy already answers this — oxide refuses,
                 * ochre resolves — so the dot takes the hue of the most
                 * severe unread notice and inherits its meaning. On a bar
                 * this monotone that is also where the warmth comes from:
                 * colour earned by state rather than sprinkled on.
                 *
                 * ⚠ THE PING IS GONE. An animation that never stops is not an
                 * alert, it is wallpaper — and this is a console somebody sits
                 * in all day. The hue carries it.
                 */
                <span
                  className="pointer-events-none absolute top-2 right-2 flex size-2 items-center justify-center"
                  aria-hidden
                >
                  <span
                    className="relative size-1.5 rounded-full"
                    style={{
                      background: noticeAccent,
                      boxShadow: `0 0 6px ${noticeAccent}`,
                    }}
                  />
                </span>
              ) : null}
            </ChromeIconButton>

            {openMenu === 'notices' ? (
              <Dropdown className="right-0 w-[380px] overflow-hidden">
                <div
                  className="flex items-center justify-between gap-3 border-b px-5 py-4"
                  style={{ borderColor: 'rgba(0,0,0,0.06)' }}
                >
                  <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
                    Notifications
                  </p>
                  {/*
                    ⚠ "MARK ALL READ" IS DELIBERATELY ABSENT UNTIL THERE IS A
                    READ STATE TO WRITE.
                    `Console-Shell` draws it, and it was here as a
                    `<button type="button">` with no `onClick` — it rendered,
                    it took a click, and it did nothing. `notices` is still a
                    module-scope literal in the console layout, whose own note
                    says it becomes "a platform notifications query, once that
                    table exists"; there is no read flag anywhere to flip.
                    01 D-05's rule for unbuilt surfaces is that a placeholder
                    is "not disabled and not a dead link" — a control that
                    silently absorbs a click is worse than either, because it
                    teaches the operator that the console lies. It returns
                    with the notifications table, wired to it.
                  */}
                </div>
                <div className="scrollbar-slim max-h-[360px] overflow-y-auto">
                  {notices.map((n) => {
                    const ink = NOTICE_INK[n.kind];
                    return (
                      <Link
                        key={n.id}
                        href={n.href}
                        className="group flex w-full items-start gap-4 border-b px-5 py-4 text-left transition-colors hover:bg-[rgba(0,0,0,0.02)]"
                        style={{ borderColor: 'rgba(0,0,0,0.04)' }}
                      >
                        <span
                          className="grid size-[32px] shrink-0 place-items-center rounded-panel"
                          style={{
                            background: n.kind === 'plain' ? 'rgba(0,0,0,0.04)' : ink.bg,
                            color: n.kind === 'plain' ? 'var(--text-secondary)' : ink.fg,
                          }}
                          aria-hidden
                        >
                          {n.kind === 'plain' ? (
                            <IconFileText size={16} stroke={1.5} />
                          ) : (
                            <IconAlertTriangle size={16} stroke={1.5} />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block text-base font-medium transition-colors group-hover:text-[var(--blue-600)]"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {n.title}
                          </span>
                          <span
                            className="mt-1 block"
                            style={{
                              font: '450 12.5px/1.45 var(--font-ui)',
                              color: 'var(--text-secondary)',
                              textWrap: 'pretty',
                            }}
                          >
                            {n.body}
                          </span>
                        </span>
                        <span
                          className="shrink-0"
                          style={{
                            font: '500 11.5px/1.5 var(--font-mono)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          {n.time}
                        </span>
                      </Link>
                    );
                  })}
                </div>
                <div
                  className="border-t bg-[rgba(0,0,0,0.01)] px-5 py-3"
                  style={{ borderColor: 'rgba(0,0,0,0.06)' }}
                >
                  <Link
                    href="/platform/settings?tab=notifications"
                    className="text-sm font-medium hover:underline"
                    style={{ color: 'var(--blue-600)' }}
                  >
                    Notification settings
                  </Link>
                </div>
              </Dropdown>
            ) : null}
          </div>

          {/*
            ⚠ THE GLOBE ICON WAS REMOVED, NOT RESTYLED.

            It was the THIRD route to `/` in this chrome, and the weakest of
            the three: an unlabelled icon, in the densest corner of the top
            bar, whose meaning a reader could only learn by hovering it or
            clicking it. Icons earn their place by being faster than a label
            for something done often; nobody leaves the console for the
            marketing site often. The rail's "Public site" row says what it
            is in words and keeps the destination one click away.

            Removing it also gives the notification bell and the account
            control room to breathe, which is what that corner actually
            needed — see the colour work on the top bar.
          */}

          <span
            aria-hidden
            className="mx-1 hidden sm:block"
            style={{ width: 1, height: 18, background: 'var(--chrome-rule)' }}
          />

          {/* ── Account ───────────────────────────────────────────────── */}
          <div className="relative">
            <button
              type="button"
              onClick={(e) => toggleMenu('account', e.currentTarget)}
              aria-expanded={openMenu === 'account'}
              className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-overlay py-0 pr-2 pl-1 transition-colors hover:bg-[var(--chrome-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chrome-rule-strong)]"
              style={{
                border: '1px solid transparent',
                color: 'var(--chrome-fg)',
              }}
            >
              {/* ⚠ THE STOCK PHOTOGRAPH IS GONE FROM ALL THREE PLACES. It was
                  one hardcoded Unsplash URL of a stranger, standing in for the
                  signed-in administrator, and it was kept only until upload
                  existed. It does. `account.avatarUrl` is the operator's own
                  file from this deployment's storage bucket, and initials are
                  the fallback for the accounts — most of them — with none. */}
              <Avatar initials={account.initials} src={account.avatarUrl} size="xs" tone="chrome" />
              <span className="hidden text-sm font-medium lg:inline">{account.name}</span>
              <IconChevronDown
                size={12}
                stroke={1.25}
                className={`transition-transform duration-200 ${openMenu === 'account' ? 'rotate-180' : ''}`}
                style={{ color: 'var(--chrome-fg-muted)' }}
                aria-hidden
              />
            </button>

            {openMenu === 'account' ? (
              <Dropdown className="right-0 w-[260px] p-2">
                <div
                  className="mb-2 flex items-center gap-3 border-b px-3 pt-2 pb-4"
                  style={{ borderColor: 'rgba(0,0,0,0.06)' }}
                >
                  <Avatar initials={account.initials} src={account.avatarUrl} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-base font-medium"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {account.name}
                    </span>
                    <span
                      className="mt-[2px] block truncate"
                      style={{
                        font: '500 11px/1.4 var(--font-ui)',
                        color: 'var(--text-tertiary)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {account.role.replace('_', ' ')}
                    </span>
                  </span>
                </div>
                {/*
                  ⚠ THIS MENU IS ACCOUNT-SCOPED NOW, AND TWO ITEMS LEFT IT.
                  ONE ACTION, ONE OWNER — the chrome offered three routes to
                  the public site and two each to profile and settings, from
                  controls sitting within a few centimetres of each other.

                  "Marketing site" → the rail's own "Public site" row keeps
                  it. It is not an account action; it was here because the
                  account menu is where stray links accumulate.

                  "Settings" → `/platform/settings` is PLATFORM settings and
                  it is already a primary navigation item. Repeating it under
                  an avatar also made it ambiguous: an avatar menu implies
                  "my settings", and this was never that.

                  What remains is the set only this menu can offer: who you
                  are, your own profile, and the way out.
                */}
                <MenuLink href="/platform/profile" icon={IconUser}>
                  Your profile
                </MenuLink>
                {/*
                  ⚠ A FORM, NOT A LINK, AND THE DIFFERENCE IS NOT COSMETIC.

                  This was `<MenuLink href="/platform/sign-in">`, which
                  navigated to the sign-in screen and changed nothing else:
                  the session row stayed live and the cookie stayed set, so
                  going back to /platform admitted the same person straight
                  in. On a shared machine that is the entire risk — they
                  believe they have left, and they have not.
                */}
                <MenuSignOut />
              </Dropdown>
            ) : null}
          </div>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="relative flex min-h-0 flex-1">
        {/*
          ⚠ THE LAYOUT TRACK. It reserves the rail's footprint and NOTHING
          else — no background, no content, no focus. The rail itself is
          absolutely positioned over it.

          This is the whole reason a hover-expand is usable. If the rail
          occupied the flex row directly, peeking would widen it from 58 to
          240 and shove the entire console 182px right every time the pointer
          crossed the edge on its way to a table cell. Reflowing a page of
          data under the cursor is the failure mode that makes people hate
          hover navigation. The track only changes width when the operator
          LOCKS a state, which is a deliberate act they are already watching.
        */}
        <div
          aria-hidden
          className="hidden shrink-0 md:block"
          style={{
            /* Rail + the inset on BOTH sides, so the gutter to the left of
               the panel and the gap between panel and content are equal.
               `RAIL_INSET * 2` is the whole reason this is not just the
               rail width — get it wrong and the panel sits closer to one
               edge than the other, which is instantly visible at this size. */
            width: `${(lockedCollapsed ? RAIL_W : RAIL_W_OPEN) + RAIL_INSET * 2}px`,
            transition: 'width 260ms cubic-bezier(0.2, 0, 0, 1)',
          }}
        />
        <nav
          ref={navElRef}
          aria-label="Platform navigation"
          onMouseEnter={startPeek}
          onMouseLeave={endPeek}
          /*
            ⚠ FOCUS OPENS IT TOO. A keyboard operator tabbing into a collapsed
            rail would otherwise move through eleven icon-only buttons whose
            labels are clipped to `max-width: 0`. `onFocus`/`onBlur` bubble in
            React, so these fire for descendants; the blur handler checks
            where focus actually went, because moving between two items inside
            the rail must not close it.
          */
          onFocus={focusPeek}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) endPeek();
          }}
          className="absolute hidden flex-col select-none md:flex"
          style={{
            /*
             * ⚠ A FLOATING PANEL, INSET ON ALL FOUR SIDES — DELIBERATE NOW.
             *
             * It became detached by accident when the rail was lifted out of
             * the flex row to make hover-peek possible, and it read better
             * than the flush column it replaced, so it is a decision rather
             * than a leftover. The reasoning that makes it defensible: this
             * chrome is ALREADY an inverted slab on a cream page (tokens.css
             * TIER 4), and a dark slab that touches three viewport edges is
             * a wall. Floating it turns the same slab into an object on the
             * page, which is what the header dropdowns and the boundary
             * frame already behave like.
             *
             * `top` clears the header rather than sitting under it, so the
             * cream shows through between the two and the detachment reads
             * as intent.
             */
            top: RAIL_INSET,
            bottom: RAIL_INSET,
            left: RAIL_INSET,
            width: collapsed ? RAIL_W : RAIL_W_OPEN,
            background: 'var(--chrome-sidebar-bg)',
            /* A full border, not just `borderRight`. A floating object is
               bounded on every side; a flush column only needs the one edge
               that meets the content. */
            border: '1px solid var(--chrome-rule)',
            borderRadius: RAIL_RADIUS,
            transition:
              'width 260ms cubic-bezier(0.2, 0, 0, 1), box-shadow 260ms ease, background 260ms ease',
            willChange: 'width',
            contain: 'layout style',
            /* Above the main pane so the peek can cover it, and above the
               page content generally — but below the header's dropdowns and
               the palette overlay, which must stay on top of everything. */
            zIndex: 25,
            /* Load-bearing with the radius: the nav's own backdrop glows and
               the active-item indicator are absolutely positioned children
               that would otherwise paint over the rounded corners. */
            overflow: 'hidden',
            /*
             * Elevation carries the state. At rest the panel is seated —
             * present, but not competing with the page. On peek it lifts,
             * because it is temporarily covering content the operator can
             * still see the edges of and needs to read as transient.
             */
            boxShadow: peeking
              ? '0 32px 64px -16px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.08)'
              : '0 12px 32px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.04)',
          }}
        >
          {/* Refined Premium Sidebar Backdrop */}
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden select-none"
            aria-hidden="true"
          >
            {/* Soft Brand Accent Atmospheric Glows */}
            <div
              className="absolute -top-32 -left-32 size-[360px] rounded-full opacity-[0.08] blur-[90px]"
              style={{ background: 'var(--blue-500)' }}
            />
            <div
              className="absolute top-[42%] -right-32 size-[280px] rounded-full opacity-[0.05] blur-[85px]"
              style={{ background: 'var(--orange-500)' }}
            />
            {/* Revamped Architectural Watermark Art */}
            <IconHexagon
              size={260}
              stroke={0.7}
              className="absolute top-16 -left-20 rotate-[15deg] text-[var(--chrome-fg-muted)] opacity-[0.0318]"
            />
            <IconLayersIntersect
              size={240}
              stroke={0.7}
              className="absolute top-[38%] -right-20 -rotate-[20deg] text-[var(--chrome-fg-muted)] opacity-[0.0318]"
            />
            <IconCube
              size={220}
              stroke={0.6}
              className="absolute bottom-24 -left-16 rotate-[35deg] text-[var(--chrome-fg-muted)] opacity-[0.0318]"
            />
          </div>

          <div
            ref={navContainerRef}
            /*
             * ⚠ `pt-4`, NOT `pt-6`, AND THE GROUPS TIGHTENED WITH IT.
             * Ten items plus two group headings plus the footer stack were
             * overflowing a 900px window by a few dozen pixels — enough to
             * summon a scrollbar for almost nothing, which is the worst of
             * both worlds. Trimming the top pad and the inter-group margins
             * buys back roughly 30px and puts the whole navigation inside the
             * panel at every realistic window height.
             *
             * It is NOT a guarantee. A 600px viewport, or devtools docked to
             * the bottom, will still overflow — which is why the slim
             * scrollbar below is the graceful degradation rather than the
             * primary plan.
             */
            className="scrollbar-slim scrollbar-slim-chrome relative z-10 flex-1 overflow-x-hidden overflow-y-auto px-2.5 pt-4 pb-3"
          >
            {/* GSAP Smooth Sliding Active Pill Indicator */}
            <div
              ref={indicatorRef}
              className="pointer-events-none absolute right-2.5 left-2.5 z-0 overflow-hidden rounded-overlay"
              style={{
                background: 'color-mix(in oklab, var(--chrome-active-bg) 90%, transparent)',
                boxShadow: 'var(--chrome-highlight), 0 1px 3px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                opacity: 0,
                willChange: 'top, opacity',
              }}
              aria-hidden="true"
            >
              <span
                className="absolute top-1.5 bottom-1.5 left-0 w-[2.5px] rounded-r-full"
                style={{
                  background: 'var(--blue-400)',
                  boxShadow: '0 0 8px var(--blue-400)',
                }}
              />
            </div>

            {navigation.map((group, gIdx) => (
              <div key={group.label} className={gIdx === 0 ? 'mb-3' : 'mt-5 mb-3'}>
                {/* ── Group Header (Text when open, line when collapsed) ── */}
                <div
                  className="relative flex items-center overflow-hidden"
                  style={{
                    maxHeight: collapsed ? (gIdx === 0 ? '0px' : '16px') : '20px',
                    marginBottom: collapsed ? (gIdx === 0 ? '0px' : '8px') : '8px',
                    transition:
                      'max-height 240ms cubic-bezier(0.2,0,0,1), margin-bottom 240ms ease',
                  }}
                >
                  <p
                    className="t-eyebrow ml-2 tracking-wider whitespace-nowrap"
                    style={{
                      color: 'var(--chrome-fg-muted)',
                      fontSize: '10.5px',
                      opacity: collapsed ? 0 : 1,
                      transform: collapsed ? 'translateY(-6px)' : 'translateY(0)',
                      transition: 'opacity 180ms ease, transform 180ms ease',
                    }}
                  >
                    {group.label}
                  </p>
                  {/* Subtle dash divider that appears only in collapsed state (and never for the first group) */}
                  {gIdx > 0 && (
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{
                        height: '2px',
                        background: 'rgba(255, 255, 255, 0.22)',
                        width: collapsed ? '22px' : '0px',
                        opacity: collapsed ? 1 : 0,
                        transition: 'width 240ms cubic-bezier(0.2, 0, 0, 1), opacity 240ms ease',
                      }}
                      aria-hidden
                    />
                  )}
                </div>
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
                        className="group relative z-10 flex h-[36px] cursor-pointer items-center rounded-overlay transition-colors select-none hover:text-[var(--chrome-fg)]"
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
                        {/* Icon scales up subtly when collapsed so it reads clearly as a solo mark */}
                        <span
                          className="flex shrink-0 items-center justify-center"
                          style={{
                            width: collapsed ? '20px' : '16px',
                            height: collapsed ? '20px' : '16px',
                            transition:
                              'width 240ms cubic-bezier(0.2,0,0,1), height 240ms cubic-bezier(0.2,0,0,1)',
                          }}
                        >
                          <Icon
                            size={collapsed ? 18 : 16}
                            stroke={active ? 1.8 : 1.25}
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
                            className="grid h-4.5 min-w-[18px] place-items-center overflow-hidden rounded-full px-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
                            style={{
                              opacity: collapsed ? 0 : 1,
                              transform: collapsed ? 'scale(0.4)' : 'scale(1)',
                              pointerEvents: collapsed ? 'none' : 'auto',
                              background: active ? 'var(--blue-500)' : 'rgba(255, 255, 255, 0.08)',
                              color: active ? 'var(--chrome-fg)' : 'var(--chrome-fg)',
                              border: active
                                ? '1px solid var(--blue-400)'
                                : '1px solid rgba(255, 255, 255, 0.1)',
                              font: '500 10px/1 var(--font-mono)',
                              transition:
                                'opacity 160ms ease, transform 200ms cubic-bezier(0.2,0,0,1)',
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

          {/*
            ⚠ ISOLATION SITS UNDER THE NAVIGATION, PERMANENTLY.

            Sheet 05: "The severe risk in the brief is a policy gap, so its
            state sits under the navigation permanently rather than being
            something to go and check." Row Level Security is the only thing
            standing between one customer's data and another's; a status an
            operator has to navigate to is a status nobody looks at until
            after an incident.

            It reads the same `getIsolationStatus()` the Health page's full
            panel does, so the sidebar and that page cannot disagree. Collapsed,
            it degrades to the dot alone — still present, still coloured,
            with the full sentence in `title`.
          */}
          <Link
            href="/platform/health"
            title={
              isolationOk
                ? `Isolation green · ${isolation.tablesPoliced} of ${isolation.tablesTotal} tables policed · last run ${isolation.lastRun}`
                : `Isolation gap · ${isolation.tablesPoliced} of ${isolation.tablesTotal} tables policed · last run ${isolation.lastRun}`
            }
            className="group flex h-[38px] items-center rounded-overlay transition-colors hover:bg-[var(--chrome-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chrome-rule-strong)]"
            style={{
              gap: collapsed ? '0px' : '10px',
              marginLeft: collapsed ? '0px' : '8px',
              marginRight: collapsed ? '0px' : '8px',
              paddingLeft: collapsed ? '18px' : '8px',
              paddingRight: collapsed ? '0px' : '8px',
              transition:
                'gap 240ms cubic-bezier(0.2,0,0,1), margin 240ms cubic-bezier(0.2,0,0,1), padding 240ms cubic-bezier(0.2,0,0,1)',
            }}
          >
            {/* Dot container grows when collapsed so it reads confidently as a solo mark */}
            <span
              className="relative flex shrink-0 items-center justify-center"
              style={{
                width: collapsed ? '24px' : '18px',
                height: collapsed ? '24px' : '18px',
                transition:
                  'width 240ms cubic-bezier(0.2,0,0,1), height 240ms cubic-bezier(0.2,0,0,1)',
              }}
            >
              {isolationOk ? (
                <>
                  <span
                    className="absolute animate-ping rounded-full"
                    style={{
                      background: 'var(--success-fg)',
                      opacity: 0.35,
                      width: collapsed ? '12px' : '9px',
                      height: collapsed ? '12px' : '9px',
                      transition:
                        'width 240ms cubic-bezier(0.2,0,0,1), height 240ms cubic-bezier(0.2,0,0,1)',
                    }}
                  />
                  <span
                    className="relative rounded-full"
                    style={{
                      background: 'var(--success-fg)',
                      boxShadow: collapsed
                        ? '0 0 10px var(--success-fg)'
                        : '0 0 7px var(--success-fg)',
                      width: collapsed ? '8px' : '7px',
                      height: collapsed ? '8px' : '7px',
                      transition:
                        'width 240ms cubic-bezier(0.2,0,0,1), height 240ms cubic-bezier(0.2,0,0,1), box-shadow 240ms ease',
                    }}
                  />
                </>
              ) : (
                <span
                  className="rounded-full"
                  style={{
                    background: 'var(--warning-fg)',
                    boxShadow: collapsed
                      ? '0 0 10px var(--warning-fg)'
                      : '0 0 7px var(--warning-fg)',
                    width: collapsed ? '8px' : '7px',
                    height: collapsed ? '8px' : '7px',
                    transition:
                      'width 240ms cubic-bezier(0.2,0,0,1), height 240ms cubic-bezier(0.2,0,0,1), box-shadow 240ms ease',
                  }}
                />
              )}
            </span>
            <span
              className="min-w-0 flex-1 overflow-hidden"
              style={{
                opacity: collapsed ? 0 : 1,
                maxWidth: collapsed ? '0px' : '190px',
                transform: collapsed ? 'translateX(-6px)' : 'translateX(0)',
                pointerEvents: collapsed ? 'none' : 'auto',
                transition:
                  'opacity 180ms ease, max-width 240ms cubic-bezier(0.2,0,0,1), transform 200ms cubic-bezier(0.2,0,0,1)',
              }}
            >
              <span
                className="block truncate font-medium tracking-tight"
                style={{
                  color: isolationOk ? 'var(--success-fg)' : 'var(--warning-fg)',
                  fontSize: '11.5px',
                }}
              >
                {isolationOk ? 'Isolation green' : 'Isolation gap'}
              </span>
              <span
                className="mt-[1.5px] block truncate font-mono"
                style={{ color: 'var(--chrome-fg-faint)', fontSize: '10px' }}
              >
                {isolation.tablesPoliced}/{isolation.tablesTotal} tables · {isolation.lastRun}
              </span>
            </span>
          </Link>

          {/* ── Bottom footer ──────────────────────────────────────────────── */}
          <div
            className="shrink-0"
            style={{
              borderTop: '1px solid var(--chrome-rule)',
              paddingTop: '6px',
              paddingBottom: '8px',
              paddingLeft: collapsed ? '0px' : '8px',
              paddingRight: collapsed ? '0px' : '8px',
              marginTop: '6px',
              transition: 'padding 240ms cubic-bezier(0.2,0,0,1)',
            }}
          >
            {/* ── Public site exit ─────────────────────────── */}
            <Link
              href="/"
              className="group flex h-[34px] w-full items-center rounded-overlay transition-all hover:bg-[var(--chrome-hover)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chrome-rule-strong)]"
              style={{
                color: 'var(--chrome-fg-muted)',
                gap: collapsed ? '0px' : '9px',
                paddingLeft: collapsed ? '18px' : '8px',
                paddingRight: collapsed ? '0px' : '8px',
                transition:
                  'gap 240ms cubic-bezier(0.2,0,0,1), padding 240ms cubic-bezier(0.2,0,0,1)',
              }}
              title={collapsed ? 'Public marketing site' : undefined}
            >
              <span
                className="flex shrink-0 items-center justify-center rounded-panel"
                style={{
                  width: '22px',
                  height: '22px',
                  background: collapsed ? 'transparent' : 'rgba(255,255,255,0.05)',
                  border: collapsed ? 'none' : '1px solid rgba(255,255,255,0.07)',
                  transition: 'background 200ms ease, border 200ms ease',
                }}
              >
                <IconArrowUpRight size={13} stroke={1.75} aria-hidden />
              </span>
              <span
                className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
                style={{
                  opacity: collapsed ? 0 : 1,
                  maxWidth: collapsed ? '0px' : '140px',
                  transform: collapsed ? 'translateX(-6px)' : 'translateX(0)',
                  pointerEvents: collapsed ? 'none' : 'auto',
                  font: '400 12px/1 var(--font-ui)',
                  transition:
                    'opacity 180ms ease, max-width 240ms cubic-bezier(0.2,0,0,1), transform 200ms cubic-bezier(0.2,0,0,1)',
                }}
              >
                Public site
              </span>
            </Link>

            {/* ── Account identity ─────────────────────────── */}
            <div
              className="flex h-[42px] w-full items-center rounded-overlay"
              style={{
                gap: collapsed ? '0px' : '10px',
                paddingLeft: collapsed ? '15px' : '8px',
                paddingRight: collapsed ? '0px' : '8px',
                transition:
                  'gap 240ms cubic-bezier(0.2,0,0,1), padding 240ms cubic-bezier(0.2,0,0,1)',
              }}
              title={collapsed ? `${account.name} (${account.role})` : undefined}
            >
              <Avatar
                initials={account.initials}
                src={account.avatarUrl}
                size="md"
                tone="chrome"
                ring
              />
              <span
                className="min-w-0 flex-1 overflow-hidden whitespace-nowrap"
                style={{
                  opacity: collapsed ? 0 : 1,
                  maxWidth: collapsed ? '0px' : '150px',
                  transform: collapsed ? 'translateX(-6px)' : 'translateX(0)',
                  pointerEvents: collapsed ? 'none' : 'auto',
                  transition:
                    'opacity 180ms ease, max-width 240ms cubic-bezier(0.2,0,0,1), transform 200ms cubic-bezier(0.2,0,0,1)',
                }}
              >
                <span
                  className="block truncate"
                  style={{
                    font: '500 12.5px/1 var(--font-ui)',
                    color: 'var(--chrome-fg)',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {account.name}
                </span>
                <span
                  className="mt-[3px] block truncate"
                  style={{ font: '400 11px/1.4 var(--font-mono)', color: 'var(--chrome-fg-muted)' }}
                >
                  {account.email}
                </span>
              </span>
            </div>

            {/* ── Collapse toggle ──────────────────────────── */}
            <button
              type="button"
              onClick={toggleCollapse}
              className="group flex h-[34px] w-full cursor-pointer items-center rounded-overlay text-sm transition-all hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--chrome-rule-strong)]"
              style={{
                background: 'transparent',
                color: 'var(--chrome-fg-faint)',
                paddingLeft: collapsed ? '18px' : '8px',
                paddingRight: collapsed ? '0px' : '8px',
                gap: collapsed ? '0px' : '9px',
                transition:
                  'gap 240ms cubic-bezier(0.2,0,0,1), padding 240ms cubic-bezier(0.2,0,0,1)',
              }}
              aria-label={lockedCollapsed ? 'Keep sidebar open' : 'Collapse sidebar'}
            >
              <span className="flex size-[24px] shrink-0 items-center justify-center">
                <IconChevronLeft
                  size={15}
                  stroke={1.5}
                  style={{
                    transform: lockedCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 260ms cubic-bezier(0.2,0,0,1)',
                  }}
                  aria-hidden
                />
              </span>
              <span
                className="nav-label min-w-0 flex-1 truncate overflow-hidden text-left whitespace-nowrap"
                style={{
                  opacity: collapsed ? 0 : 1,
                  maxWidth: collapsed ? '0px' : '150px',
                  transform: collapsed ? 'translateX(-8px)' : 'translateX(0)',
                  pointerEvents: collapsed ? 'none' : 'auto',
                  transition:
                    'opacity 180ms ease, max-width 240ms cubic-bezier(0.2,0,0,1), transform 200ms cubic-bezier(0.2,0,0,1)',
                }}
              >
                <span className="transition-colors group-hover:text-[var(--chrome-fg)]">
                  {lockedCollapsed ? 'Keep open' : 'Collapse'}
                </span>
              </span>
              <kbd
                className="inline-flex h-[18px] shrink-0 items-center gap-[2px] rounded-chip px-1 select-none"
                style={{
                  opacity: collapsed ? 0 : 1,
                  transform: collapsed ? 'scale(0.4)' : 'scale(1)',
                  pointerEvents: collapsed ? 'none' : 'auto',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--chrome-rule-strong)',
                  font: '500 10px/1 var(--font-mono)',
                  color: 'var(--chrome-fg-faint)',
                  transition: 'opacity 160ms ease, transform 200ms cubic-bezier(0.2,0,0,1)',
                }}
              >
                <span style={{ opacity: 0.5, fontSize: '9px' }}>⌘</span>B
              </kbd>
            </button>
          </div>
        </nav>

        <main
          id="main-content"
          /*
           * ⚠ CLEARANCE FOR THE MOBILE BAR, AND IT HAS TO BE ON THE SCROLL
           * CONTAINER. The bar is `position: fixed`, so it sits outside flow
           * and covers whatever the page ends with — the last table row, a
           * form's submit button, the final line of an audit entry. Padding
           * the scroller lets content be scrolled clear of it; padding the
           * page inside would not, because the overflow is owned here.
           *
           * 76px is the bar (≈60) plus its 12px offset and a little air, with
           * the safe-area inset on top for the home indicator. It is a CLASS
           * rather than an inline style precisely so `md:pb-0` can cancel it —
           * an inline `paddingBottom` has no breakpoint and would leave 76px
           * of dead space under every desktop page.
           */
          className="scrollbar-hide min-w-0 flex-1 overflow-x-hidden overflow-y-auto pb-[calc(76px+env(safe-area-inset-bottom,0px))] md:pb-0"
          style={{ background: 'var(--surface-base)' }}
        >
          {children}
        </main>

        {/*
          Below `md` this is the ONLY navigation that exists — the rail, the
          workspace switcher and the header divider are all `hidden md:*`.
          It renders inside the body row rather than beside the shell so it
          shares the same pathname-driven active state.
        */}
        <ConsoleMobileNav
          navigation={navigation}
          account={account}
          isolation={isolation}
          isPaletteOpen={paletteOpen}
          onOpenPalette={() => {
            setQuery('');
            setOpenMenu(null);
            setPaletteOpen(true);
          }}
        />
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
              if (el)
                gsapSafe.fromTo(
                  el,
                  { opacity: 0 },
                  { opacity: 1, duration: 0.2, ease: 'power2.out' },
                );
            }}
            className="fixed inset-0 flex justify-center"
            style={{
              zIndex: 80,
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(6px)',
              paddingTop: '10dvh',
            }}
          />
          <Dialog.Content
            ref={(el) => {
              if (el) {
                gsapSafe.fromTo(
                  el,
                  { opacity: 0, y: -24, scale: 0.95 },
                  { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'power3.out' },
                );
              }
            }}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              paletteInput.current?.focus();
            }}
            aria-describedby={undefined}
            className="fixed top-[10dvh] left-1/2 z-[81] flex w-[620px] max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col overflow-hidden rounded-card"
            style={{
              /*
               * ⚠ `dvh`, NOT `vh`, AND IT MATTERS MOST ON A PHONE. Below `md`
               * the header's own search and workspace switcher are both
               * `hidden md:*`, so this palette is the ONLY way to reach seven
               * of the eleven screens and the only workspace switcher there
               * is — it is what the bottom bar's raised button opens.
               *
               * Focusing its input raises the on-screen keyboard, which
               * shrinks the visual viewport while `100vh` keeps reporting the
               * LARGE one. Offset and height in `vh` therefore positioned the
               * dialog against a viewport the reader could no longer see, and
               * pushed the results — the entire point of opening it — under
               * the keyboard. `dvh` tracks the live height, so the list stays
               * where it is looked at.
               */
              maxHeight: '70dvh',
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 32px 64px -16px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.02)',
            }}
          >
            <Dialog.Title className="sr-only">Command palette</Dialog.Title>
            <div
              className="flex items-center gap-3 border-b px-5 py-4"
              style={{ borderColor: 'rgba(0,0,0,0.05)' }}
            >
              <IconSearch
                size={20}
                stroke={1.5}
                style={{ color: 'var(--text-tertiary)' }}
                aria-hidden
              />
              <input
                ref={paletteInput}
                type="text"
                /* ⚠ A REAL COMBOBOX, NOT A TEXT BOX WITH ARIA SPRINKLED ON.
                   The rows carried `aria-selected` while nothing declared a
                   listbox, which is invalid ARIA — a screen reader is told a
                   link is "selected" with no set for it to be selected
                   WITHIN, and announces nothing useful. The three parts have
                   to agree: combobox owns listbox, listbox holds options,
                   and `aria-activedescendant` names the one that Enter takes
                   while real focus stays in the input. */
                role="combobox"
                aria-expanded
                aria-controls="console-palette-list"
                aria-autocomplete="list"
                aria-activedescendant={
                  paletteHits[paletteIndex] ? `palette-hit-${paletteIndex}` : undefined
                }
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  /*
                   * ⚠ THE PALETTE HAD NO KEYBOARD SELECTION AT ALL.
                   *
                   * Enter took `paletteHits[0]` unconditionally — the first
                   * row, forever, no matter what the operator was looking at
                   * — and the arrow keys did nothing, so a list of eleven
                   * screens could only be used by typing until exactly one
                   * survived, or by lifting a hand to the mouse. In a control
                   * whose entire promise is "keyboard-first", that is the
                   * feature missing rather than a rough edge.
                   *
                   * Down and Up move the selection and WRAP, because a list
                   * this short is faster to reach backwards from the top than
                   * to page down through. Home and End are free once an index
                   * exists. Enter commits whatever is highlighted.
                   */
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setPaletteIndex((i) => (paletteHits.length ? (i + 1) % paletteHits.length : 0));
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setPaletteIndex((i) =>
                      paletteHits.length ? (i - 1 + paletteHits.length) % paletteHits.length : 0,
                    );
                    return;
                  }
                  if (e.key === 'Home') {
                    e.preventDefault();
                    setPaletteIndex(0);
                    return;
                  }
                  if (e.key === 'End') {
                    e.preventDefault();
                    setPaletteIndex(Math.max(0, paletteHits.length - 1));
                    return;
                  }
                  if (e.key === 'Enter') {
                    const hit = paletteHits[paletteIndex] ?? paletteHits[0];
                    if (hit) {
                      e.preventDefault();
                      closeAll();
                      router.push(hit.key);
                    }
                  }
                }}
                placeholder="Search screens, workspaces, or actions..."
                className="flex-1 border-none bg-transparent outline-none placeholder:text-[var(--text-tertiary)]"
                style={{
                  font: '400 16px/1.4 var(--font-ui)',
                  color: 'var(--text-primary)',
                }}
              />
              <kbd
                className="flex h-5 items-center justify-center rounded-chip px-1.5"
                style={{
                  background:
                    'linear-gradient(to bottom, var(--surface-raised), var(--surface-sunken))',
                  border: '1px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 1px 1px rgba(0,0,0,0.05)',
                  font: '500 10px/1 var(--font-mono)',
                  color: 'rgba(0,0,0,0.4)',
                }}
              >
                ESC
              </kbd>
            </div>
            {/* The inline `scrollbarWidth: 'none'` that used to be here would
                have beaten `.scrollbar-slim`'s `thin` in Firefox — an inline
                style outranks any class — leaving Firefox with no scrollbar
                at all while Chrome got the styled one. */}
            <div
              id="console-palette-list"
              role="listbox"
              aria-label="Results"
              className="scrollbar-slim scrollbar-slim-chrome flex-1 overflow-y-auto p-2"
            >
              {paletteHits.length === 0 ? (
                <p
                  className="t-compact px-3 py-10 text-center"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Nothing matches “{query}”.
                </p>
              ) : (
                paletteHits.map((hit, index) => {
                  const Icon = CONSOLE_ICONS[hit.icon] ?? IconLayoutSidebar;
                  const selected = index === paletteIndex;
                  return (
                    <Link
                      key={`${hit.kind}-${hit.key}`}
                      href={hit.key}
                      /* The pointer and the keyboard drive ONE selection.
                         Hovering moves the highlight rather than lighting a
                         second row, so Enter always commits what is lit. */
                      onMouseEnter={() => setPaletteIndex(index)}
                      onClick={() => closeAll()}
                      id={`palette-hit-${index}`}
                      role="option"
                      aria-selected={selected}
                      ref={selected ? selectedHitRef : undefined}
                      className="group flex w-full items-center gap-3 rounded-overlay px-3 py-2.5 text-left transition-all"
                      style={{ background: selected ? 'rgba(0,0,0,0.045)' : 'transparent' }}
                    >
                      <span
                        className="flex size-7 shrink-0 items-center justify-center transition-colors group-hover:text-[var(--blue-500)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        aria-hidden
                      >
                        <Icon size={18} stroke={1.5} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className="block truncate text-base font-medium tracking-tight transition-colors group-hover:text-[var(--blue-600)]"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {hit.label}
                        </span>
                        <span
                          className="mt-[1px] block truncate"
                          style={{
                            font: '400 12.5px/1.4 var(--font-ui)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          {hit.hint}
                        </span>
                      </span>
                      <div className="flex shrink-0 items-center justify-end">
                        <span
                          className="flex items-center justify-center rounded-panel border px-2 py-[3px] text-xs font-medium transition-colors group-hover:border-[var(--blue-200)] group-hover:bg-[var(--blue-50)] group-hover:text-[var(--blue-600)]"
                          style={{
                            borderColor: 'rgba(0,0,0,0.06)',
                            background: 'var(--surface-sunken)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          {hit.kind.charAt(0).toUpperCase() + hit.kind.slice(1).toLowerCase()}
                        </span>
                        <div className="flex w-0 items-center justify-center overflow-hidden opacity-0 transition-all duration-200 ease-out group-hover:ml-1.5 group-hover:w-5 group-hover:opacity-100">
                          <IconArrowRight
                            size={14}
                            stroke={2}
                            className="-translate-x-2 text-[var(--blue-500)] transition-transform duration-200 group-hover:translate-x-0"
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ProvisionWorkspaceDialog
        open={provisionOpen}
        onOpenChange={(next) => {
          if (!next) closeProvision();
        }}
      />

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
  /* Takes the event so the caller can record `currentTarget` as the control
     to return focus to when the menu it opened is dismissed. */
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  expanded: boolean;
  bordered?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-overlay py-0 pr-2.5 pl-2 transition-[background-color,border-color,color] duration-150 hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)]"
      style={{
        /*
         * ⚠ THE OPEN STATE IS BRAND-TINTED, NOT JUST DARKER.
         *
         * Every state of this control used to be a shade of the same navy —
         * rest, hover and OPEN differed only by a few percent of white — so
         * the one state that matters, "this menu is showing", was the hardest
         * to see in a bar that is already monotone.
         *
         * `--chrome-action` is the token the chrome tier already defines for
         * exactly this: the action colour stepped up to clear contrast
         * against the slab (`#043AE1` is 2.52:1 on navy, so the tier
         * publishes `#96b9ff` instead). Using it here is not a new colour in
         * the system, it is the system's existing answer finally being asked
         * the question. `--chrome-active-bg` is its matching tint and is
         * already what the sidebar's current item uses, so an open menu in
         * the top bar and the current page in the rail now agree.
         */
        border: expanded
          ? '1px solid color-mix(in oklab, var(--chrome-action) 45%, transparent)'
          : bordered
            ? '1px solid var(--chrome-rule)'
            : '1px solid transparent',
        background: expanded
          ? 'var(--chrome-active-bg)'
          : bordered
            ? 'var(--chrome-hover)'
            : 'transparent',
        color: expanded ? 'var(--chrome-action)' : 'var(--chrome-fg)',
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
      /* size-8 draws at 32px; `target-44` gives it the 44px hit area sheet 03
         requires without changing the chrome's density. */
      className="target-44 grid size-8 cursor-pointer place-items-center rounded-overlay transition-colors hover:bg-[var(--chrome-hover)] hover:text-[var(--chrome-fg)]"
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
      { opacity: 1, y: 0, scale: 1, duration: 0.26, ease: 'back.out(2)' },
    );

    const items = ref.current.querySelectorAll('a, button');
    if (items.length > 0) {
      gsapSafe.fromTo(
        items,
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, stagger: 0.025, duration: 0.2, ease: 'power2.out', delay: 0.04 },
      );
    }
  }, []);

  return (
    <div
      ref={ref}
      className={`absolute top-[42px] overflow-hidden rounded-overlay ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-subtle)',
        zIndex: OVERLAY_Z,
        boxShadow: '0 12px 32px -8px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.02)',
      }}
    >
      {children}
    </div>
  );
}

/**
 * The one control in this menu that changes state rather than navigating.
 *
 * It is styled to match `MenuLink`'s danger variant so the menu reads as one
 * list, but it is a submit button inside a POST form. See the note at its
 * call site for why that distinction is load-bearing.
 */
function MenuSignOut() {
  return (
    <form method="post" action="/api/v1/auth/sign-out" className="contents">
      <button
        type="submit"
        className="group flex h-[36px] w-full items-center gap-3 rounded-panel px-2.5 transition-colors hover:bg-[var(--danger-bg)]"
        style={{
          color: 'var(--danger-fg)',
          font: '450 13.5px/1 var(--font-ui)',
        }}
      >
        <IconLogout size={16} stroke={1.5} className="transition-transform group-hover:scale-105" />
        <span>Sign out</span>
      </button>
    </form>
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
        if (icon) gsapSafe.to(icon, { x: 3, duration: 0.2, ease: 'back.out(2)' });
      }}
      onMouseLeave={(e) => {
        const icon = e.currentTarget.querySelector('svg');
        if (icon) gsapSafe.to(icon, { x: 0, duration: 0.25, ease: 'power2.out' });
      }}
      className="flex h-[36px] w-full items-center gap-3 rounded-panel px-2.5 transition-colors hover:bg-[var(--surface-raised)]"
      style={{
        color: danger ? 'var(--danger-fg)' : 'var(--text-secondary)',
        font: '450 13.5px/1 var(--font-ui)',
      }}
    >
      <Icon size={16} stroke={1.5} className="shrink-0 transition-transform" aria-hidden />
      <span className="text-[var(--text-primary)]">{children}</span>
    </Link>
  );
}
