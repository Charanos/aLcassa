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
import { IconButton } from '@/components/primitives/IconButton';
import { TenantSwitcher, type TenantSummary } from './TenantSwitcher';
import { CommandTrigger } from './CommandTrigger';
import { AdminProfileCard, type AdminProfile } from './AdminProfileCard';

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
  /** Sidebar footer identity. */
  adminProfile?: AdminProfile;
  notificationCount?: number;
  onCommandPaletteOpen?: () => void;
  children: React.ReactNode;
};

const DEFAULT_PROFILE: AdminProfile = {
  name: 'Rafiqur Rahman',
  email: 'rafiqur51@jira.com',
  role: 'Platform Admin',
  initials: 'RR',
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
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  
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

  /*
   * ⚠ NO `data-theme` STAMP ANY MORE. This used to flip the sidebar to the
   * opposite theme of the page. The product ships one theme, so there is no
   * opposite to flip to, and the token block that stamp resolved against is
   * gone.
   *
   * A platform sidebar here would be dark the way the console's is: by
   * reading the `--chrome-*` tier, which is theme-independent by
   * construction. See tokens.css, TIER 4. This shell is only mounted with
   * `application="tenant"` today, where the sidebar is light by design.
   */

  const renderNavGroups = (isMobile: boolean = false) => (
    <div className="flex flex-1 flex-col gap-6 pt-5 px-2.5 pb-4 overflow-y-auto overflow-x-hidden">
      {navigation.map((group, groupIndex) => {
        const visible = group.items.filter(
          (item) => !item.roles || item.roles.includes(role),
        );
        if (visible.length === 0) return null;

        return (
          <div key={group.label} data-slot="nav-group" className="flex flex-col">
            {/* Group Label / Separator */}
            {(!collapsed || isMobile) ? (
              <h2 className="t-eyebrow px-2.5 text-[var(--ink-tertiary)] mb-1.5 opacity-50 uppercase tracking-widest text-[10px] select-none">
                {group.label}
              </h2>
            ) : (
              groupIndex > 0 && (
                <div className="mx-auto my-1.5 h-px w-5 bg-[var(--rule-soft)] opacity-40" />
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
                      className={`
                        group relative flex items-center rounded-lg text-left transition-all duration-200 ease-out
                        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-1
                        ${
                          active
                            ? 'bg-[var(--ink-primary)] text-[var(--surface-page)] font-medium shadow-sm'
                            : 'bg-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-hover)]'
                        }
                        ${
                          collapsed && !isMobile
                            ? 'h-10 w-10 justify-center mx-auto p-0'
                            : 'h-10 gap-3 px-3'
                        }
                      `}
                    >
                      {/* Icon */}
                      <span
                        aria-hidden
                        className={`relative flex items-center justify-center transition-colors duration-200 shrink-0 ${
                          active
                            ? 'text-[var(--surface-page)]'
                            : 'text-[var(--ink-tertiary)] group-hover:text-[var(--ink-primary)]'
                        }`}
                      >
                        {item.icon}
                        
                        {/* Micro badge in collapsed mode */}
                        {collapsed && !isMobile && item.badge ? (
                          <span
                            aria-hidden
                            className={`absolute -right-1 -top-1 size-2.5 rounded-full ring-2 ring-[var(--surface-page)] ${
                              active ? 'bg-[var(--surface-page)]' : 'bg-[var(--ink-primary)]'
                            }`}
                          />
                        ) : null}
                      </span>

                      {/* Expanded label & details */}
                      {(!collapsed || isMobile) && (
                        <>
                          <span className="t-compact flex-1 tracking-wide truncate">
                            {item.label}
                          </span>

                          {item.badge ? (
                            <span
                              className={`t-eyebrow flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 font-mono text-[10px] font-normal shrink-0 transition-colors ${
                                active
                                  ? 'bg-[var(--surface-page)] text-[var(--ink-primary)]'
                                  : 'bg-[var(--ink-primary)] text-[var(--surface-page)]'
                              }`}
                            >
                              {item.badge > 99 ? '99+' : item.badge}
                            </span>
                          ) : null}
                        </>
                      )}
                    </Link>

                    {/* Floating Tooltip in Collapsed Rail Mode */}
                    {collapsed && !isMobile && isHovered && (
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2 flex items-center gap-2 rounded-md border px-2.5 py-1.5 whitespace-nowrap shadow-md"
                        style={{
                          background: 'var(--surface-panel)',
                          borderColor: 'var(--rule-base)',
                          color: 'var(--ink-primary)',
                        }}
                      >
                        <span className="t-compact font-medium">{item.label}</span>
                        {item.badge ? (
                          <span
                            className="t-eyebrow rounded-sm px-1.5 py-0.5 font-mono text-[10px] bg-[var(--ink-primary)] text-[var(--surface-page)]"
                          >
                            {item.badge}
                          </span>
                        ) : null}
                        {item.shortcut ? (
                          <kbd className="t-eyebrow ml-1 opacity-50 font-mono text-[9px]">
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
          background: 'var(--surface-page)',
          color: 'var(--ink-primary)',
          borderColor: 'var(--rule-soft)',
        }}
      >
        <button
          className="md:hidden flex items-center justify-center -ml-1.5 p-2 rounded-chip hover:bg-[var(--surface-hover)] transition-colors text-[var(--ink-secondary)] cursor-pointer"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <IconMenu2 size={20} />
        </button>

        {/* TitleBlock */}
        <Link href={isPlatform ? '/platform' : '/app'} className="flex items-center gap-3 shrink-0 focus-visible:outline-2 focus-visible:outline-[var(--focus)]">
          <Mark size={20} tone="brand" />
          <span data-slot="title-block" className="hidden sm:flex items-baseline gap-2">
            <span className="t-eyebrow opacity-70">{titleBlock.label}</span>
            <span className="t-chip text-[var(--ink-primary)]">{titleBlock.value}</span>
            {titleBlock.revision ? (
              <span className="t-eyebrow opacity-50">{titleBlock.revision}</span>
            ) : null}
          </span>
        </Link>

        {/* Separator */}
        <div className="mx-1 h-5 w-px shrink-0 opacity-20 bg-[var(--rule-strong)]" />

        {/* Tenant Switcher (platform only) */}
        {isPlatform && tenants && tenants.length > 0 && (
          <div className="hidden sm:block">
            <TenantSwitcher tenants={tenants} onSelect={onTenantSelect} />
          </div>
        )}

        {/* Command Trigger */}
        <div className="hidden md:block flex-1 max-w-xs ml-1">
          <CommandTrigger onOpen={onCommandPaletteOpen} />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {headerActions}
          <IconButton
            aria-label={notificationCount > 0 ? `${notificationCount} unread notifications` : 'Notifications'}
            title="Notifications"
          >
            <span className="relative">
              <IconBell size={16} stroke={1.5} />
              {notificationCount > 0 && (
                <span
                  aria-hidden
                  className="absolute -right-1 -top-1 size-1.5 rounded-full"
                  style={{ background: 'var(--ochre-solid)' }}
                />
              )}
            </span>
          </IconButton>
        </div>
      </header>

      <div className="flex flex-1 relative">
        {/* DESKTOP SIDEBAR: Production Grade Inverted Sidebar */}
        <nav
          data-slot="sidebar"
          aria-label={isPlatform ? 'Platform navigation' : 'Workspace navigation'}
          className="relative hidden shrink-0 border-r md:flex flex-col transition-[width] duration-200 ease-out select-none"
          style={{
            width: mounted && collapsed ? 'var(--nav-rail-width)' : 'var(--nav-width)',
            background: 'var(--surface-page)',
            borderColor: 'var(--rule-soft)',
          }}
        >
          {/* Elegant Collapse Toggle */}
          <button
            onClick={toggleCollapse}
            className="absolute top-6 -right-3.5 z-40 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--rule-base)] bg-[var(--surface-page)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--rule-strong)] hover:bg-[var(--surface-hover)] shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] cursor-pointer group"
            title={collapsed ? 'Expand sidebar (Cmd+B)' : 'Collapse sidebar (Cmd+B)'}
            aria-label="Toggle sidebar collapse"
          >
            {collapsed ? (
              <IconChevronRight size={14} stroke={2} className="group-hover:translate-x-0.5 transition-transform" />
            ) : (
              <IconChevronLeft size={14} stroke={2} className="group-hover:-translate-x-0.5 transition-transform" />
            )}
          </button>

          {/* Navigation Groups */}
          {renderNavGroups(false)}

          {/* Footer Identity Card */}
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
              data-slot="mobile-sidebar"
              aria-label="Mobile navigation"
              className="relative flex w-4/5 max-w-sm flex-col shadow-xl transition-transform"
              style={{ background: 'var(--surface-page)', borderRight: '1px solid var(--rule-soft)' }}
            >
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--rule-soft)' }}>
                <span className="t-heading text-[var(--ink-primary)]">Menu</span>
                <IconButton 
                  onClick={() => setMobileOpen(false)} 
                  variant="ghost" 
                  aria-label="Close menu"
                >
                  <IconX size={20} />
                </IconButton>
              </div>
              {isPlatform && tenants && tenants.length > 0 && (
                <div className="p-3 border-b" style={{ borderColor: 'var(--rule-soft)' }}>
                  <TenantSwitcher tenants={tenants} onSelect={onTenantSelect} />
                </div>
              )}
              {renderNavGroups(true)}
              <AdminProfileCard profile={adminProfile} collapsed={false} />
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
