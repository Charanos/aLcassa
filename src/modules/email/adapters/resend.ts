import 'server-only';
import type { EmailAdapter, OutboundEmail, SendResult } from '../types';

/**
 * Resend, over `fetch`.
 *
 * ⚠ NO SDK, DELIBERATELY. The whole provider surface we use is one POST to
 * one URL with a bearer token. An SDK for that is a dependency to audit, keep
 * current and carry into a bundle, in exchange for wrapping a fetch call.
 * `04` ADR-007 already notes the runtime is serverless: every kilobyte of
 * dependency is paid at cold start, on every invocation.
 *
 * Swapping providers means writing another file in this directory. Nothing
 * above the adapter interface knows Resend exists.
 */

const ENDPOINT = 'https://api.resend.com/emails';

/**
 * Ten seconds, then give up.
 *
 * A serverless function that hangs on a provider outage burns its whole
 * execution budget and takes the request that triggered it down too — so an
 * invitation would fail to be CREATED because the email could not be SENT,
 * which inverts what matters. The abort is what keeps a provider's bad day
 * from becoming ours.
 */
const TIMEOUT_MS = 10_000;

export function createResendAdapter(input: { apiKey: string; from: string }): EmailAdapter {
  return {
    name: 'resend',

    async send(email: OutboundEmail): Promise<SendResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${input.apiKey}`,
            'content-type': 'application/json',
            // Resend deduplicates on this, so a retried invocation of the
            // same request cannot send the same invitation twice.
            ...(email.requestId ? { 'idempotency-key': email.requestId } : {}),
          },
          body: JSON.stringify({
            from: input.from,
            to: [email.to],
            subject: email.subject,
            html: email.html,
            text: email.text,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          return {
            delivered: false,
            // The body is included because a 422 from Resend names the actual
            // problem — an unverified sending domain, usually — and without it
            // the operator sees "422" and has nowhere to go.
            reason: `resend responded ${response.status}: ${detail.slice(0, 300)}`,
            /**
             * 4xx is our fault and will fail identically on a retry: a bad
             * key, an unverified domain, a malformed address. 5xx and 429 are
             * theirs and may not. Marking the first kind retryable would
             * queue a message that can never leave.
             */
            retryable: response.status >= 500 || response.status === 429,
          };
        }

        const body = (await response.json().catch(() => null)) as { id?: string } | null;
        return { delivered: true, providerId: body?.id ?? null };
      } catch (error) {
        const aborted = error instanceof Error && error.name === 'AbortError';
        return {
          delivered: false,
          reason: aborted
            ? `resend did not respond within ${TIMEOUT_MS}ms`
            : `resend request failed: ${error instanceof Error ? error.message : String(error)}`,
          retryable: true,
        };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
