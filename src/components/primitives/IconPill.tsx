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
  ({ icon: Icon, iconSize = 12, iconStroke = 2, variant = 'chrome', tone = 'neutral', className, style, ...props }, ref) => {
    
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

    // Tinted variant for light surfaces
    const toneMap: Record<NonNullable<IconPillProps['tone']>, { bg: string; ring: string; icon: string }> = {
      success: { bg: 'rgba(16,185,129,0.12)', ring: 'rgba(16,185,129,0.2)', icon: 'rgb(5,150,105)' },
      brand: { bg: 'rgba(249,115,22,0.12)', ring: 'rgba(249,115,22,0.2)', icon: 'rgb(234,88,12)' },
      warning: { bg: 'rgba(245,158,11,0.12)', ring: 'rgba(245,158,11,0.2)', icon: 'rgb(217,119,6)' },
      info: { bg: 'rgba(59,130,246,0.12)', ring: 'rgba(59,130,246,0.2)', icon: 'rgb(37,99,235)' },
      danger: { bg: 'rgba(239,68,68,0.12)', ring: 'rgba(239,68,68,0.2)', icon: 'rgb(220,38,38)' },
      neutral: { bg: 'rgba(113,113,122,0.12)', ring: 'rgba(113,113,122,0.2)', icon: 'rgb(82,82,91)' },
    };
    
    const colors = toneMap[tone];

    return (
      <div
        ref={ref}
        className={`flex size-6 shrink-0 items-center justify-center rounded-full ${className || ''}`}
        style={{
          background: colors.bg,
          boxShadow: `inset 0 0 0 1px ${colors.ring}`,
          ...style,
        }}
        {...props}
      >
        <Icon
          size={iconSize}
          stroke={iconStroke}
          style={{ color: colors.icon }}
          aria-hidden
        />
      </div>
    );
  }
);

IconPill.displayName = 'IconPill';
