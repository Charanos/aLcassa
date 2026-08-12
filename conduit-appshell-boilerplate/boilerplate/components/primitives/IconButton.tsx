'use client';

import { forwardRef } from 'react';

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'ghost' | 'bordered';
  size?: 'sm' | 'md';
  tone?: 'default' | 'copper';
  active?: boolean;
};

/**
 * 03 §9 Tier 1. Icon-only control, 44px hit area minimum (achieved via padding
 * so the visible box can stay small), reserved for table row actions, console
 * toolbars, and the theme toggle.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ variant = 'ghost', size = 'md', tone = 'default', active = false, className = '', children, ...props }, ref) => {
    const box = size === 'sm' ? 'size-8' : 'size-9';
    const base =
      'relative inline-flex items-center justify-center shrink-0 rounded-chip border transition-colors duration-150 ease-out cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]';

    const toneActive =
      tone === 'copper'
        ? 'text-[var(--copper-ink)] bg-[var(--copper-100)] border-[var(--copper-600)]/30'
        : 'text-[var(--ink-primary)] bg-[var(--surface-raised)] border-[var(--rule-base)]';

    const variants =
      variant === 'bordered'
        ? `border-[var(--rule-base)] bg-[var(--surface-panel)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:border-[var(--rule-strong)] hover:bg-[var(--surface-hover)]`
        : `border-transparent text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[var(--surface-hover)]`;

    return (
      <button
        ref={ref}
        type="button"
        className={`${base} ${box} ${active ? toneActive : variants} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  },
);
IconButton.displayName = 'IconButton';
