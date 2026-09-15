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
    <div className="mx-auto flex min-h-[60vh] flex-col items-center justify-center px-6">
      <div
        className="w-full max-w-[440px] rounded-[24px] p-2"
        style={{
          background: 'var(--surface-sunken)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          className="relative flex flex-col items-center overflow-hidden rounded-[16px] px-8 py-10 text-center"
          style={{
            background: 'var(--surface-raised)',
            boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
          }}
        >
          {/* Subtle glow at the top */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--red-50)] to-transparent opacity-50" />

          <div className="relative mb-6">
            <span
              className="grid size-12 place-items-center rounded-2xl"
              style={{
                background: 'var(--surface-raised)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 4px 12px -2px rgba(239, 68, 68, 0.15)',
              }}
            >
              <IconAlertTriangle
                size={22}
                stroke={1.5}
                style={{ color: 'var(--danger-fg)' }}
                aria-hidden
              />
            </span>
          </div>

          <h1 className="relative text-[18px] font-medium tracking-tight text-[var(--text-primary)]">
            This screen did not load.
          </h1>

          <p
            className="relative mt-2.5 text-[14px] leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            We have logged it. Nobody caused this, and the rest of the console is unaffected.
          </p>

          {error.digest ? (
            <p
              className="relative mt-5 flex items-center gap-2 text-[12px] font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Reference
              <code
                className="rounded-md px-2 py-1 tracking-wider"
                style={{
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {error.digest}
              </code>
            </p>
          ) : null}

          <div className="relative mt-8 flex w-full flex-wrap items-center justify-center gap-3">
            <Button variant="primary" size="md" onClick={reset}>
              Try again
            </Button>
            <Button asChild variant="secondary" size="md">
              <Link href="/platform">Back to Overview</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
