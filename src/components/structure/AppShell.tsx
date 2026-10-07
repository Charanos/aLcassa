'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import {
  IconMenu2,
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconBell,
  IconHelpCircle,
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { IconButton } from '@/components/primitives/IconButton';
import { TenantSwitcher, type TenantSummary } from './TenantSwitcher';
import { CommandTrigger } from './CommandTrigger';
import { AdminProfileCard, type AdminProfile } from './AdminProfileCard';
import { PlanMeterCard, type PlanMeter } from './PlanMeterCard';
import {
  AccountMenu,
  NewMenu,
  NotificationsMenu,
  WorkspaceSwitcher,
  type AccountSummary,
  type NewAction,
  type ShellNotification,
  type WorkspaceSummary,
} from './TenantHeader';
import { BoundaryFrame, type SupportModeState } from '@/components/domain/BoundaryFrame';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: number;
  shortcut?: string;
};

export type NavGroup = { label: string; items: NavItem[] };

export type AppShellProps = {
  application: 'tenant' | 'platform';
  titleBlock: { label: string; value: string; revision?: string };
  navigation: NavGroup[];
  role: string;
  defaultCollapsed?: boolean;
  headerActions?: React.ReactNode;
  /** Platform console only — powers the tenant switcher in the topbar. */
  tenants?: TenantSummary[];
  onTenantSelect?: (tenant: TenantSummary) => void;
  /** Sidebar footer identity. Platform console only — the tenant shell puts
   *  identity in the header and gives the sidebar foot to `planMeter`. */
  adminProfile?: AdminProfile;
  notificationCount?: number;
  onCommandPaletteOpen?: () => void;
  /*
   * ── Tenant shell, all optional ──────────────────────────────────────
   * Everything below is drawn by `Tenant-Shell.dc.html` and rendered ONLY
   * when supplied, so the platform console — which has its own
   * `Console-Shell` design — is untouched by their existence. Passing none
   * of them yields exactly the header this shell had before they were added.
   */
  /** Workspaces the reader belongs to. One entry renders as a plain label. */
  workspaces?: WorkspaceSummary[];
  /** The header's "New" menu. Omitted or empty renders no button. */
  newActions?: NewAction[];
  /** Populates the notifications dropdown. Without it the bell stays a plain
   *  count-only button, which is what the platform console still uses. */
  notifications?: ShellNotification[];
  /** Header account menu. */
  account?: AccountSummary;
  /** Plan-pressure card pinned to the foot of the sidebar. */
  planMeter?: PlanMeter;
  /** Help destination. Omitted renders no help control. */
  helpHref?: string;
  /**
   * 03 §8 · 06 §6. Null outside support mode — the frame renders nothing.
   * Server-driven from `/v1/me`'s `supportMode` object once M2 lands the
   * identity module; a client boolean is never allowed near this, per
   * `BoundaryFrame`'s own doc comment.
   */
  supportMode?: SupportModeState | null;
  /** production | staging | preview | development. Drives the frame's slate
   *  STAGING state outside support mode. */
  environment?: string;
  children: React.ReactNode;
};

