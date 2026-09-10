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
} from '@tabler/icons-react';
import { CONSOLE_ICONS } from './icons';
import type { ConsoleAccount, ConsoleNavGroup } from './types';
import type { IsolationStatus } from '@/lib/console/data';

/**
 * The console's navigation below `md`.
 *
 * ⚠ UNTIL THIS EXISTED THERE WAS NONE AT ALL. The rail is `hidden md:flex`,
 * and so are the workspace switcher and the header divider — so on a phone the
 * console rendered a logo, a search box, a bell and an avatar, and every one
 * of its eleven screens was unreachable except by typing a URL. That is not a
 * responsive shortcoming, it is a missing feature, and it was invisible from
 * a desktop browser because the rail is always there above 768px.
 *
 * ── The shape, and why it is not just the rail lying down ────────────────
 *
 * Four destinations and a raised centre. The four are the screens an operator
 * opens without thinking; the centre is the COMMAND PALETTE, and that is the
 * decision this component turns on.
 *
 * On desktop the palette is ⌘K — the fastest route to any of the eleven
 * screens, the workspaces, and the actions. On a phone there is no ⌘K, no
 * rail, and no room for eleven tabs. Handing the raised centre button to
 * search rather than to a destination means the four tabs can stay the four
 * that matter while everything else stays one thumb-reach away. A bottom bar
 * that tried to list the whole navigation would need a scroll, and a bottom
 * bar you scroll is a worse rail.
 *
 * "Menu" opens the rest — the full navigation with its badges, the isolation
 * state, the public site, and the account block — so nothing the rail offers
 * is lost, it is one tap deeper.
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
}: {
  navigation: ConsoleNavGroup[];
  account: ConsoleAccount;
  isolation: IsolationStatus;
  onOpenPalette: () => void;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  /* A sheet that survives navigation would cover the screen it just opened. */
  useEffect(() => setMenuOpen(false), [pathname]);

  const isolationOk = isolation.tablesPoliced === isolation.tablesTotal;

  /* Anything with a badge that is NOT one of the four tabs is only reachable
     through the menu — so the menu button carries a dot to say so, rather
     than hiding a count behind a word. */
  const hiddenBadgeCount = navigation
    .flatMap((g) => g.items)
    .filter((item) => !PRIMARY.some((p) => p.href === item.href))
    .reduce((sum, item) => sum + (item.badge ?? 0), 0);

  const tabBase =
    'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1.5 transition-colors';

  return (
    <>
      {/*
        ⚠ `env(safe-area-inset-bottom)` IS NOT OPTIONAL. On any iPhone since
        the X, the bottom ~34px is the home-indicator strip; a bar pinned to
        `bottom: 0` puts its own controls underneath it, where taps are
        swallowed by the system gesture. The inset is added to the OUTER
        offset so the panel floats above the indicator rather than padding
        itself into a taller bar.
      */}
      <nav
        aria-label="Console navigation"
        className="fixed inset-x-3 z-40 md:hidden"
        style={{ bottom: `calc(12px + env(safe-area-inset-bottom, 0px))` }}
      >
        <div
          className="flex items-stretch gap-1 rounded-2xl px-2 py-1.5"
          style={{
            background: 'var(--chrome-bg)',
            border: '1px solid var(--chrome-rule)',
            /* Matches the desktop rail's resting elevation, so the two read
               as the same object in two postures. */
            boxShadow: '0 8px 28px -8px rgba(0, 0, 0, 0.55)',
          }}
        >
          {PRIMARY.slice(0, 2).map((tab) => (
            <MobileTab key={tab.href} tab={tab} pathname={pathname} className={tabBase} />
          ))}

          {/*
            The raised centre. It is a BUTTON, not a link — it opens the
            palette in place rather than navigating, which is the whole point:
            you reach for it when you do not know where you are going.
          */}
          <button
            type="button"
            onClick={onOpenPalette}
            aria-label="Search screens, workspaces and actions"
            className="relative flex w-[64px] shrink-0 cursor-pointer items-center justify-center"
          >
            <span
              className="grid size-[52px] -translate-y-4 place-items-center rounded-full transition-transform active:scale-95"
              style={{
                background: 'var(--blue-500)',
                color: '#ffffff',
                border: '3px solid var(--chrome-bg)',
                boxShadow: '0 6px 18px -4px rgba(4, 58, 225, 0.6)',
              }}
            >
              <IconSearch size={22} stroke={1.75} aria-hidden />
            </span>
          </button>

          {PRIMARY.slice(2).map((tab) => (
            <MobileTab key={tab.href} tab={tab} pathname={pathname} className={tabBase} />
          ))}

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className={`${tabBase} cursor-pointer`}
            style={{ color: 'var(--chrome-fg-muted)' }}
          >
            <span className="relative">
              <IconLayoutGrid size={20} stroke={1.5} aria-hidden />
              {hiddenBadgeCount > 0 ? (
                <span
                  aria-hidden
                  className="absolute -top-0.5 -right-1 size-1.5 rounded-full"
                  style={{ background: 'var(--accent-mark)' }}
                />
              ) : null}
            </span>
            <span className="text-[10px] leading-none font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* ── The rest of the rail, one tap deeper ─────────────────────────── */}
      <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-50 md:hidden"
            style={{ background: 'var(--surface-overlay)' }}
          />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[86dvh] flex-col rounded-t-2xl md:hidden"
            style={{
              background: 'var(--chrome-bg)',
              borderTop: '1px solid var(--chrome-rule)',
              color: 'var(--chrome-fg)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <Dialog.Title
                className="font-mono text-[11px] tracking-wider uppercase"
                style={{ color: 'var(--chrome-fg-faint)' }}
              >
                Platform console
              </Dialog.Title>
              <Dialog.Close
                aria-label="Close menu"
                className="grid size-8 cursor-pointer place-items-center rounded-lg"
                style={{ color: 'var(--chrome-fg-muted)' }}
              >
                <IconX size={18} stroke={1.5} />
              </Dialog.Close>
            </div>

            <div className="scrollbar-slim scrollbar-slim-chrome flex-1 overflow-y-auto px-3 pb-3">
              {navigation.map((group) => (
                <div key={group.label} className="mb-4">
                  <p
                    className="mb-1.5 ml-2 font-mono text-[10.5px] tracking-wider uppercase"
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
                          className="flex h-11 items-center gap-3 rounded-lg px-2.5 text-[14px]"
                          style={{
                            background: active ? 'var(--chrome-active-bg)' : 'transparent',
                            color: active ? 'var(--chrome-action)' : 'var(--chrome-fg-muted)',
                          }}
                        >
                          <Icon size={18} stroke={1.5} aria-hidden />
                          <span className="flex-1">{item.label}</span>
                          {item.badge ? (
                            <span
                              className="rounded-full px-1.5 py-0.5 font-mono text-[10px]"
                              style={{
                                background: 'rgba(255,255,255,0.08)',
                                color: 'var(--chrome-fg-muted)',
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

              {/* The isolation readout travels with the navigation, because
                  it is the same "do not go and check" statement on a phone
                  that it is on the rail. */}
              <div
                className="mb-3 flex items-center gap-2.5 rounded-lg px-2.5 py-2"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{
                    background: isolationOk ? 'var(--success-fg)' : 'var(--warning-fg)',
                  }}
                  aria-hidden
                />
                <span
                  className="text-[12px]"
                  style={{ color: isolationOk ? 'var(--success-fg)' : 'var(--warning-fg)' }}
                >
                  {isolationOk ? 'Isolation green' : 'Isolation gap'}
                </span>
                <span
                  className="ml-auto font-mono text-[11px]"
                  style={{ color: 'var(--chrome-fg-faint)' }}
                >
                  {isolation.tablesPoliced}/{isolation.tablesTotal} tables
                </span>
              </div>

              <Link
                href="/"
                className="flex h-11 items-center gap-3 rounded-lg px-2.5 text-[14px]"
                style={{ color: 'var(--chrome-fg-muted)' }}
              >
                <IconArrowUpRight size={18} stroke={1.5} aria-hidden />
                Public site
              </Link>

              <div
                className="mt-3 border-t pt-3"
                style={{ borderColor: 'var(--chrome-rule)' }}
              >
                <div className="mb-1 px-2.5">
                  <p className="text-[13px] font-medium" style={{ color: 'var(--chrome-fg)' }}>
                    {account.name}
                  </p>
                  <p
                    className="font-mono text-[11px]"
                    style={{ color: 'var(--chrome-fg-faint)' }}
                  >
                    {account.email}
                  </p>
                </div>

                <Link
                  href="/platform/profile"
                  className="flex h-11 items-center gap-3 rounded-lg px-2.5 text-[14px]"
                  style={{ color: 'var(--chrome-fg-muted)' }}
                >
                  <IconUser size={18} stroke={1.5} aria-hidden />
                  Your profile
                </Link>

                {/* A POST, exactly as on desktop — a GET that ends a session
                    is one prefetch away from signing the operator out. */}
                <form method="post" action="/api/v1/auth/sign-out">
                  <button
                    type="submit"
                    className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 text-[14px]"
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
  className,
}: {
  tab: { href: string; label: string; icon: string };
  pathname: string;
  className: string;
}) {
  const Icon = CONSOLE_ICONS[tab.icon] ?? IconLayoutGrid;
  const active = isActive(pathname, tab.href);

  return (
    <Link
      href={tab.href}
      aria-current={active ? 'page' : undefined}
      className={className}
      style={{ color: active ? 'var(--chrome-action)' : 'var(--chrome-fg-muted)' }}
    >
      <Icon size={20} stroke={active ? 1.9 : 1.5} aria-hidden />
      <span className="text-[10px] leading-none font-medium">{tab.label}</span>
    </Link>
  );
}
