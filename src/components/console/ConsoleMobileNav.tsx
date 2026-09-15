'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  IconArrowUpRight,
  IconLayoutGrid,
  IconLogout,
  IconSearch,
  IconUser,
  IconX,
  IconLayersIntersect,
} from '@tabler/icons-react';
import { CONSOLE_ICONS } from './icons';
import type { ConsoleAccount, ConsoleNavGroup } from './types';
import type { IsolationStatus } from '@/lib/console/data';

/**
 * The console's navigation below `md`, where the rail, the workspace switcher
 * and the header divider are all `hidden md:*` and this is the only way to
 * reach anything.
 *
 * Four destinations and a raised centre. The centre is the COMMAND PALETTE
 * rather than a fifth destination: on desktop it is ⌘K, the fastest route to
 * any screen, workspace or action, and a phone has no ⌘K, no rail, and no room
 * for eleven tabs. Giving it the raised button keeps the four tabs the four
 * that matter while everything else stays one thumb-reach away.
 *
 * "Menu" opens the rest — the full navigation with badges, the isolation
 * state, the public site and the account block — so nothing the rail offers is
 * lost, it is one tap deeper.
 */

const PRIMARY: { href: string; label: string; icon: string }[] = [
  { href: '/platform', label: 'Overview', icon: 'dashboard' },
  { href: '/platform/tenants', label: 'Workspaces', icon: 'building' },
  { href: '/platform/health', label: 'Health', icon: 'pulse' },
];

function isActive(pathname: string, href: string): boolean {
  return href === '/platform' ? pathname === '/platform' : pathname.startsWith(href);
}

