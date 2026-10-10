import React from 'react';
import { GoogleLogo } from './GoogleLogo';
import { IconTile } from '@/components/primitives/IconTile';
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
  const available = await googleAvailability();
  if (available !== 'enabled') {
    return (
      <p className="t-caption mb-6 text-[var(--text-secondary)]">
        Google sign-in is currently unavailable. Continue with email below.
      </p>
    );
  }
  return (
    <>
      <form method="post" action="/api/v1/auth/google" className="mb-6">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <CustomSubmitButton className="group relative flex w-full items-center justify-center gap-3 rounded-overlay px-4 py-3.5 text-base font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)] active:scale-[0.985]">
          <IconTile icon={GoogleLogo} size="sm" />
          Continue with Google
        </CustomSubmitButton>
      </form>
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
