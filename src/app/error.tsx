'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';
import { Button } from '@/components/primitives/Button';

/** Catch page failures and offer an in-place retry without exposing internal errors. */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Structured client-side error logging lands with observability in week
    // 2 per 04 §8. Until then this is the one place a production failure is
    // visible at all, so it goes to the console rather than nowhere.
    // eslint-disable-next-line no-console -- sanctioned exception, see above
    console.error(error);
  }, [error]);

  return (
    <main
      id="main"
      className="mx-auto flex min-h-dvh flex-col items-center justify-center px-6 text-center"
      style={{ background: 'var(--surface-base)', maxWidth: '520px' }}
    >
      <Mark size={28} />

      <h1 className="t-title mt-8 text-[var(--text-primary)]">Something broke on our side.</h1>

      <p className="t-body mt-3 text-[var(--text-secondary)]">
        We have logged it. Your work here was not affected.
      </p>

      {error.digest ? (
        <p className="t-caption mt-4 text-[var(--text-tertiary)]">
          Reference{' '}
          <code
            className="t-data rounded-chip px-1.5 py-0.5"
            style={{ background: 'var(--surface-sunken)' }}
          >
            {error.digest}
          </code>{' '}
          if you get in touch.
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" size="lg" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </main>
  );
}
