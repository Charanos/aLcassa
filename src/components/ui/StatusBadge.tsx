'use client';

import React, { forwardRef } from 'react';
import type { Icon as TablerIcon } from '@tabler/icons-react';

export type StatusBadgeTone =
  | 'success'
  | 'brand'
  | 'warning'
  | 'info'
  | 'danger'
  | 'neutral';

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
  dark?: boolean;
  children: React.ReactNode;
}

const TONE_CLASSES: Record<
  StatusBadgeTone,
  {
    light: string;
    dark: string;
    dot: string;
    icon: string;
  }
> = {
  success: {
    light:
      'bg-emerald-500/[0.08] text-emerald-800 border-emerald-500/25 shadow-[0_1px_2px_rgba(16,185,129,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]',
    dark:
      'bg-emerald-500/15 text-emerald-300 border-emerald-400/30 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]',
    dot: 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  brand: {
    light:
      'bg-orange-500/[0.08] text-orange-800 border-orange-500/25 shadow-[0_1px_2px_rgba(249,115,22,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]',
    dark:
      'bg-orange-500/15 text-orange-300 border-orange-400/30 shadow-[0_0_12px_-2px_rgba(249,115,22,0.3)]',
    dot: 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.8)]',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  warning: {
    light:
      'bg-amber-500/[0.09] text-amber-800 border-amber-500/30 shadow-[0_1px_2px_rgba(245,158,11,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]',
    dark:
      'bg-amber-500/15 text-amber-300 border-amber-400/30 shadow-[0_0_12px_-2px_rgba(245,158,11,0.3)]',
    dot: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    light:
      'bg-blue-500/[0.08] text-blue-800 border-blue-500/25 shadow-[0_1px_2px_rgba(59,130,246,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]',
    dark:
      'bg-blue-500/15 text-blue-300 border-blue-400/30 shadow-[0_0_12px_-2px_rgba(59,130,246,0.3)]',
    dot: 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  danger: {
    light:
      'bg-rose-500/[0.08] text-rose-800 border-rose-500/25 shadow-[0_1px_2px_rgba(244,63,94,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]',
    dark:
      'bg-rose-500/15 text-rose-300 border-rose-400/30 shadow-[0_0_12px_-2px_rgba(244,63,94,0.3)]',
    dot: 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]',
    icon: 'text-rose-600 dark:text-rose-400',
  },
  neutral: {
    light:
      'bg-zinc-100/90 text-zinc-700 border-zinc-200/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]',
    dark:
      'bg-white/[0.06] text-zinc-300 border-white/[0.12] shadow-xs',
    dot: 'bg-zinc-400',
    icon: 'text-zinc-500 dark:text-zinc-400',
  },
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  function StatusBadge(
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
      children,
      ...props
    },
    ref,
  ) {
    const toneConfig = TONE_CLASSES[tone];
    const colorClass = dark ? toneConfig.dark : toneConfig.light;

    const shapeClass =
      variant === 'pill'
        ? 'rounded-full'
        : variant === 'squircle'
        ? 'rounded-[7px]'
        : 'rounded-full backdrop-blur-xs';

    const sizeClass =
      size === 'sm'
        ? 'text-[10.5px] px-2 py-0.5 min-h-[20px] gap-1.5'
        : 'text-[11.5px] px-2.5 py-1 min-h-[24px] gap-1.5';

    const fontClass = font === 'mono' ? 'font-mono tracking-tight' : 'font-sans font-medium tracking-tight';

    return (
      <span
        ref={ref}
        className={`inline-flex items-center justify-center border font-medium select-none shrink-0 transition-colors ${shapeClass} ${sizeClass} ${fontClass} ${colorClass} ${className}`}
        {...props}
      >
        {dot && (
          <span className="relative flex size-1.5 shrink-0 items-center justify-center" aria-hidden="true">
            {pulse && (
              <span
                className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${toneConfig.dot}`}
              />
            )}
            <span className={`relative inline-flex size-1.5 rounded-full ${toneConfig.dot}`} />
          </span>
        )}

        {Icon && (
          <Icon
            size={size === 'sm' ? 12 : 13}
            stroke={2.2}
            className={`shrink-0 ${toneConfig.icon}`}
            aria-hidden="true"
          />
        )}

        <span className="truncate leading-none">{children}</span>
      </span>
    );
  },
);

StatusBadge.displayName = 'StatusBadge';
