'use client';

import React, { forwardRef } from 'react';
import type { Icon as TablerIcon } from '@tabler/icons-react';

/**
 * THE STATUS BADGE. 03 §14.
 *
 * ⚠ IT READS TOKENS. IT USED TO HOLD COLOUR.
 *
 * This file carried forty-five raw Tailwind palette classes and twenty-one
 * `rgba()` literals — `bg-emerald-500/[0.08] text-emerald-800`,
 * `shadow-[0_0_6px_rgba(16,185,129,0.8)]`, one set per tone per ground. That is
 * the defect `tokens.css` names in its own header, and the cost is larger than
 * tidiness: it put a SECOND green in the product. A badge reading "healthy" in
 * Tailwind's emerald, beside a meter reading healthy in `--success-fg`, is two
 * greens for one meaning and nobody can say which one is the product's.
 *
 * The six tones now resolve through `--badge-*`, which are themselves derived
 * from the semantic scale — so "healthy" has exactly one value, and a badge row
 * that reads too hot is one edit in `tokens.css` rather than six here.
 *
 * ⚠ THE APPEARANCE CHANGED, DELIBERATELY, AND THE DIRECTION IS THE POINT.
 * Tailwind's emerald/rose/amber are more saturated than this product's muted
 * status scale. Matching the system means the badges sit down slightly against
 * the cream ground — which is the aLcassa identity rather than a regression.
 * If a hotter register is wanted, it is now `--badge-tint` and `--badge-edge`,
 * two numbers, not a rewrite.
 *
 * ⚠ `dark` SWITCHES TIER, NOT THEME. There is no dark mode (03 §2). The flag
 * means "this badge is on the chrome slab" — the console header, rail, or an
 * inverted hero — where the page's muted inks are unreadable and the lightened
 * `--chrome-*` steps apply. Same meanings, different step, which is exactly
 * what `--chrome-action` does one tier up.
 */

export type StatusBadgeTone = 'success' | 'brand' | 'warning' | 'info' | 'danger' | 'neutral';

export type StatusBadgeVariant = 'pill' | 'squircle' | 'glass';

export type StatusBadgeSize = 'sm' | 'md';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusBadgeTone;
  variant?: StatusBadgeVariant;
  size?: StatusBadgeSize;
  dot?: boolean;
  pulse?: boolean;
  icon?: TablerIcon;
  font?: 'sans' | 'mono';
  /** On the chrome slab rather than the page. See the header note. */
  dark?: boolean;
  children: React.ReactNode;
}

/**
 * One tone, two tiers. `page` reads the Tier-3 badge tokens; `chrome` reads the
 * Tier-4 lightened status inks and tints them against the slab.
 *
 * Written as CSS custom-property NAMES rather than resolved values so a theme
 * or tier change never needs this file reopened.
 */
const TONE: Record<StatusBadgeTone, { page: string; chrome: string }> = {
  success: { page: 'success', chrome: 'var(--chrome-success)' },
  brand: { page: 'brand', chrome: 'var(--chrome-brand)' },
  warning: { page: 'warning', chrome: 'var(--chrome-warning)' },
  info: { page: 'info', chrome: 'var(--chrome-info)' },
  danger: { page: 'danger', chrome: 'var(--chrome-danger)' },
  neutral: { page: 'neutral', chrome: 'var(--chrome-fg-muted)' },
};

const SHAPE: Record<StatusBadgeVariant, string> = {
  pill: 'rounded-full',
  squircle: 'rounded-[7px]',
  glass: 'rounded-full backdrop-blur-xs',
};

const SIZE: Record<StatusBadgeSize, string> = {
  sm: 'text-[10.5px] px-2 py-0.5 min-h-[20px] gap-1.5',
  md: 'text-[11.5px] px-2.5 py-1 min-h-[24px] gap-1.5',
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(function StatusBadge(
  {
    tone = 'neutral',
    variant = 'pill',
    size = 'md',
    dot = false,
    pulse = false,
    icon: Icon,
    font = 'sans',
    dark = false,
    className = '',
    style,
    children,
    ...props
  },
  ref,
) {
  const spec = TONE[tone];

  /*
    On the page tier each tone has its own three tokens, already mixed. On the
    chrome tier there is one ink per tone and the tint is mixed here against the
    slab — the same treatment `--chrome-badge-*` gives the primitive Badge, so
    the two badges in this codebase agree about what chrome looks like.
  */
  const ink = dark ? spec.chrome : `var(--badge-${spec.page}-fg)`;
  const fill = dark
    ? `color-mix(in oklab, ${spec.chrome} 14%, transparent)`
    : `var(--badge-${spec.page}-bg)`;
  const edge = dark
    ? `color-mix(in oklab, ${spec.chrome} 30%, transparent)`
    : `var(--badge-${spec.page}-edge)`;

  const fontClass =
    font === 'mono' ? 'font-mono tracking-tight' : 'font-sans font-medium tracking-tight';

  return (
    <span
      ref={ref}
      className={`inline-flex shrink-0 items-center justify-center border font-medium transition-colors select-none ${SHAPE[variant]} ${SIZE[size]} ${fontClass} ${className}`}
      style={{
        color: ink,
        background: fill,
        borderColor: edge,
        /* One rim for every tone. Four per-tone shadows were four values doing
           the work of one, and the difference was invisible at 20px tall. */
        boxShadow: dark ? undefined : 'var(--badge-rim)',
        ...style,
      }}
      {...props}
    >
      {dot && (
        <span
          className="relative flex size-1.5 shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          {pulse && (
            <span
              className="absolute inline-flex size-full animate-ping rounded-full opacity-75 motion-reduce:animate-none"
              style={{ background: ink }}
            />
          )}
          <span className="relative inline-flex size-1.5 rounded-full" style={{ background: ink }} />
        </span>
      )}

      {Icon && (
        <Icon
          size={size === 'sm' ? 12 : 13}
          /* 1.75 rather than 2.2. The system's icon stroke is 1.5 because at a
             weight ceiling of 500 a heavier stroke reads louder than the type
             beside it; a badge is small enough to want a touch more, and 2.2
             was enough to make the glyph the loudest thing in the chip. */
          stroke={1.75}
          className="shrink-0"
          style={{ color: ink }}
          aria-hidden="true"
        />
      )}

      <span className="truncate leading-none">{children}</span>
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';
