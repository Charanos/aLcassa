import type { ErrorEvent } from '@sentry/nextjs';
import { redact } from '@/lib/logger/redact';

/**
 * 04 §12. SENTRY, AND THE ONE RULE THAT MATTERS MORE THAN HAVING IT.
 *
 * ⚠ `@sentry/nextjs` WAS A DEPENDENCY FOR MONTHS AND WAS NEVER INITIALISED.
 *
 * It appeared in `package.json`, `04 §12` named it as the error tracking
 * service, and the tracker listed error tracking as wired. Nothing imported
 * it. There was no `instrumentation.ts`, no config, no DSN — every exception
 * in production would have gone nowhere. It was also, as the dependency audit
 * later showed, the source of six of the project's seven advisories: an
 * unused package carrying most of the vulnerability surface.
 *
 * ⚠ AN ERROR REPORT IS AN EXFILTRATION PATH, AND THIS IS THE PART TO GET RIGHT.
 *
 * `05 I-16` keeps customer record fields out of logs. A crash report is a log
 * with a wider audience: it carries local variables, request bodies, headers
 * and query strings to a third-party service, and it is read by whoever has a
 * Sentry seat rather than by whoever has database access.
 *
 * So the same `redact()` that guards the logger guards the event payload
 * here. Everything else in this file exists to make sure that function
 * actually runs before anything leaves.
 */

/**
 * Whether Sentry should initialise at all.
 *
 * ⚠ NO DSN, NO SENTRY — AND NO ERROR EITHER.
 *
 * A developer running this locally has no DSN and should not be made to care.
 * `Sentry.init` with an empty DSN is a documented no-op, but calling it
 * anyway still installs global handlers and patches fetch, which changes
 * behaviour in development for no benefit. Checking first keeps local runs
 * identical to what they were before Sentry existed.
 */
export function sentryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN);
}

export function sentryDsn(): string | undefined {
  return process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
}

/**
 * ⚠ THE LAST THING THAT TOUCHES AN EVENT BEFORE IT LEAVES THE PROCESS.
 *
 * Returning null drops the event entirely. Every branch below either drops or
 * redacts; none passes anything through untouched.
 *
 * The shape is Sentry's, so the field names are theirs rather than ours:
 *
 *   request.data     the body. The richest source of customer data in an
 *                    event, and the reason this function exists.
 *   request.headers  cookies and authorization live here. A session cookie in
 *                    a crash report is a live credential in a third-party UI.
 *   request.query_string  reset tokens and invitation tokens travel in URLs.
 *   extra / contexts anything a call site attached.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent | null {
  // 05 I-16 · 04 §7. Never send a request body unredacted.
  if (event.request) {
    if (event.request.data !== undefined) {
      event.request.data = redact(event.request.data);
    }

    /**
     * Headers are dropped rather than redacted, and the difference is
     * deliberate: `redact` works on known key names, and a header we have not
     * thought of is exactly the one carrying something. The only headers
     * worth having in a report are the correlation id and the route, and both
     * are already tags.
     */
    if (event.request.headers) {
      const requestId = event.request.headers['x-request-id'];
      event.request.headers = requestId ? { 'x-request-id': requestId } : {};
    }

    /**
     * Query strings carry recovery and invitation tokens, which are bearer
     * credentials for as long as they live. There is no version of a query
     * string worth the risk of sending one, so the path is kept and the
     * query is not.
     */
    if (event.request.query_string) {
      event.request.query_string = '[redacted]';
    }
  }

  if (event.extra) {
    event.extra = redact(event.extra) as typeof event.extra;
  }

  if (event.contexts) {
    event.contexts = redact(event.contexts) as typeof event.contexts;
  }

  /**
   * ⚠ THE USER OBJECT IS REDUCED TO AN ID.
   *
   * Sentry's default is to attach an address and an IP, which is exactly the
   * personal data `05 I-16` and the Kenyan Data Protection Act obligations in
   * `01 D-09` say not to scatter. An opaque id is enough to correlate a
   * report with an audit row, and the audit row is where the identity lives.
   */
  if (event.user) {
    event.user = { id: event.user.id };
  }

  return event;
}

/**
 * The options both runtimes share.
 *
 * Kept here rather than duplicated across the client, server and edge configs
 * so a redaction rule cannot be added to one and forgotten in the other two —
 * which is the shape of mistake that produces "we scrub everything" alongside
 * an unscrubbed edge runtime.
 */
export function sharedSentryOptions() {
  return {
    dsn: sentryDsn(),
    /**
     * 10% of transactions. Performance data is useful and it is not what this
     * is for: `04 §12` names Sentry for exceptions with a correlation id, and
     * a full-rate trace on a serverless runtime is a bill rather than a
     * signal. Errors are always sampled at 100% — that is a separate setting
     * and it is Sentry's default.
     */
    tracesSampleRate: 0.1,
    // The environment the tracker and the boundary frame already agree on.
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT ?? 'development',
    /**
     * ⚠ OFF. `sendDefaultPii` attaches addresses, IPs and cookies
     * automatically. Every one of them is something `scrubEvent` would then
     * have to remove, and relying on a scrubber to undo a setting is weaker
     * than not setting it.
     */
    sendDefaultPii: false,
    beforeSend: scrubEvent,
    // Nothing to report in development, and a local crash should not travel.
    enabled: sentryEnabled(),
  };
}
