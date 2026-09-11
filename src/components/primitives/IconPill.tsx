import * as React from 'react';
import type { Icon as TablerIcon } from '@tabler/icons-react';

export interface IconPillProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: TablerIcon;
  iconSize?: number;
  iconStroke?: number;
}

/**
 * A glassmorphic circular disc for housing an icon on the CHROME TIER.
 *
 * Inner rim highlight, subtle outer ring, no fill of its own — it borrows the
 * slab beneath it. Like the chrome `Badge` beside it, every value here is a
 * Tier 4 token rather than a raw rgba, so the glass treatment is tuned in one
 * place for the header, the rail and the hero at once.
 */
export const IconPill = React.forwardRef<HTMLDivElement, IconPillProps>(
  ({ icon: Icon, iconSize = 12, iconStroke = 2, className, style, ...props }, ref) => {
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
);

IconPill.displayName = 'IconPill';