export function AppShell({
  application,
  titleBlock,
  navigation,
  role,
  defaultCollapsed = false,
  headerActions,
  tenants,
  onTenantSelect,
  adminProfile,
  notificationCount = 0,
  onCommandPaletteOpen,
  workspaces,
  newActions,
  notifications,
  account,
  planMeter,
  helpHref,
  supportMode = null,
  // ⚠ DEFAULTS TO 'production' — i.e. inert — ON PURPOSE. BoundaryFrame's own
  // spec shows the slate STAGING frame for every environment string except
  // 'production', which literally includes local development. Deriving this
  // from `NODE_ENV` would make a permanent 3px border and banner appear
  // around the entire app the moment this shell renders anywhere but a real
  // production build — including every developer's own machine, right now,
  // with no one having asked for it. The mechanism is fully wired; a caller
  // opts in by passing the real deployment environment once that value
  // actually exists (`process.env.VERCEL_ENV`, once this is deployed there).
  environment = 'production',
  children,
}: AppShellProps) {
  const isPlatform = application === 'platform';
  const pathname = usePathname();
  const frameActive = Boolean(supportMode?.active) || environment !== 'production';

  // Collapse state (desktop)
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mounted, setMounted] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Mobile sheet state
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('aLcassa:sidebar-collapsed');
    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('aLcassa:sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  // Cmd/Ctrl+B shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse]);

  // Close mobile sheet on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  /* The tenant shell's own controls. Guarded on `!isPlatform` as well as on
     the payload, so handing the console a tenant prop by accident cannot put
     a workspace switcher next to its tenant switcher. */
  const showWorkspaceSwitcher = !isPlatform && Boolean(workspaces && workspaces.length > 0);

  /*
   * The current-item treatment: a tint plus a 2px rule on the leading edge,
   * which is how BOTH `Tenant-Shell` and `Console-Shell` mark it. Only the
   * palette differs — the tenant's chrome is white and takes `--blue-50`
   * behind `--text-action`; a dark chrome would take the `--chrome-*` tier.
   *
   * ⚠ THE PLATFORM ARM IS UNREACHED TODAY AND IS KEPT ONLY BECAUSE
   * `application` IS PART OF THIS COMPONENT'S PUBLIC SHAPE. The platform
   * console does not render this shell at all — it has its own `ConsoleShell`
   * — so the sole live consumer is the tenant layout. Anyone who does light
   * up `application="platform"` gets the inverted-solid treatment this
   * component has always had rather than an untested navy-on-navy tint, and
   * should port the mark properly with `Console-Shell` open beside them.
   */
  const navActive = isPlatform
    ? {
        item: 'bg-[var(--text-primary)] font-medium text-[var(--surface-base)] shadow-sm',
        icon: 'text-[var(--surface-base)]',
        badge: 'bg-[var(--surface-base)] text-[var(--text-primary)]',
        dot: 'var(--surface-base)',
        mark: null as string | null,
      }
    : {
        item: 'bg-[var(--blue-50)] font-medium text-[var(--text-action)]',
        icon: 'text-[var(--text-action)]',
        badge: 'bg-[var(--blue-500)] text-white',
        dot: 'var(--blue-500)',
        mark: 'var(--blue-500)' as string | null,
      };

  /*
   * ⚠ NO `data-theme` STAMP ANY MORE. This used to flip the sidebar to the
   * opposite theme of the page. The product ships one theme, so there is no
   * opposite to flip to, and the token block that stamp resolved against is
   * gone.
   *
   * ⚠ TWO CHROME TIERS, DELIBERATELY UNMISTAKABLE FROM EACH OTHER. 03 §4:
   * Brian has both applications open at once, and confusing them is a real
   * operational risk. The platform console's chrome reads `--chrome-*` — a
   * constant dark navy slab, tokens.css TIER 4. The tenant application's
   * chrome reads `--tenant-chrome-*` — literal white, same tier number, the
   * opposite answer on purpose. Neither is a theme; both survive the removal
   * of dark mode untouched, and swapping `application` on this shell swaps
   * which one paints the header and sidebar.
   */
  const chromeBg = isPlatform ? 'var(--chrome-bg)' : 'var(--tenant-chrome-bg)';
  const chromeFg = isPlatform ? 'var(--chrome-fg)' : 'var(--tenant-chrome-fg)';
  const chromeRule = isPlatform ? 'var(--chrome-rule-strong)' : 'var(--tenant-chrome-rule)';

  const renderNavGroups = (isMobile: boolean = false) => (
    <div className="flex flex-1 flex-col gap-6 overflow-x-hidden overflow-y-auto px-2.5 pt-5 pb-4">
      {navigation.map((group, groupIndex) => {
        const visible = group.items.filter((item) => !item.roles || item.roles.includes(role));
        if (visible.length === 0) return null;

        return (
          <div key={group.label} data-slot="nav-group" className="flex flex-col">
            {/* Group Label / Separator */}
            {!collapsed || sidebarHovered || isMobile ? (
              <h2 className="t-eyebrow mb-1.5 px-2.5 text-2xs tracking-widest text-[var(--text-tertiary)] uppercase opacity-50 select-none">
                {group.label}
              </h2>
            ) : (
              groupIndex > 0 && (
                <div className="mx-auto my-1.5 h-px w-5 bg-[var(--ink-100)] opacity-40" />
              )
            )}

            <ul className="grid gap-1">
              {visible.map((item) => {
                const active = pathname === item.href;
                const isHovered = hoveredItem === item.href;

                return (
                  <li
                    key={item.href}
                    className="relative"
                    onMouseEnter={() => setHoveredItem(item.href)}
                    onMouseLeave={() => setHoveredItem(null)}
                  >
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      data-slot="nav-item"
                      data-active={active}
                      className={`group relative flex items-center rounded-overlay text-left transition-all duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-1 focus-visible:outline-none ${
                        active
                          ? navActive.item
                          : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-inset)] hover:text-[var(--text-primary)]'
                      } ${
                        collapsed && !sidebarHovered && !isMobile
                          ? 'mx-auto h-10 w-10 justify-center p-0'
                          : 'h-10 gap-3 px-3'
                      } `}
                    >
                      {/*
                        The design marks the current item with a 2px rule on
                        the leading edge as well as a tint — a second, non-
                        colour signal, so "where am I" survives a tint that a
                        reader cannot distinguish from the idle background.
                      */}
                      {active && navActive.mark ? (
                        <span
                          aria-hidden
                          className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full"
                          style={{ background: navActive.mark }}
                        />
                      ) : null}

                      {/* Icon */}
                      <span
                        aria-hidden
                        className={`relative flex shrink-0 items-center justify-center transition-colors duration-200 ${
                          active
                            ? navActive.icon
                            : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {item.icon}

                        {/* Micro badge in collapsed mode */}
                        {collapsed && !sidebarHovered && !isMobile && item.badge ? (
                          <span
                            aria-hidden
                            className="absolute -top-1 -right-1 size-2.5 rounded-full ring-2 ring-[var(--surface-base)]"
                            style={{
                              background: active ? navActive.dot : 'var(--text-primary)',
                            }}
                          />
                        ) : null}
                      </span>

                      {/* Expanded label & details */}
                      {(!collapsed || sidebarHovered || isMobile) && (
                        <>
                          <span className="t-compact flex-1 truncate tracking-wide">
                            {item.label}
                          </span>

                          {item.badge ? (
                            <span
                              className={`t-eyebrow flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 font-mono text-2xs font-normal transition-colors ${
                                active
                                  ? navActive.badge
                                  : 'bg-[var(--text-primary)] text-[var(--surface-base)]'
                              }`}
                            >
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>

                    {/* Floating Tooltip in Collapsed Rail Mode */}
                    {collapsed && !sidebarHovered && !isMobile && isHovered && (
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute top-1/2 left-[calc(100%+10px)] z-50 flex -translate-y-1/2 items-center gap-2 rounded-panel border px-2.5 py-1.5 whitespace-nowrap shadow-md"
                        style={{
                          background: 'var(--surface-panel)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <span className="t-compact font-medium">{item.label}</span>
                        {item.badge ? (
                          <span className="t-eyebrow rounded-chip bg-[var(--text-primary)] px-1.5 py-0.5 font-mono text-2xs text-[var(--surface-base)]">
                            {item.badge}
                          </span>
                        ) : null}
                        {item.shortcut ? (
                          <kbd className="t-eyebrow ml-1 font-mono text-3xs opacity-50">
                            {item.shortcut}
                          </kbd>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      data-slot="app-shell"
      data-application={application}
      data-density={isPlatform ? 'compact' : 'comfortable'}
      className="flex min-h-dvh flex-col"
      style={{
        ['--row-height' as string]: isPlatform ? 'var(--row-compact)' : 'var(--row-comfortable)',
        // 03 §8: "It is NOT an overlay. Layout insets to accommodate it, so
        // nothing is ever hidden beneath it.
        // Support mode reserves the top edge for the banner.
        paddingTop: frameActive ? 28 : undefined,
      }}
    >
      {frameActive ? (
        <BoundaryFrame supportMode={supportMode ?? null} environment={environment} />
      ) : null}

      {/* TOP HEADER */}
      <header
        data-slot="header"
        className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 transition-colors md:px-5"
        style={{
          background: chromeBg,
          color: chromeFg,
          borderColor: chromeRule,
        }}
      >
        <button
          className="-ml-1.5 flex cursor-pointer items-center justify-center rounded-chip p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-inset)] md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <IconMenu2 size={20} />
        </button>

        {/* TitleBlock */}
        <Link
          href={isPlatform ? '/platform' : '/app'}
          className="flex shrink-0 items-center gap-3 focus-visible:outline-2 focus-visible:outline-[var(--border-focus)]"
        >
          <Mark size={20} tone="brand" />
          {/*
            The switcher already names the workspace, so the title block would
            print it a second time three centimetres away. When the tenant
            shell has a switcher the block collapses to the mark alone.
          */}
          {showWorkspaceSwitcher ? null : (
            <span data-slot="title-block" className="hidden items-baseline gap-2 sm:flex">
              <span className="t-eyebrow opacity-70">{titleBlock.label}</span>
              <span className="t-chip text-[var(--text-primary)]">{titleBlock.value}</span>
              {titleBlock.revision ? (
                <span className="t-eyebrow opacity-50">{titleBlock.revision}</span>
              ) : null}
            </span>
          )}
        </Link>

        {/* Separator */}
        <div className="mx-1 h-5 w-px shrink-0 bg-[var(--border-strong)] opacity-20" />

        {/* Tenant Switcher (platform only) */}
        {isPlatform && tenants && tenants.length > 0 && (
          <div className="hidden sm:block">
            <TenantSwitcher tenants={tenants} onSelect={onTenantSelect} />
          </div>
        )}

        {/* Workspace switcher (tenant only) */}
        {showWorkspaceSwitcher ? (
          <div className="hidden min-w-0 sm:block">
            <WorkspaceSwitcher workspaces={workspaces!} />
          </div>
        ) : null}

        {/* Command Trigger */}
        <div className="ml-1 hidden max-w-xs flex-1 md:block">
          <CommandTrigger onOpen={onCommandPaletteOpen} />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {headerActions}

          {newActions && newActions.length > 0 ? (
            <div className="hidden sm:block">
              <NewMenu actions={newActions} />
            </div>
          ) : null}

          {/*
            With a payload the bell becomes a real menu; without one it stays
            the count-only button the platform console still renders. The old
            control was a dead end either way — it had no click handler at all,
            so the dot announced unread mail the reader could not open.
          */}
          {notifications ? (
            <NotificationsMenu notifications={notifications} unread={notificationCount} />
          ) : (
            <IconButton
              aria-label={
                notificationCount > 0
                  ? `${notificationCount} unread notifications`
                  : 'Notifications'
              }
              title="Notifications"
            >
              <span className="relative">
                <IconBell size={16} stroke={1.5} />
                {notificationCount > 0 && (
                  <span
                    aria-hidden
                    className="absolute -top-1 -right-1 size-1.5 rounded-full"
                    style={{ background: 'var(--amber-500)' }}
                  />
                )}
              </span>
            </IconButton>
          )}

          {helpHref ? (
            <Link
              href={helpHref}
              aria-label="Help and docs"
              title="Help and docs"
              className="hidden size-[34px] cursor-pointer place-items-center rounded-chip transition-colors hover:bg-[var(--surface-inset)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] sm:grid"
              style={{ color: 'var(--text-secondary)' }}
            >
              <IconHelpCircle size={18} stroke={1.5} aria-hidden />
            </Link>
          ) : null}

          {account ? (
            <>
              <span
                aria-hidden
                className="mx-1 h-5 w-px shrink-0"
                style={{ background: 'var(--border-strong)', opacity: 0.2 }}
              />
              <AccountMenu account={account} />
            </>
          ) : null}
        </div>
      </header>

      <div className="relative flex flex-1">
        {/* DESKTOP SIDEBAR */}
        <nav
          data-slot="sidebar"
          aria-label={isPlatform ? 'Platform navigation' : 'Workspace navigation'}
          onMouseEnter={() => setSidebarHovered(true)}
          onMouseLeave={() => setSidebarHovered(false)}
          className="relative hidden shrink-0 flex-col border-r transition-[width] duration-200 ease-out select-none md:flex"
          style={{
            width:
              mounted && collapsed && !sidebarHovered
                ? 'var(--nav-rail-width)'
                : 'var(--nav-width)',
            background: chromeBg,
            borderColor: chromeRule,
          }}
        >
          {/* Elegant Collapse Toggle */}
          <button
            onClick={toggleCollapse}
            className="group absolute top-6 -right-3.5 z-40 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] shadow-sm transition-all duration-200 hover:border-[var(--border-strong)] hover:bg-[var(--surface-inset)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:outline-none"
            style={{ background: chromeBg }}
            title={collapsed ? 'Expand sidebar (Cmd+B)' : 'Collapse sidebar (Cmd+B)'}
            aria-label="Toggle sidebar collapse"
          >
            {collapsed ? (
              <IconChevronRight
                size={14}
                stroke={2}
                className="transition-transform group-hover:translate-x-0.5"
              />
            ) : (
              <IconChevronLeft
                size={14}
                stroke={2}
                className="transition-transform group-hover:-translate-x-0.5"
              />
            )}
          </button>

          {/* Navigation Groups */}
          {renderNavGroups(false)}

          {/*
            Sidebar foot. The tenant shell spends it on plan pressure and puts
            identity in the header, per the design; the console keeps its
            identity card, because Brian's own account IS the console's
            anchor and it has no plan of its own to run out of.
          */}
          {planMeter ? (
            <PlanMeterCard meter={planMeter} collapsed={mounted && collapsed && !sidebarHovered} />
          ) : isPlatform && adminProfile ? (
            <AdminProfileCard profile={adminProfile} collapsed={mounted && collapsed} />
          ) : null}
        </nav>

        {/* MOBILE SLIDE-OVER */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div
              className="console-modal-backdrop fixed inset-0 transition-opacity"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <nav
              data-slot="mobile-sidebar"
              aria-label="Mobile navigation"
              className="relative flex w-4/5 max-w-sm flex-col shadow-xl transition-transform"
              style={{ background: chromeBg, borderRight: `1px solid ${chromeRule}` }}
            >
              <div
                className="flex items-center justify-between border-b p-4"
                style={{ borderColor: chromeRule }}
              >
                <span className="t-heading" style={{ color: chromeFg }}>
                  Menu
                </span>
                <IconButton
                  onClick={() => setMobileOpen(false)}
                  variant="ghost"
                  aria-label="Close menu"
                >
                  <IconX size={20} />
                </IconButton>
              </div>
              {isPlatform && tenants && tenants.length > 0 && (
                <div className="border-b p-3" style={{ borderColor: 'var(--ink-100)' }}>
                  <TenantSwitcher tenants={tenants} onSelect={onTenantSelect} />
                </div>
              )}
              {/* The header hides the switcher below `sm`, so the sheet is
                  the only way to change workspace on a phone. */}
              {showWorkspaceSwitcher ? (
                <div className="border-b p-3" style={{ borderColor: 'var(--ink-100)' }}>
                  <WorkspaceSwitcher workspaces={workspaces!} />
                </div>
              ) : null}
              {renderNavGroups(true)}
              {planMeter ? (
                <PlanMeterCard meter={planMeter} collapsed={false} />
              ) : isPlatform && adminProfile ? (
                <AdminProfileCard profile={adminProfile} collapsed={false} />
              ) : null}
            </nav>
          </div>
        )}

        {/* Main Content Area */}
        <main id="main" data-slot="main" className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto p-5 md:p-6" style={{ maxWidth: 'var(--content-max)' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
