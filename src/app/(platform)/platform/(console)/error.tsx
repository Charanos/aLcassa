'use client';

import { useEffect } from 'react';
import Link from '@/components/structure/NavigationLink';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';

/** Keep the console shell mounted during page failures; provide retry, overview navigation and a request reference. */
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
        className="w-full max-w-[440px] rounded-hero p-2"
        style={{
          background: 'var(--surface-sunken)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          className="relative flex flex-col items-center overflow-hidden rounded-card px-8 py-10 text-center"
          style={{
            background: 'var(--surface-raised)',
            boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
          }}
        >
          {/* Subtle glow at the top */}
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[var(--red-50)] to-transparent opacity-50" />

          <div className="relative mb-6">
            <span
              className="grid size-12 place-items-center rounded-card"
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

          <h1 className="relative text-lg font-medium tracking-tight text-[var(--text-primary)]">
            This screen did not load.
          </h1>

          <p
            className="relative mt-2.5 text-base leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            Try again. If the problem continues, share the reference below with support.
          </p>

          {error.digest ? (
            <p
              className="relative mt-5 flex items-center gap-2 text-sm font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Reference
              <code
                className="rounded-panel px-2 py-1 tracking-wider"
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
