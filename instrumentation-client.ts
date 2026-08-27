import * as Sentry from '@sentry/nextjs';
import { sentryEnabled, sharedSentryOptions } from '@/lib/observability/sentry';

/**
 * The browser runtime.
 *
 * ⚠ THE SAME REDACTION AS THE SERVER, FOR A DIFFERENT REASON.
 *
 * A client event carries whatever was in component state when it threw, which
 * on this product means a team list, an invitation address, or the contents
 * of a settings form. `sharedSentryOptions` applies `scrubEvent` here exactly
 * as it does on the server — the rules are shared rather than reimplemented,
 * so a redaction added for one runtime cannot be missing from the other.
 *
 * Session replay is deliberately NOT enabled. It would record a customer's
 * workspace — their team, their messages, their settings — and ship it to a
 * third party. `01 D-09` makes Brian a processor for his tenants' data; that
 * is not a decision to take on his behalf to make debugging easier.
 */
if (sentryEnabled()) {
  Sentry.init(sharedSentryOptions());
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
