'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Button } from './Button';

/**
 * 03 §16. A GRANULAR ERROR BOUNDARY, THE THING THIS APP DID NOT HAVE.
 *
 * `error.tsx` catches a failure for an entire route segment. That is the
 * right size for "the page is broken" and the wrong size for "one widget on
 * an otherwise fine page is broken": without something smaller, a crash
 * inside a single client component, a chart library failing to load a chunk
 * under a strict CSP in production being the concrete case this was written
 * for, has no boundary to stop at and propagates up to the nearest one that
 * exists, which without this component was nowhere, and the whole page went
 * blank for a failure that should have cost one card.
 *
 * React requires a class component for this; there is no hook equivalent
 * that catches render errors. `getDerivedStateFromError` is what makes the
 * NEXT render show the fallback; `componentDidCatch` is where the failure is
 * logged, matching the console reporting in `error.tsx` until a real
 * structured logger exists in the browser bundle per 04 §8.
 */
type ErrorBoundaryProps = {
  children: ReactNode;
  /** What renders in place of the failed subtree. Defaults to a compact,
   *  on-brand notice rather than nothing. */
  fallback?: ReactNode;
  /** A short name for the failed region, used only in the default fallback
   *  and in the console log, never shown as a generic "something broke". */
  label?: string;
};

type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Sanctioned exception, see src/app/error.tsx: no browser-side structured
    // logger exists yet.
    // eslint-disable-next-line no-console
    console.error(
      `[${this.props.label ?? 'component'}] failed to render`,
      error,
      info.componentStack,
    );
  }

  private reset = () => this.setState({ hasError: false });

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      this.props.fallback ?? (
        <div
          className="rounded-panel border p-5 text-center"
          style={{
            borderColor: 'color-mix(in oklab, var(--red-500) 38%, var(--surface-base))',
            background: 'var(--red-100)',
          }}
        >
          <IconAlertTriangle
            size={20}
            stroke={1.5}
            aria-hidden
            className="mx-auto"
            style={{ color: 'var(--red-500)' }}
          />
          <p className="t-compact mt-2" style={{ color: 'var(--red-500)' }}>
            {this.props.label ? `${this.props.label} did not load.` : 'This did not load.'}
          </p>
          <p className="t-caption mt-1 text-[var(--text-tertiary)]">
            The rest of the page is unaffected.
          </p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={this.reset}>
            Try again
          </Button>
        </div>
      )
    );
  }
}
