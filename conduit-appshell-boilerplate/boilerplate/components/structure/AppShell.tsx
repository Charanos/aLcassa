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
} from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { ThemeToggle } from '@/components/primitives/ThemeToggle';
import { IconButton } from '@/components/primitives/IconButton';
import { TenantSwitcher, type TenantSummary } from './TenantSwitcher';
import { CommandTrigger } from './CommandTrigger';
import { AdminProfileCard, type AdminProfile } from './AdminProfileCard';
import type { ResolvedTheme } from '@/lib/theme-shared';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: number;
};

export type NavGroup = { label: string; items: NavItem[] };

export type AppShellProps = {
  application: 'tenant' | 'platform';
  titleBlock: { label: string; value: string; revision?: string };
  navigation: NavGroup[];
  role: string;
  theme: ResolvedTheme;
  defaultCollapsed?: boolean;
  headerActions?: React.ReactNode;
  /** Platform console only — powers the tenant switcher in the topbar. */
  tenants?: TenantSummary[];
  onTenantSelect?: (tenant: TenantSummary) => void;
  /** Sidebar footer identity. Falls back to a neutral placeholder if omitted. */
  adminProfile?: AdminProfile;
  notificationCount?: number;
  onCommandPaletteOpen?: () => void;
  children: React.ReactNode;
};

const DEFAULT_PROFILE: AdminProfile = {
  name: 'Platform admin',
  email: 'admin@conduit.internal',
  role: 'Platform admin',
  initials: 'PA',
};

