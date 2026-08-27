import 'server-only';
import { logger } from '@/lib/logger';
import type { EmailAdapter, OutboundEmail, SendResult } from '../types';

/**
 * The adapter for an environment with no mail provider configured.
 *
 * ⚠ IT REPORTS `delivered: false`, AND THAT IS THE ENTIRE POINT.
 *
 * The tempting shape is a "development adapter" that logs the message and
 * returns success, because it keeps local flows green. It is the wrong shape:
 * every caller then treats an unconfigured production environment as a
 * working one, an owner is told their colleague has been emailed, and nobody
 * finds out until the colleague never arrives.
 *
 * So it is honest. It writes the message where a developer can read it, and
 * it says plainly that nothing was sent. `/v1/invitations` already returns
 * the accept link, and the team screen shows it, so an unconfigured
 * environment is fully usable — the owner passes the link on themselves,
 * knowing that is what they are doing.
 *
 * ⚠ IT LOGS THE SUBJECT AND THE BODY, WHICH IS SAFE ONLY BECAUSE IT NEVER
 *   RUNS WHERE A PROVIDER IS CONFIGURED. An invitation body carries a live
 *   bearer token for seven days. `selectAdapter` returns this only when no
 *   key is set, so the token in the log is one that was never mailed to
 *   anybody — but that is a property of the selection, not of this file, and
 *   it is why this adapter must never be chosen as a fallback after a
 *   provider failure.
 */
export function createLoggingAdapter(): EmailAdapter {
  return {
    name: 'logging',

    // eslint-disable-next-line @typescript-eslint/require-await -- the interface is async; there is nothing to await when nothing is sent
    async send(email: OutboundEmail): Promise<SendResult> {
      logger.warn('email not sent: no provider configured', {
        to: email.to,
        subject: email.subject,
        requestId: email.requestId,
      });

      // Separate from the structured line above, and only outside production:
      // this is the copy a developer actually wants to read while building a
      // template, and it has no business in an aggregated log.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console -- a development convenience, guarded
        console.info(
          `\n─── email (not sent) ───\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}\n────────────────────────\n`,
        );
      }

      return {
        delivered: false,
        reason:
          'No email provider is configured. Set RESEND_API_KEY and EMAIL_FROM to send, or pass the link on by hand.',
        // Retrying changes nothing until somebody sets an environment
        // variable, and a queue of messages waiting on that is a queue that
        // eventually delivers a batch of expired invitations.
        retryable: false,
      };
    },
  };
}
