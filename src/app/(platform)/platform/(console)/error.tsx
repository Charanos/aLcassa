'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';

/**
 * 03 §16 · sheet 12 "Whole page failures." The console's own route-group
 * boundary — `src/app/error.tsx` catches everything outside `/platform`, but
 * a failure in here should not read as the marketing site going down. The
 * chrome (`ConsoleShell`, the sidebar, the header) is the layout ABOVE this
 * boundary and keeps rendering; only the page content beneath it is replaced.
 *
 * Sheet 12's rule for a whole-page failure: name the request id, state what
 * happened, and do not blame the reader. Primary action retries the render;
 * secondary returns to Overview rather than signing out or leaving the
 * console entirely, since an operator mid-task should not lose their place
 * over one broken screen.
 */
export default function ConsoleError({
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
        style={{ background: 'var(--oxide-tint)' }}
      >
        <IconAlertTriangle
          size={20}
          stroke={1.5}
          style={{ color: 'var(--oxide-ink)' }}
          aria-hidden
        />
      </span>

      <h1 className="t-panel mt-5" style={{ color: 'var(--text-primary)' }}>
        This screen did not load.
      </h1>

      <p className="t-body mt-2.5" style={{ color: 'var(--text-secondary)' }}>
        We have logged it. Nobody caused this, and the rest of the console is unaffected.
      </p>

      {error.digest ? (
        <p className="t-caption mt-4" style={{ color: 'var(--text-tertiary)' }}>
          Reference{' '}
          <code
            className="t-data rounded-chip px-1.5 py-0.5"
            style={{ background: 'var(--surface-sunken)', font: '400 12px/1 var(--font-mono)' }}
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
          <Link href="/platform">Back to Overview</Link>
        </Button>
      </div>
    </div>
  );
}