export function AppShell({
  application,
  titleBlock,
  navigation,
  role,
  theme,
  defaultCollapsed = false,
  headerActions,
  tenants,
  onTenantSelect,
  adminProfile = DEFAULT_PROFILE,
  notificationCount = 0,
  onCommandPaletteOpen,
  children,
}: AppShellProps) {
  const isPlatform = application === 'platform';
  const pathname = usePathname();

  // Collapse state (desktop)
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [mounted, setMounted] = useState(false);

  // Mobile sheet state
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('conduit:sidebar-collapsed');
    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('conduit:sidebar-collapsed', String(next));
      return next;
    });
  }, []);

  // Cmd/Ctrl+B shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
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

  // The platform console inverts its sidebar theme relative to the page ground.
  const sidebarTheme = isPlatform ? (theme === 'dark' ? 'light' : 'dark') : theme;

  const renderNavGroups = (isMobile: boolean = false) => (
    <div className="flex flex-1 flex-col gap-6 pt-5 px-3 pb-4 overflow-y-auto">
      {navigation.map((group) => {
        const visible = group.items.filter(
          (item) => !item.roles || item.roles.includes(role),
        );
        if (visible.length === 0) return null;

        return (
          <div key={group.label} data-slot="nav-group">
            {(!collapsed || isMobile) && (
              <h2 className="t-eyebrow px-2.5 text-[var(--ink-tertiary)] mb-2 opacity-50">
                {group.label}
              </h2>
            )}
            <ul className="grid gap-1">
              {visible.map((item) => {
                const active = pathname === item.href;
                const showTooltip = collapsed && !isMobile;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={showTooltip ? item.label : undefined}
                      data-slot="nav-item"
                      data-active={active}
                      className={`
                        group relative flex items-center gap-3 rounded-chip px-2.5 py-2
                        transition-all duration-150 ease-out border
                        ${
                          active
                            ? 'bg-[var(--surface-raised)] border-[var(--rule-base)] text-[var(--ink-primary)] shadow-sm'
                            : 'border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-hover)]'
                        }
                        ${collapsed && !isMobile ? 'justify-center px-0 h-10 w-10 mx-auto' : ''}
                      `}
                    >
                      {/* Active rail mark — a copper tick fused to the left edge,
                          echoing the boundary frame's vocabulary at small scale. */}
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-4 w-[2px] -translate-x-[13px] -translate-y-1/2 rounded-full bg-[var(--copper-solid)]"
                          style={{ display: collapsed && !isMobile ? 'none' : 'block' }}
                        />
                      )}
                      <span
                        aria-hidden
                        className={`relative transition-colors duration-150 shrink-0 ${
                          active
                            ? 'text-[var(--copper-ink)]'
                            : 'text-[var(--ink-tertiary)] group-hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        {item.icon}
                        {item.badge ? (
                          <span
                            aria-hidden
                            className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full px-[3px] t-eyebrow tracking-normal"
                            style={{ background: 'var(--ochre-500)', color: '#fff', fontSize: '9px' }}
                          >
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        ) : null}
                      </span>
                      {(!collapsed || isMobile) && (
                        <span className="t-compact flex-1 font-medium tracking-wide">
                          {item.label}
                        </span>
                      )}
                      {active && (!collapsed || isMobile) && (
                        <span
                          aria-hidden
                          className="size-1.5 rounded-full bg-[var(--copper-solid)] shrink-0 opacity-80"
                        />
                      )}
                    </Link>
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
      className="min-h-dvh flex flex-col"
      style={{
        ['--row-height' as string]: isPlatform ? 'var(--row-compact)' : 'var(--row-comfortable)',
      }}
    >
      {/* TOP HEADER */}
      <header
        data-slot="header"
        className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b px-4 md:px-5 transition-colors"
        style={{
          background: isPlatform ? 'var(--sheet-invert)' : 'var(--surface-page)',
          color: isPlatform ? 'var(--sheet)' : 'var(--ink-primary)',
          borderColor: isPlatform ? 'transparent' : 'var(--rule-soft)',
        }}
      >
        <button
          className="md:hidden flex items-center justify-center -ml-1.5 p-2 rounded-chip hover:bg-white/10 transition-colors"
          style={{ color: isPlatform ? 'var(--sheet)' : 'var(--ink-secondary)' }}
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <IconMenu2 size={20} />
        </button>

        {/* TitleBlock — 03 §9 Tier 2. Label / value / revision, the drafting
            sheet's own header, unmistakable even in peripheral vision. */}
        <Link href={isPlatform ? '/platform' : '/app'} className="flex items-center gap-3 shrink-0">
          <Mark size={20} tone={isPlatform ? 'copper' : 'copper'} />
          <span data-slot="title-block" className="hidden sm:flex items-baseline gap-2">
            <span className="t-eyebrow opacity-60">{titleBlock.label}</span>
            <span className="t-chip" style={{ color: isPlatform ? 'var(--sheet)' : 'var(--ink-primary)' }}>
              {titleBlock.value}
            </span>
            {titleBlock.revision ? <span className="t-eyebrow opacity-40">{titleBlock.revision}</span> : null}
          </span>
        </Link>

        <div className="mx-1 h-5 w-px shrink-0 opacity-20" style={{ background: 'currentColor' }} />

        {/* Primary topbar action: tenant switcher, the console's most common
            keyboard action, immediately after the skip link and TitleBlock.
            Scoped dark: the platform header is always inverted regardless of
            page theme (03 §4), so its embedded controls need their own fixed
            contrast rather than inheriting page-theme-scoped surface tokens. */}
        {isPlatform && tenants && tenants.length > 0 && (
          <div data-theme="dark">
            <TenantSwitcher tenants={tenants} onSelect={onTenantSelect} />
          </div>
        )}

        {/* Command trigger sits right of the switcher — search is secondary
            to "where am I," never competing with it for primacy. */}
        <div className="hidden md:block flex-1 max-w-xs ml-1" data-theme={isPlatform ? 'dark' : undefined}>
          <CommandTrigger onOpen={onCommandPaletteOpen} />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {headerActions}
          <IconButton
            aria-label={notificationCount > 0 ? `${notificationCount} unread notifications` : 'Notifications'}
            title="Notifications"
            className={isPlatform ? 'text-[var(--sheet)]/70 hover:text-[var(--sheet)] hover:bg-white/10' : ''}
          >
            <span className="relative">
              <IconBell size={16} stroke={1.5} />
              {notificationCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-1 size-1.5 rounded-full"
                  style={{ background: 'var(--ochre-500)' }}
                />
              )}
            </span>
          </IconButton>
          <ThemeToggle theme={theme} compact />
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* DESKTOP SIDEBAR */}
        <nav
          data-slot="sidebar"
          data-theme={sidebarTheme}
          aria-label={isPlatform ? 'Platform navigation' : 'Workspace navigation'}
          className="relative hidden shrink-0 border-r md:flex flex-col transition-[width] duration-200 ease-out"
          style={{
            width: mounted && collapsed ? 'var(--nav-rail-width)' : 'var(--nav-width)',
            background: 'var(--surface-page)',
            borderColor: 'var(--rule-soft)',
          }}
        >
          <button
            onClick={toggleCollapse}
            className="absolute top-8 -right-3 z-40 flex size-6 items-center justify-center rounded-full border-[1.5px] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            style={{
              background: 'var(--surface-panel)',
              borderColor: 'var(--rule-strong)',
              color: 'var(--ink-secondary)',
              boxShadow: '0 1px 3px rgb(22 24 29 / 0.12)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--copper-ink)';
              e.currentTarget.style.borderColor = 'var(--copper-600)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--ink-secondary)';
              e.currentTarget.style.borderColor = 'var(--rule-strong)';
            }}
            title={collapsed ? 'Expand sidebar (Cmd+B)' : 'Collapse sidebar (Cmd+B)'}
            aria-label="Toggle sidebar collapse"
          >
            {collapsed ? <IconChevronRight size={13} stroke={2.5} /> : <IconChevronLeft size={13} stroke={2.5} />}
          </button>

          {renderNavGroups(false)}

          <AdminProfileCard profile={adminProfile} collapsed={mounted && collapsed} />
        </nav>

        {/* MOBILE SLIDE-OVER */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 transition-opacity"
              style={{ background: 'var(--scrim)' }}
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <nav
              data-theme={sidebarTheme}
              data-slot="mobile-sidebar"
              aria-label="Mobile navigation"
              className="relative flex w-4/5 max-w-sm flex-col shadow-xl transition-transform"
              style={{ background: 'var(--surface-page)', borderRight: '1px solid var(--rule-soft)' }}
            >
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--rule-soft)' }}>
                <span className="t-h3 text-[var(--ink-primary)]">Menu</span>
                <IconButton onClick={() => setMobileOpen(false)} variant="ghost" aria-label="Close menu">
                  <IconX size={20} />
                </IconButton>
              </div>
              {isPlatform && tenants && tenants.length > 0 && (
                <div className="px-3 pt-3">
                  <TenantSwitcher tenants={tenants} onSelect={onTenantSelect} />
                </div>
              )}
              {renderNavGroups(true)}
              <AdminProfileCard profile={adminProfile} collapsed={false} />
            </nav>
          </div>
        )}

        <main id="main" data-slot="main" className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto p-5 md:p-6" style={{ maxWidth: 'var(--content-max)' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
