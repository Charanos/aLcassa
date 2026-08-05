import { forwardRef } from 'react';
import { Slot, Slottable } from '@radix-ui/react-slot';
import { IconLoader2 } from '@tabler/icons-react';

/**
 * Design sheet 03 · Controls. Four variants, five states each.
 *
 *   primary      the single most likely next action on the view
 *   secondary    everything else in a header or a toolbar
 *   quiet        dismiss, cancel, and in-row actions
 *   destructive  suspend, revoke, rotate, delete
 *
 * COPPER IS SPENT CAREFULLY. It appears at most twice on a screen: the primary
 * action, and the focus ring. A third copper element means one of them is
 * wrong. Sheet 01, laws.
 *
 * NOTHING IS DISABLED BY OPACITY. A disabled button has its own fill and its
 * own ink, so its contrast is a decision rather than a by-product of a filter.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders the child element instead of a <button>. For a link that looks
   *  like a button, which is a real need and not a smell. */
  asChild?: boolean;
  /** The label STAYS during loading and the spinner replaces the icon. A button
   *  whose text disappears mid-request leaves the user unsure what they
   *  pressed. 03 §15. */
  loading?: boolean;
  icon?: React.ReactNode;
};

const base = [
  'inline-flex items-center justify-center gap-2',
  'rounded-chip border',
  'cursor-pointer select-none',
  'transition-[background-color,border-color] duration-[var(--motion-fade)]',
  // Sheet 01: press is the one movement a button makes, and it is 1.5%.
  'active:scale-[0.985] motion-reduce:active:scale-100',
  // 03 §17. Never removed, 2px at 2px offset, in both themes, never tinted by
  // the variant it sits on. On a destructive button that is deliberate: the
  // ring answers WHERE, not WHAT.
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
  'disabled:cursor-not-allowed',
  'disabled:bg-[var(--disabled-surface)] disabled:border-[var(--disabled-rule)] disabled:text-[var(--disabled-ink)]',
  'disabled:active:scale-100',
].join(' ');

const variants: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--action-primary-bg)] border-[var(--action-primary-border)] text-[var(--action-primary-fg)]',
    'hover:not-disabled:bg-[var(--copper-ink)]',
  ].join(' '),
  secondary: [
    'bg-[var(--surface-page)] border-[var(--rule-base)] text-[var(--ink-primary)]',
    'hover:not-disabled:bg-[var(--surface-raised)] hover:not-disabled:border-[var(--rule-strong)]',
  ].join(' '),
  quiet: [
    'bg-transparent border-transparent text-[var(--action-quiet-fg)]',
    'hover:not-disabled:bg-[var(--action-quiet-hover-bg)] hover:not-disabled:border-[var(--copper-rule)]',
  ].join(' '),
  destructive: [
    'bg-[var(--action-destructive-bg)] border-[var(--action-destructive-border)] text-[var(--action-destructive-fg)]',
    'hover:not-disabled:bg-[var(--oxide-ink)]',
  ].join(' '),
};

/** Every size sits inside a 44px hit region even when the control is 32px, so
 *  the touch target floor holds without inflating a dense toolbar. 03 §17. */
const sizes: Record<ButtonSize, string> = {
  sm: 'h-[var(--control-sm)] px-3 t-compact [&_svg]:size-[15px]',
  md: 'h-[var(--control-md)] px-3.5 t-compact [&_svg]:size-[15px]',
  lg: 'h-[var(--control-lg)] px-4 t-body [&_svg]:size-4',
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
      data-loading={loading || undefined}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[base, variants[variant], sizes[size], className].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? (
        <IconLoader2
          data-slot="button-spinner"
          className="animate-spin motion-reduce:animate-none"
          aria-hidden
        />
      ) : (
        icon
      )}
      {/* `Slottable` marks which child the slotted element should merge into.
          Without it, `asChild` hands Slot three children (spinner, icon, label)
          and Radix refuses, because it cannot know which one to become. That is
          a runtime 500 rather than a type error, so it is worth the import. */}
      <Slottable>{children}</Slottable>
    </Component>
  );
});
