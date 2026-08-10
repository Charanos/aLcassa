import { forwardRef } from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { IconLoader2 } from '@tabler/icons-react';

/**
 * aLcassa Button Primitives
 *
 *   primary      brand blue action
 *   accent       ember orange accent action
 *   secondary    neutral surface button in headers, cards, toolbars
 *   quiet        ghost / dismiss / cancel in-row actions
 *   destructive  delete, revoke, suspend
 */

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'quiet' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders the child element instead of a <button>. For a link that looks
   *  like a button, which is a real need and not a smell. */
  asChild?: boolean;
  /** The label STAYS during loading and the spinner replaces the icon. */
  loading?: boolean;
  icon?: React.ReactNode;
};

const base = [
  'inline-flex items-center justify-center gap-2',
  'rounded-chip border font-medium',
  'cursor-pointer select-none',
  'transition-all duration-[var(--duration-fast)]',
  'active:scale-[0.985] motion-reduce:active:scale-100',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]',
  'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
].join(' ');

const variants: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--blue-500)] border-[var(--blue-600)] text-white shadow-sm',
    'hover:not-disabled:bg-[var(--blue-600)]',
  ].join(' '),
  accent: [
    'bg-[var(--orange-500)] border-[var(--orange-600)] text-white shadow-sm',
    'hover:not-disabled:bg-[var(--orange-600)] active:not-disabled:bg-[var(--orange-700)]',
  ].join(' '),
  secondary: [
    'bg-[var(--surface-raised)] border-[var(--border-subtle)] text-[var(--text-primary)] shadow-xs',
    'hover:not-disabled:bg-[var(--surface-sunken)] hover:not-disabled:border-[var(--border-strong)]',
  ].join(' '),
  quiet: [
    'bg-transparent border-transparent text-[var(--text-secondary)]',
    'hover:not-disabled:bg-[var(--surface-sunken)] hover:not-disabled:text-[var(--text-primary)]',
  ].join(' '),
  destructive: [
    'bg-[var(--danger-bg)] border-[var(--danger-fg)]/30 text-[var(--danger-fg)]',
    'hover:not-disabled:bg-[var(--danger-bg)]/80',
  ].join(' '),
};

/** Every size sits inside a 44px hit region even when the control is 32px. */
const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs t-compact [&_svg]:size-[14px]',
  md: 'h-9 px-4 text-sm t-compact [&_svg]:size-[15px]',
  lg: 'h-11 px-5 text-sm t-body [&_svg]:size-[16px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    asChild = false,
    loading = false,
    icon,
    disabled,
    children,
    className,
    ...props
  },
  ref,
) {
  const Component = asChild ? Slot : 'button';

  return (
    <Component
      ref={ref}
      data-slot="button"
      data-variant={variant}
      disabled={disabled || loading}
      className={[base, variants[variant], sizes[size], className].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? (
        <IconLoader2 className="animate-spin" aria-hidden="true" />
      ) : icon ? (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <Slottable>{children}</Slottable>
    </Component>
  );
});

Button.displayName = 'Button';
