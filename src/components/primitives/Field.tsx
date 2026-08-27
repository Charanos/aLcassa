'use client';

import { forwardRef, useId, useState } from 'react';
import { IconAlertTriangle, IconEye, IconEyeOff } from '@tabler/icons-react';

/**
 * 03 §13. Field anatomy, and the one rule that matters most:
 *
 *   THE HELPER LINE IS RESERVED WHETHER OR NOT IT HAS TEXT.
 *
 * A field that grows by one line when it errors pushes everything below it
 * down, so the act of failing validation moves the button the user was about to
 * press. Reserving the line costs 18px per field and removes an entire class of
 * mis-click. It is why `min-h` is on the helper rather than the helper being
 * conditionally rendered.
 *
 * Four parts, in order: label above, control at 44px, affordance inside on the
 * right, helper line below.
 */

export type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  /** Sits under the control whether or not it has content. */
  helper?: string;
  error?: string;
  /** A glyph inside the control, right aligned, saying what the field does. */
  affordance?: React.ReactNode;
};

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, helper, error, affordance, id: providedId, className, ...props },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const helperId = `${id}-helper`;
  const invalid = Boolean(error);

  return (
    <div data-slot="field" className="grid">
      <label htmlFor={id} className="t-label mb-1.5 text-[var(--ink-secondary)]">
        {label}
      </label>

      <div className="relative">
        <input
          ref={ref}
          id={id}
          aria-invalid={invalid || undefined}
          /* Errors are associated rather than merely adjacent, so a screen
           * reader announces the reason with the field. 03 §17. */
          aria-describedby={(helper ?? error) ? helperId : undefined}
          className={[
            'field-sunken',
            't-body w-full rounded-chip border px-3 text-[var(--ink-primary)] transition-[border-color,background-color] duration-[var(--motion-fade)]',
            'placeholder:text-[var(--ink-tertiary)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
            'disabled:cursor-not-allowed disabled:bg-[var(--disabled-surface)] disabled:text-[var(--disabled-ink)]',
            affordance ? 'pr-11' : '',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            minHeight: 'var(--control-lg)',
            background: invalid ? 'var(--oxide-tint)' : 'var(--surface-sunken)',
            borderColor: invalid ? 'var(--oxide-ink)' : 'var(--rule-base)',
          }}
          {...props}
        />

        {affordance ? (
          <span className="absolute top-1/2 right-3 -translate-y-1/2">{affordance}</span>
        ) : null}
      </div>

      {/* Reserved. Always. */}
      <p
        id={helperId}
        className="t-caption mt-1.5 flex min-h-[18px] items-start gap-1.5"
        style={{ color: invalid ? 'var(--oxide-ink)' : 'var(--ink-tertiary)' }}
      >
        {invalid ? (
          <IconAlertTriangle size={13} stroke={1.5} aria-hidden className="mt-px shrink-0" />
        ) : null}
        {error ?? helper ?? ''}
      </p>
    </div>
  );
});

/**
 * A password field with a reveal.
 *
 * The reveal is a genuine accessibility feature on a password field, which is
 * a different question entirely from revealing a STORED credential. 01 D-11
 * forbids the second and says nothing about the first: what a person typed two
 * seconds ago on their own screen is not a secret the platform is holding.
 */
export const PasswordField = forwardRef<HTMLInputElement, Omit<FieldProps, 'type'>>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <Field
        ref={ref}
        type={visible ? 'text' : 'password'}
        affordance={
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="grid size-8 place-items-center rounded-chip text-[var(--ink-tertiary)] transition-colors duration-[var(--motion-fade)] hover:text-[var(--ink-primary)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]"
          >
            {visible ? (
              <IconEyeOff size={16} stroke={1.5} aria-hidden />
            ) : (
              <IconEye size={16} stroke={1.5} aria-hidden />
            )}
          </button>
        }
        {...props}
      />
    );
  },
);
