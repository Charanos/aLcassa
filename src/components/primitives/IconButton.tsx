import { forwardRef } from 'react';

/**
 * 03 §9. `ghost` and `bordered` variants, 44px hit area minimum even where the
 * visible glyph sits inside a smaller box. Icon-only, so `aria-label` is
 * required by the type, not left to a reviewer to notice is missing. Every
 * icon-only control also carries a tooltip per 03 §11; that composition
 * happens at the call site once `Tooltip` exists, not inside this primitive.
 */
export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'ghost' | 'bordered';
  size?: 'sm' | 'md';
  'aria-label': string;
};

const SIZES = {
  sm: 'size-8 [&_svg]:size-4',
  md: 'size-11 [&_svg]:size-[18px]',
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = 'ghost', size = 'md', className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={[
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-chip border transition-colors duration-[var(--motion-fade)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
        'disabled:cursor-not-allowed disabled:text-[var(--disabled-ink)]',
        SIZES[size],
        variant === 'bordered'
          ? 'border-[var(--rule-base)] bg-[var(--surface-raised)] text-[var(--ink-secondary)] hover:not-disabled:border-[var(--rule-strong)] hover:not-disabled:text-[var(--ink-primary)]'
          : 'border-transparent text-[var(--ink-tertiary)] hover:not-disabled:bg-[var(--surface-hover)] hover:not-disabled:text-[var(--ink-primary)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </button>
  );
});
