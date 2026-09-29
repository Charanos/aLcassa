'use client';

import * as React from 'react';
import { Button, type ButtonProps } from './Button';
import { IconLoader2 } from '@tabler/icons-react';

/**
 * A progressively enhanced submit button.
 *
 * It operates as a plain HTML `<button type="submit">` by default.
 * When JavaScript hydrates, it listens to its parent form's `submit` event.
 * If the form is valid and submits, it sets a loading state (spinner + disabled).
 *
 * Crucially, this does NOT intercept or prevent the native form submission.
 * It strictly adds visual feedback for forms posting to API routes.
 */
export const SubmitButton = React.forwardRef<HTMLButtonElement, ButtonProps>(function SubmitButton(
  { children, loading: externalLoading, disabled, ...props },
  ref,
) {
  const [internalLoading, setInternalLoading] = React.useState(false);
  const innerRef = React.useRef<HTMLButtonElement>(null);

  React.useImperativeHandle(ref, () => innerRef.current as HTMLButtonElement);

  React.useEffect(() => {
    const button = innerRef.current;
    if (!button) return;

    const form = button.closest('form');
    if (!form) return;

    const handleSubmit = () => {
      // Defer state update so we don't accidentally cancel the native submission
      // by disabling the button in the exact same tick.
      setTimeout(() => {
        setInternalLoading(true);
      }, 0);
    };

    form.addEventListener('submit', handleSubmit);
    return () => form.removeEventListener('submit', handleSubmit);
  }, []);

  const isLoading = externalLoading || internalLoading;

  return (
    <Button
      ref={innerRef}
      type="submit"
      loading={isLoading}
      disabled={disabled || isLoading}
      {...props}
    >
      {children}
    </Button>
  );
});

SubmitButton.displayName = 'SubmitButton';

/**
 * A custom progressive submit wrapper for bespoke buttons (like the Google OAuth button)
 * that don't use the standard `Button` primitive but still need a loading state.
 */
export function CustomSubmitButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [loading, setLoading] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const form = button.closest('form');
    if (!form) return;

    const handleSubmit = () => {
      setTimeout(() => setLoading(true), 0);
    };

    form.addEventListener('submit', handleSubmit);
    return () => form.removeEventListener('submit', handleSubmit);
  }, []);

  return (
    <button
      ref={buttonRef}
      type="submit"
      disabled={props.disabled || loading}
      className={`${className} ${loading ? 'cursor-not-allowed opacity-70' : ''}`}
      {...props}
    >
      {loading ? (
        <IconLoader2 size={18} className="absolute animate-spin" aria-hidden="true" />
      ) : null}
      <span
        className={`flex w-full items-center justify-center gap-3 ${loading ? 'invisible' : ''}`}
      >
        {children}
      </span>
    </button>
  );
}