export function ConsoleMobileNav({
  navigation,
  account,
  isolation,
  onOpenPalette,
  isPaletteOpen = false,
}: {
  navigation: ConsoleNavGroup[];
  account: ConsoleAccount;
  isolation: IsolationStatus;
  onOpenPalette: () => void;
  isPaletteOpen?: boolean;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  /* Close menu on route change */
  useEffect(() => setMenuOpen(false), [pathname]);

  const isolationOk = isolation.tablesPoliced === isolation.tablesTotal;

  const hiddenBadgeCount = navigation
    .flatMap((g) => g.items)
    .filter((item) => !PRIMARY.some((p) => p.href === item.href))
    .reduce((sum, item) => sum + (item.badge ?? 0), 0);

  const isMenuTabActive = menuOpen || !PRIMARY.some((p) => isActive(pathname, p.href));

  return (
    <>
      <nav
        aria-label="Console navigation"
        className="pointer-events-none fixed inset-x-4 z-40 flex justify-center md:hidden"
        style={{ bottom: `calc(16px + env(safe-area-inset-bottom, 0px))` }}
      >
        {/*
          ⚠ ONE FLEX ROW AND A RAISED CIRCLE. WHAT THIS REPLACED, AND WHY.

          The previous version carved a concave cradle into the pill with a
          runtime-computed SVG path — tangent fillets, a circular cut, a
          'deep recessed socket' underneath, a clipPath backdrop-filter layer,
          and a ResizeObserver feeding all of it so the maths could be redone
          on every resize. It was a great deal of machinery in service of a
          notch that is roughly eight pixels of visual difference, and it
          brought real costs: a clipPath that recalculates on resize, a
          blurred layer composited on every scroll, and absolute 'wings' whose
          widths came out of the path solver, so the five items were NOT
          evenly spaced — they were spaced by whatever the geometry left over.

          The reference does not have a cut-out at all. It is a plain capsule
          with a circular button sitting ON it, and the dark halo is the
          button's own ring, not a hole. That is a border, and it needs no
          geometry: the ring simply matches the capsule so the circle reads as
          resting in it.

          The row is now five equal flex children, so spacing is even by
          construction and stays even at any width.
        */}
        <div
          className="pointer-events-auto relative flex h-[62px] w-full max-w-[360px] items-center rounded-full px-1.5 select-none"
          style={{
            background:
              'linear-gradient(180deg, var(--chrome-bg-navy) 0%, var(--chrome-bg-base) 100%)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            boxShadow:
              '0 16px 32px -8px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
          }}
        >
          {PRIMARY.slice(0, 2).map((tab) => (
            <MobileTab key={tab.href} tab={tab} pathname={pathname} />
          ))}

          {/*
            The centre slot keeps its share of the row so the four icons stay
            evenly spaced; the button floats up out of it rather than being
            positioned against the container, which is what kept the old
            version's spacing hostage to the path solver.
          */}
          <div className="relative flex h-full flex-1 items-center justify-center">
            <button
              type="button"
              onClick={onOpenPalette}
              aria-label="Search screens, workspaces and actions"
              className="absolute flex size-[54px] cursor-pointer items-center justify-center rounded-full transition-transform duration-200 active:scale-95"
              style={{
                /* Raised just past the capsule's top edge. Far enough to read
                   as elevated, not so far that it detaches from the bar. */
                transform: 'translateY(-15px)',
                background: 'linear-gradient(180deg, var(--blue-400) 0%, var(--blue-500) 100%)',
                /* ⚠ THE RING IS THE WHOLE TRICK. Matching the capsule's top
                   colour makes the circle look seated in it, which is what
                   the old concave path was trying to fake by cutting a hole.
                   Where the circle rises above the bar the ring reads as a
                   deliberate dark outline — exactly the reference. */
                border: '4px solid var(--chrome-bg-navy)',
                boxShadow:
                  '0 8px 18px -4px rgba(27, 79, 224, 0.65), inset 0 1.5px 1px rgba(255, 255, 255, 0.28)',
              }}
            >
              <IconSearch size={22} stroke={2.1} className="text-white" aria-hidden />
            </button>

            {/* Same jewel dot the tabs use, so the centre reports its state in
                the row's own vocabulary rather than inventing one. */}
            <span
              aria-hidden
              className="absolute bottom-[11px] size-[3.5px] rounded-full transition-all duration-200"
              style={{
                background: isPaletteOpen ? 'var(--chrome-action)' : 'transparent',
                boxShadow: isPaletteOpen ? '0 0 6px 0.5px rgba(56, 189, 248, 0.8)' : 'none',
              }}
            />
          </div>

          {PRIMARY.slice(2).map((tab) => (
            <MobileTab key={tab.href} tab={tab} pathname={pathname} />
          ))}

          <MenuButton
            menuOpen={menuOpen}
            onClick={() => setMenuOpen(true)}
            hasBadges={hiddenBadgeCount > 0}
            isActive={isMenuTabActive}
          />
        </div>
      </nav>

      {/* ── 5. Full Navigation Sheet (Slide-up Radix Dialog) ─────────── */}
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-50 md:hidden"
            style={{
              background: 'var(--surface-overlay)',
              animation: 'overlay-in var(--duration-fast) linear',
            }}
          />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[86dvh] flex-col rounded-t-2xl md:hidden"
            style={{
              background: 'var(--chrome-bg-raised)',
              borderTop: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--chrome-fg)',
              paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
              /* `slide-up-fade`, not `animate-in slide-in-from-bottom`: that
                 utility comes from tailwindcss-animate, which this project does
                 not install, so the class was inert and the sheet appeared
                 instantly. This keyframe already exists in globals.css and is
                 covered by its reduced-motion block. */
              animation: 'slide-up-fade var(--duration-slow) var(--ease-out)',
              boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.75)',
            }}
          >
            {/* Sheet Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-[var(--chrome-rule-strong)]" />
            </div>

            <div className="flex items-center justify-between px-4 py-2">
              <Dialog.Title
                className="font-mono text-[length:var(--text-xs)] tracking-wider uppercase"
                style={{ color: 'var(--chrome-fg-faint)' }}
              >
                Platform console
              </Dialog.Title>
              <Dialog.Close
                aria-label="Close menu"
                className="grid size-8 cursor-pointer place-items-center rounded-lg transition-colors hover:bg-[var(--chrome-active-bg)]"
                style={{ color: 'var(--chrome-fg-muted)' }}
              >
                <IconX size={18} stroke={1.5} />
              </Dialog.Close>
            </div>

            <div className="scrollbar-slim scrollbar-slim-chrome flex-1 overflow-y-auto px-3 pb-3">
              {navigation.map((group) => (
                <div key={group.label} className="mb-4">
                  <p
                    className="mb-1.5 ml-2 font-mono text-[length:var(--text-xs)] tracking-wider uppercase"
                    style={{ color: 'var(--chrome-fg-muted)' }}
                  >
                    {group.label}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const Icon = CONSOLE_ICONS[item.icon] ?? IconLayoutGrid;
                      const active = isActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className="flex h-11 items-center gap-3 rounded-lg px-2.5 text-[length:var(--text-base)] transition-colors"
                          style={{
                            background: active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            color: active ? 'var(--chrome-fg)' : 'var(--chrome-fg-muted)',
                          }}
                        >
                          <Icon size={18} stroke={active ? 2.0 : 1.5} aria-hidden />
                          <span className="flex-1 font-medium">{item.label}</span>
                          {item.badge ? (
                            <span
                              className="rounded-full px-2 py-0.5 font-mono text-[length:var(--text-xs)] font-medium"
                              style={{
                                background: 'rgba(255, 255, 255, 0.12)',
                                color: 'var(--chrome-fg)',
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

              {/* Isolation readout */}
              <div
                className="mb-3 flex items-center gap-2.5 rounded-lg px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    background: isolationOk ? 'var(--success-fg)' : 'var(--warning-fg)',
                    boxShadow: isolationOk
                      ? '0 0 8px var(--success-fg)'
                      : '0 0 8px var(--warning-fg)',
                  }}
                  aria-hidden
                />
                <span
                  className="text-[length:var(--text-sm)] font-medium"
                  style={{ color: isolationOk ? 'var(--success-fg)' : 'var(--warning-fg)' }}
                >
                  {isolationOk ? 'Isolation green' : 'Isolation gap'}
                </span>
                <span
                  className="ml-auto font-mono text-[length:var(--text-xs)]"
                  style={{ color: 'var(--chrome-fg-faint)' }}
                >
                  {isolation.tablesPoliced}/{isolation.tablesTotal} tables
                </span>
              </div>

              <Link
                href="/"
                className="flex h-11 items-center gap-3 rounded-lg px-2.5 text-[length:var(--text-base)] transition-colors hover:bg-[var(--chrome-hover)]"
                style={{ color: 'var(--chrome-fg-muted)' }}
              >
                <IconArrowUpRight size={18} stroke={1.5} aria-hidden />
                Public site
              </Link>

              <div
                className="my-6 border-t pt-3"
                style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
              >
                <div className="mb-1 px-2.5">
                  <p className="text-[length:var(--text-sm)] font-medium text-white">
                    {account.name}
                  </p>
                  <p
                    className="font-mono text-[length:var(--text-xs)]"
                    style={{ color: 'var(--chrome-fg-faint)' }}
                  >
                    {account.email}
                  </p>
                </div>

                <Link
                  href="/platform/profile"
                  className="flex h-11 items-center gap-3 rounded-lg px-2.5 text-[length:var(--text-base)] transition-colors hover:bg-[var(--chrome-hover)]"
                  style={{ color: 'var(--chrome-fg-muted)' }}
                >
                  <IconUser size={18} stroke={1.5} aria-hidden />
                  Your profile
                </Link>

                <form method="post" action="/api/v1/auth/sign-out">
                  <button
                    type="submit"
                    className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[length:var(--text-base)] transition-colors hover:bg-red-500/10"
                    style={{ color: 'var(--danger-fg)' }}
                  >
                    <IconLogout size={18} stroke={1.5} aria-hidden />
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function MobileTab({
  tab,
  pathname,
}: {
  tab: { href: string; label: string; icon: string };
  pathname: string;
}) {
  const Icon = CONSOLE_ICONS[tab.icon] ?? IconLayoutGrid;
  const active = isActive(pathname, tab.href);

  return (
    <Link
      href={tab.href}
      aria-label={tab.label}
      aria-current={active ? 'page' : undefined}
      className="group relative flex h-full flex-1 flex-col items-center justify-center gap-[5px] transition-transform duration-150 active:scale-95"
    >
      <div className="relative flex items-center justify-center">
        <Icon
          size={21}
          stroke={active ? 2.0 : 1.6}
          className="transition-all duration-200"
          style={{
            color: active ? 'var(--chrome-fg)' : 'var(--chrome-fg-muted)',
            transform: active ? 'scale(1.05)' : 'scale(1)',
          }}
          aria-hidden
        />
      </div>

      {/* Active dot indicator — perfectly anchored with crisp jewel glow */}
      <span
        className="size-[3.5px] rounded-full transition-all duration-200"
        style={{
          background: active ? 'var(--chrome-action)' : 'transparent',
          boxShadow: active ? '0 0 6px 0.5px rgba(56, 189, 248, 0.8)' : 'none',
        }}
        aria-hidden
      />
    </Link>
  );
}

