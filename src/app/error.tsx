'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Mark } from '@/components/brand/Mark';
import { Button } from '@/components/primitives/Button';

/**
 * 03 §16 · 10 §12. THE ROOT ERROR BOUNDARY, AND WHY ITS ABSENCE WAS THE BUG.
 *
 * ⚠ There was no `error.tsx` anywhere in this app until now. Next.js requires
 * one explicitly; without it, an uncaught error in ANY client component
 * (a chart failing to render, a dynamically-loaded script chunk blocked by the
 * production CSP in a way `unsafe-eval` happened to paper over in dev)
 * propagates to the nearest boundary, which with none defined is effectively
 * nowhere: React discards the tree and the page goes blank below whatever
 * finished rendering before the failure. That is almost certainly the exact
 * shape of "flashes on load then blanks out" reported against the deployed
 * build. This file, and `global-error.tsx` beside it, close that hole: a
 * failure now degrades to a designed surface with a reset action and a
 * reference code, per 03 §16, rather than to nothing.
 *
 * Error copy rule from 10 §1: never apologise for the system, state what
 * happened and what to do. Never blame the reader.
 */
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
      style={{ background: 'var(--surface-page)', maxWidth: '520px' }}
    >
      <Mark size={28} />

      <h1 className="t-title mt-8 text-[var(--ink-primary)]">Something broke on our side.</h1>

      <p className="t-body mt-3 text-[var(--ink-secondary)]">
        We have logged it. Your work here was not affected.
      </p>

      {error.digest ? (
        <p className="t-caption mt-4 text-[var(--ink-tertiary)]">
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
