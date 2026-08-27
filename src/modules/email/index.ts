import 'server-only';
import { logger } from '@/lib/logger';
import { createLoggingAdapter } from './adapters/logging';
import { createResendAdapter } from './adapters/resend';
import type { EmailAdapter, RenderedTemplate, SendResult } from './types';

/**
 * 04 §3 · 11 §6. The only file another module may import.
 *
 * `email` owns delivery and the wording of what is delivered. It owns no
 * business meaning: it does not know what an invitation is, only that
 * something rendered a subject and two bodies and wants them sent.
 */

export { invitationEmail, credentialCreatedEmail, supportSessionEmail } from './templates';
export type { EmailAdapter, OutboundEmail, RenderedTemplate, SendResult } from './types';

/**
 * ⚠ CHOSEN ONCE PER PROCESS, FROM THE ENVIRONMENT, AND NEVER FROM A CALLER.
 *
 * A `provider` argument on `sendEmail` would be a way for one call site to
 * send through something the rest of the application does not use — which is
 * how a test ends up mailing real people, and how a forgotten branch keeps
 * using a provider nobody is monitoring.
 *
 * Both variables are required together. A key with no `from` address cannot
 * send, and a `from` with no key is a configuration someone abandoned
 * half-finished; treating either alone as "configured" produces a provider
 * that fails on every message instead of an environment that says it has none.
 */
let cached: EmailAdapter | null = null;

function selectAdapter(): EmailAdapter {
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();

  cached = apiKey && from ? createResendAdapter({ apiKey, from }) : createLoggingAdapter();

  logger.info('email adapter selected', { adapter: cached.name });
  return cached;
}

/**
 * Send a rendered template.
 *
 * ⚠ IT NEVER THROWS. See `types.ts` — an invitation written to the database
 * is real whether or not the email left, so a send failure must be reported
 * rather than raised. Every caller decides for itself what to tell the
 * person, and none of them has to write a try/catch to avoid rolling back
 * work that succeeded.
 *
 * ⚠ THE ADDRESS IS LOGGED; THE BODY IS NOT.
 *
 * 05 I-16 keeps customer record fields out of logs, and an invitation body
 * carries a live bearer token for seven days — logging it would put a working
 * credential into log aggregation, where it outlives the invitation and is
 * readable by anyone with dashboard access. The recipient address is logged
 * because "did this reach them" is unanswerable without it.
 */
export async function sendEmail(input: {
  to: string;
  template: RenderedTemplate;
  requestId?: string;
}): Promise<SendResult> {
  const adapter = selectAdapter();

  const result = await adapter
    .send({
      to: input.to,
      subject: input.template.subject,
      html: input.template.html,
      text: input.template.text,
      requestId: input.requestId,
    })
    .catch((error: unknown): SendResult => {
      // An adapter is contracted not to throw. If one does anyway, that is a
      // bug in the adapter and it must not become a bug in the caller.
      logger.error('email adapter threw, which it must not', {
        adapter: adapter.name,
        error,
      });
      return {
        delivered: false,
        reason: 'The email provider failed unexpectedly.',
        retryable: true,
      };
    });

  if (result.delivered) {
    logger.info('email sent', {
      adapter: adapter.name,
      to: input.to,
      subject: input.template.subject,
      providerId: result.providerId,
      requestId: input.requestId,
    });
  } else {
    logger.warn('email not delivered', {
      adapter: adapter.name,
      to: input.to,
      subject: input.template.subject,
      reason: result.reason,
      retryable: result.retryable,
      requestId: input.requestId,
    });
  }

  return result;
}

/** Whether this environment can send at all. The interface uses it to say
 *  "we emailed them" or "pass this link on", rather than guessing. */
export function emailIsConfigured(): boolean {
  return selectAdapter().name !== 'logging';
}

/** Tests reset the memoised adapter between environment permutations. */
export function resetEmailAdapterForTests(): void {
  cached = null;
}
