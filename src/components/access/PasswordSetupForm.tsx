'use client';

import { useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/primitives/Button';

/** Enhance a native password post without exposing credentials to client-side requests. */
export function PasswordSetupForm({
  children,
  invited,
}: {
  children: ReactNode;
  invited: boolean;
}) {
  const pending = useRef(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="grid gap-4"
      method="post"
      action="/api/v1/auth/password/reset"
      aria-busy={submitting}
      onSubmit={(event) => {
        if (pending.current) {
          event.preventDefault();
          return;
        }
        pending.current = true;
        setSubmitting(true);
      }}
    >
      {children}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={submitting}
        className="mt-1 w-full font-medium shadow-sm hover:shadow-md"
      >
        {submitting
          ? 'Saving your password…'
          : invited
            ? 'Save password and open workspace'
            : 'Save password'}
      </Button>
      {submitting ? (
        <p role="status" className="text-sm text-[var(--text-secondary)]">
          Keep this page open while we save your password and finish account setup.
        </p>
      ) : null}
    </form>
  );
}
