'use client';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

/**
 * The header's dropdown shell, shared by the workspace switcher, the quick
 * create menu, notifications and the account menu.
 *
 * ⚠ THIS IS RADIX RATHER THAN A HAND-ROLLED POPOVER, AND THE REASON IS THE
 * KEYBOARD. The shell needed four of these at once. `TenantSwitcher` and
 * `AdminProfileCard` each hand-roll click-outside and Escape, which is the
 * easy half — what they do not do is roving focus, typeahead, focus return to
 * the trigger on close, or `aria-expanded`/`aria-controls` wiring. Four more
 * copies of the easy half would have been four more menus a keyboard reader
 * cannot drive. Radix brings all of it and the panel below is only styling.
 *
 * The blur is deliberate and budgeted: 03's glass rules allow at most three
 * blurred surfaces composited at once, and these menus are mutually exclusive
 * — opening one closes the others — so at most one is ever live.
 */

export const HeaderMenu = DropdownMenu.Root;
export const HeaderMenuTrigger = DropdownMenu.Trigger;

export function HeaderMenuContent({
  children,
  width = 258,
  align = 'end',
}: {
  children: React.ReactNode;
  width?: number;
  align?: 'start' | 'end' | 'center';
}) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={8}
        collisionPadding={12}
        className="surface-glass-strong z-60 overflow-hidden rounded-[var(--radius-lg)] p-1.5"
        style={{
          width,
          maxWidth: 'calc(100vw - 24px)',
          animation: 'panel-in var(--duration-base) var(--ease-out)',
        }}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

/** A mono, letterspaced section heading. Not focusable — Radix skips labels. */
export function HeaderMenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu.Label
      className="t-eyebrow px-2.5 pt-2 pb-1.5 uppercase"
      style={{ color: 'var(--text-tertiary)' }}
    >
      {children}
    </DropdownMenu.Label>
  );
}

export function HeaderMenuSeparator() {
  return (
    <DropdownMenu.Separator
      className="my-1.5 h-px"
      style={{ background: 'var(--border-subtle)' }}
    />
  );
}

export function HeaderMenuItem({
  children,
  onSelect,
  asChild,
  tone = 'default',
}: {
  children: React.ReactNode;
  onSelect?: () => void;
  asChild?: boolean;
  /** `danger` is for sign-out and nothing else — 03 §14, oxide refuses. */
  tone?: 'default' | 'danger';
}) {
  return (
    <DropdownMenu.Item
      asChild={asChild}
      onSelect={onSelect}
      className="t-compact flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] px-2.5 py-2 outline-none select-none data-[highlighted]:bg-[var(--surface-inset)]"
      style={{ color: tone === 'danger' ? 'var(--danger-fg)' : 'var(--text-primary)' }}
    >
      {children}
    </DropdownMenu.Item>
  );
}
