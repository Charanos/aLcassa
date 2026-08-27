/**
 * 10 §14. TRANSACTIONAL EMAIL.
 *
 * "Kept minimal. Five templates in Phase 1." The copy deck names all five and
 * gives each a subject and an opening line, so this module owns the sending
 * and not the wording — the wording is `templates.ts`, transcribed from that
 * document rather than invented here.
 *
 * ⚠ TWO OF THE FIVE ARE NOT OURS TO SEND, AND SAYING SO IS THE POINT.
 *
 *   Verify email     Supabase Auth sends it, as part of sign-up.
 *   Password reset   Supabase Auth sends it, from `resetPasswordForEmail`.
 *   Invitation       OURS. The token is ours, so the email must be too.
 *   Credential created   ours, at M5.
 *   Support session      ours, at M4.
 *
 * Reimplementing the first two would mean minting our own verification and
 * recovery tokens alongside Supabase's, which is a second credential path to
 * maintain and get wrong. They are listed here so the set is complete and so
 * nobody adds them twice.
 */

/** Everything an adapter needs. No template logic, no branding — it renders
 *  nothing and decides nothing, so a new provider is one file. */
export type OutboundEmail = {
  to: string;
  subject: string;
  /** Both parts, always. A text/plain alternative is not a nicety: a client
   *  that cannot render HTML, or a person who has turned it off, otherwise
   *  gets an empty message with an invitation they cannot accept. */
  html: string;
  text: string;
  /** Correlation, so a delivery question can be traced back to the request that
   *  triggered it. Sent as a header, not shown to the reader. */
  requestId?: string;
};

/**
 * ⚠ SENDING NEVER THROWS, AND THAT IS DELIBERATE.
 *
 * An invitation that was written to the database is real whether or not the
 * email carrying it left the building. If a send failure propagated, the
 * caller would have to choose between rolling back a valid invitation and
 * swallowing the error — and both are worse than reporting the truth.
 *
 * So the result says what happened, and the caller decides what to tell the
 * person. `/v1/invitations` returns the accept link either way, so an owner
 * whose mail provider is down can still get their colleague in.
 */
export type SendResult =
  | { delivered: true; providerId: string | null }
  | { delivered: false; reason: string; retryable: boolean };

export type EmailAdapter = {
  /** Names itself in logs, so "which provider dropped this" is answerable. */
  readonly name: string;
  send(email: OutboundEmail): Promise<SendResult>;
};

/**
 * The rendered form of a template. Templates are pure — they take data and
 * return this — so they can be unit-tested and previewed without a provider,
 * a network call or an account anywhere.
 */
export type RenderedTemplate = { subject: string; html: string; text: string };
