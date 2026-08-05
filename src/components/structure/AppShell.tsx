import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';
import { ThemeToggle } from '@/components/primitives/ThemeToggle';
import type { ResolvedTheme } from '@/lib/theme-shared';

/**
 * 03 §4 · 02 §8. ONE SHELL, TWO APPLICATIONS.
 *
 * Brian will have both open at once. Confusing them is a real operational risk,
 * because an action taken in the wrong context could be a support-mode write on
 * a live tenant.
 *
 * THE DISTINCTION IS STRUCTURAL, NOT DECORATIVE:
 *
 *                    tenant application       platform console
 *   header ground    surface-raised           surface-invert, INVERTED
 *   header text      ink-primary              ink-inverse
 *   sidebar          surface-page             surface-sunken
 *   density          comfortable (56px)       compact (44px)
 *   title block      the tenant's name        PLATFORM, plus the environment
 *
 * The inverted console header is the single strongest signal. It is present on
 * EVERY platform page at all times, it costs nothing, and it is unmissable in
 * peripheral vision, which is the only kind of attention available to somebody
 * who has been working for six hours.
 */

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** 02 §8. Role-filtered, so an agent simply DOES NOT SEE Credentials rather
   *  than seeing it disabled. A disabled item invites a support ticket. */
  roles?: string[];
};

export type NavGroup = { label: string; items: NavItem[] };

export type AppShellProps = {
  application: 'tenant' | 'platform';
  /** The tenant's name, or `PLATFORM` plus the environment on the console. */
  titleBlock: { label: string; value: string; revision?: string };
  navigation: NavGroup[];
  role: string;
  /** Resolved server side by the layout, same as every other surface. The
   *  toggle lives IN the shell rather than in `headerActions`, so a future
   *  page cannot ship without it by forgetting to pass it. 03 §19. */
  theme: ResolvedTheme;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  application,
  titleBlock,
  navigation,
  role,
  theme,
  headerActions,
  children,
}: AppShellProps) {
  const isPlatform = application === 'platform';

  return (
    <div
      data-slot="app-shell"
      data-application={application}
      data-density={isPlatform ? 'compact' : 'comfortable'}
      className="min-h-dvh"
      style={{
        // Density is a first-class setting rather than a preference buried in a
        // menu, and it is set here so every row and control below inherits it.
        // 03 §6.
        ['--row-height' as string]: isPlatform ? 'var(--row-compact)' : 'var(--row-comfortable)',
      }}
    >
      <header
        data-slot="header"
        className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b px-4"
        style={{
          background: isPlatform ? 'var(--surface-invert)' : 'var(--surface-raised)',
          color: isPlatform ? 'var(--ink-inverse)' : 'var(--ink-primary)',
          borderColor: isPlatform ? 'var(--surface-invert)' : 'var(--rule-base)',
        }}
      >
        <Link href={isPlatform ? '/platform' : '/app'} className="flex items-center gap-3">
          <Mark size={20} tone={isPlatform ? 'inverse' : 'copper'} />
          {/* 03 §9 · TitleBlock. The drafting sheet header: label, value,
              revision. The same component carries the console header, the audit
              stamp and the credential card, which is what makes those three
              feel like parts of one document. */}
          <span data-slot="title-block" className="flex items-baseline gap-2">
            <span className="t-eyebrow opacity-70">{titleBlock.label}</span>
            <span className="t-chip">{titleBlock.value}</span>
            {titleBlock.revision ? (
              <span className="t-eyebrow opacity-50">{titleBlock.revision}</span>
            ) : null}
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {headerActions}
          <ThemeToggle theme={theme} compact />
        </div>
      </header>

      <div className="flex">
        <nav
          data-slot="sidebar"
          aria-label={isPlatform ? 'Platform navigation' : 'Workspace navigation'}
          className="hidden shrink-0 border-r md:block"
          style={{
            width: 'var(--nav-width)',
            background: isPlatform ? 'var(--surface-sunken)' : 'var(--surface-page)',
            borderColor: 'var(--rule-soft)',
            minHeight: 'calc(100dvh - 3.5rem)',
          }}
        >
          <div className="flex flex-col gap-6 p-4">
            {navigation.map((group) => {
              const visible = group.items.filter(
                (item) => !item.roles || item.roles.includes(role),
              );
              if (visible.length === 0) return null;

              return (
                <div key={group.label} data-slot="nav-group">
                  <h2 className="t-micro px-2 text-[var(--ink-tertiary)]">{group.label}</h2>
                  <ul className="mt-2 grid gap-0.5">
                    {visible.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          data-slot="nav-item"
                          className="t-compact flex items-center gap-2.5 rounded-chip px-2 py-2 text-[var(--ink-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--ink-primary)]"
                        >
                          <span aria-hidden className="text-[var(--ink-tertiary)]">
                            {item.icon}
                          </span>
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </nav>

        <main id="main" data-slot="main" className="min-w-0 flex-1">
          <div className="mx-auto p-5 md:p-6" style={{ maxWidth: 'var(--content-max)' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