function MenuButton({
  menuOpen,
  onClick,
  hasBadges,
  isActive,
}: {
  menuOpen: boolean;
  onClick: () => void;
  hasBadges: boolean;
  isActive: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-expanded={menuOpen}
      aria-label="Open full platform navigation"
      className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-center gap-[5px] transition-transform duration-150 active:scale-95"
    >
      <div className="relative flex items-center justify-center">
        <IconLayersIntersect
          size={22}
          stroke={isActive ? 2.0 : 1.6}
          className="transition-all duration-200"
          style={{
            color: isActive ? 'var(--chrome-fg)' : 'var(--chrome-fg-muted)',
            transform: isActive ? 'scale(1.05)' : 'scale(1)',
          }}
          aria-hidden
        />
        {hasBadges ? (
          <span
            aria-hidden
            className="absolute -top-0.5 -right-1 size-[5px] rounded-full"
            style={{
              background: 'var(--accent-mark)',
              boxShadow: '0 0 4px rgba(250, 85, 5, 0.6)',
            }}
          />
        ) : null}
      </div>

      {/* Active dot indicator */}
      <span
        className="size-[3.5px] rounded-full transition-all duration-200"
        style={{
          background: isActive ? 'var(--chrome-action)' : 'transparent',
          boxShadow: isActive ? '0 0 6px 0.5px rgba(56, 189, 248, 0.8)' : 'none',
        }}
        aria-hidden
      />
    </button>
  );
}
