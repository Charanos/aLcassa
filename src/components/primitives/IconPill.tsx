import * as React from 'react';
import type { Icon as TablerIcon } from '@tabler/icons-react';

export interface IconPillProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: TablerIcon;
  iconSize?: number;
  iconStroke?: number;
  variant?: 'chrome' | 'tinted';
  tone?: 'success' | 'brand' | 'warning' | 'info' | 'danger' | 'neutral';
}

/**
 * A circular disc for housing an icon.
 *
 * - `chrome` (default): A glassmorphic disc for the dark CHROME TIER.
 * - `tinted`: A tinted soft pill for light surface backgrounds.
 */
export const IconPill = React.forwardRef<HTMLDivElement, IconPillProps>(
  (
    {
      icon: Icon,
      iconSize = 12,
      iconStroke = 2,
      variant = 'chrome',
      tone = 'neutral',
      className,
      style,
      ...props
    },
    ref,
  ) => {
    if (variant === 'chrome') {
      return (
        <div
          ref={ref}
          className={`flex size-6 shrink-0 items-center justify-center rounded-full ring-1 ring-[var(--chrome-pill-ring)] ${className || ''}`}
          style={{
            background: 'var(--chrome-pill-bg)',
            boxShadow: 'var(--chrome-pill-rim)',
            ...style,
          }}
          {...props}
        >
          <Icon
            size={iconSize}
            stroke={iconStroke}
            style={{ color: 'var(--invert-card-fg)', opacity: 0.8 }}
            aria-hidden
          />
        </div>
      );
    }

    /*
      ⚠ THE TINTED VARIANT READS THE BADGE TOKENS, AND THAT IS THE POINT.

      This was a third copy of the same six meanings, in raw rgb —
      `rgba(16,185,129,0.12)` for success, and so on. Between this file,
      `ui/StatusBadge` and `feedback/Badge` the product carried THREE greens for
      "healthy", none of them `--success-fg`, and no way to say which was
      correct.

      There is one set now. A pill and the badge beside it on the same card are
      mixed from the same ink at the same strength, so they agree by
      construction rather than by somebody keeping two files in step.
    */
    const fg = `var(--badge-${tone}-fg)`;

    return (
      <div
        ref={ref}
        className={`flex size-6 shrink-0 items-center justify-center rounded-full ${className || ''}`}
        style={{
          background: `var(--badge-${tone}-bg)`,
          boxShadow: `inset 0 0 0 1px var(--badge-${tone}-edge)`,
          ...style,
        }}
        {...props}
      >
        <Icon size={iconSize} stroke={iconStroke} style={{ color: fg }} aria-hidden />
      </div>
    );
  },
);

IconPill.displayName = 'IconPill';
