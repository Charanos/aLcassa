import React from 'react';
import { GoogleLogo } from './GoogleLogo';
import { CustomSubmitButton } from '@/components/primitives/SubmitButton';
import { googleAvailability } from '@/lib/auth/providerAvailability';

/** Show only a provider that the configured identity service actually supports. */
export async function GoogleAccess({
  next,
  purpose,
}: {
  next?: string;
  purpose: 'sign-in' | 'sign-up';
}) {
  const available = await googleAvailability(true);
  const enabled = available === 'enabled';
  const fallbackId = `google-${purpose}-fallback`;
  const buttonClass =
    'relative flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--border-strong)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--text-primary)] shadow-sm transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] disabled:cursor-not-allowed disabled:shadow-none motion-reduce:transition-none';
  return (
    <>
      <div className="mb-6">
        {enabled ? (
          <form method="post" action="/api/v1/auth/google">
            {next ? <input type="hidden" name="next" value={next} /> : null}
            <CustomSubmitButton className={buttonClass}>
              <GoogleLogo size={20} aria-hidden="true" className="shrink-0" />
              Continue with Google
            </CustomSubmitButton>
          </form>
        ) : (
          <>
            <button type="button" disabled aria-describedby={fallbackId} className={buttonClass}>
              <GoogleLogo size={20} aria-hidden="true" className="mr-3 shrink-0" />
              Continue with Google
            </button>
            <p
              id={fallbackId}
              className="t-caption mt-2.5 text-center text-[var(--text-secondary)]"
            >
              Google sign-in is currently unavailable. Continue with email below.
            </p>
          </>
        )}
      </div>
      <div className="relative mb-6 flex items-center gap-4">
        <div className="flex-grow border-t border-[var(--border-subtle)]" />
        <span className="t-caption shrink-0 text-[var(--text-tertiary)]">
          {purpose === 'sign-in' ? 'or sign in with email' : 'or create with email'}
        </span>
        <div className="flex-grow border-t border-[var(--border-subtle)]" />
      </div>
    </>
  );
}
