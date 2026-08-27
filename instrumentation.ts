import * as Sentry from '@sentry/nextjs';
import { sentryEnabled, sharedSentryOptions } from '@/lib/observability/sentry';

/**
 * Next's instrumentation hook. Runs once per runtime, before anything else.
 *
 * ⚠ THIS FILE IS WHY SENTRY NOW ACTUALLY RUNS. It did not exist, so the
 * dependency sat installed and inert and every production exception went
 * nowhere. See `src/lib/observability/sentry.ts` for the redaction rules that
 * make sending an event safe.
 *
 * The two runtimes are initialised separately because they are separate
 * processes with separate globals — `nodejs` for route handlers and server
 * components, `edge` for middleware. Initialising only one leaves the other
 * silent, which is worse than neither: it looks instrumented.
 */
export function register(): void {
  if (!sentryEnabled()) return;

  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init(sharedSentryOptions());
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(sharedSentryOptions());
  }
}

/**
 * 07 §1. Every request already carries a correlation id, and this is what
 * connects a Sentry event to the audit row and the log line for the same
 * request. Without it a report is an isolated stack trace.
 */
export const onRequestError = Sentry.captureRequestError;
