'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';

/**
 * 02 §11 · 03 §16. The tenant application's own route-group boundary. The
 * shell (`AppShell` — header, sidebar, the boundary frame) is the layout
 * ABOVE this boundary and keeps rendering; only the page content beneath it
 * is replaced, so a broken settings page never reads as the whole workspace
 * going down.
 *
 * Error copy rule, verbatim from 03 §16: name what happened, name the fix,
 * never apologise for the system, never blame the reader, always preserve
 * their work — the reset button re-renders in place rather than navigating
 * anywhere, so nothing already typed on the failed screen is lost.
 */
export default function TenantError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console -- sanctioned, see src/app/error.tsx
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[480px] flex-col items-center justify-center px-6 text-center">
      <span
        className="grid size-11 place-items-center rounded-full"
        style={{ background: 'var(--red-100)' }}
      >
        <IconAlertTriangle size={20} stroke={1.5} style={{ color: 'var(--red-500)' }} aria-hidden />
      </span>

      <h1 className="t-panel mt-5" style={{ color: 'var(--text-primary)' }}>
        This screen did not load.
      </h1>

      <p className="t-body mt-2.5" style={{ color: 'var(--text-secondary)' }}>
        We have logged it. Nothing you have already saved was affected.
      </p>

      {error.digest ? (
        <p className="t-caption mt-4" style={{ color: 'var(--text-tertiary)' }}>
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

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Button variant="primary" size="md" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="secondary" size="md">
          <Link href="/app">Back to Overview</Link>
        </Button>
      </div>
    </div>
  );
}
