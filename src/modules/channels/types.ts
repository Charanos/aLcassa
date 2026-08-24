import { z } from 'zod';
import type { InboundMessageEvent } from '@/db/schema/seams';

/**
 * 04 ADR-011 · 07 §10 · §11 · 12. THE CHANNEL ADAPTER CONTRACT.
 *
 * ⚠ THIS IS A SEAM, AND A SEAM IS A CONTRACT RATHER THAN A STUB. Phase 1
 * delivers the `channel_connections` table with full isolation, the typed
 * interface below, and the documented rules in
 * `project-docs/16-channel-adapter-guide.md`. Phase 2 owns every adapter and
 * every webhook receiver. Nothing above this file is built, deliberately.
 *
 * ⚠ IT IS DEFINED AT M0, BEFORE THE SCHEMA LOCKS, and that timing is the
 * whole point. 04 ADR-011: "the cheapest moment to discover a wrong
 * assumption." Getting the event shape wrong is the risk the brief names by
 * name; reviewing it while the schema can still move is the mitigation. If
 * this file changes after M1, something has gone wrong upstream of it.
 */

/* ── Channels ─────────────────────────────────────────────────────────── */

export const CHANNELS = ['whatsapp', 'instagram', 'messenger', 'widget'] as const;
export type Channel = (typeof CHANNELS)[number];
export const channelSchema = z.enum(CHANNELS);

/**
 * The connection lifecycle. `disconnected` is the default in the schema
 * rather than `pending`, because a row that exists but has never completed
 * an OAuth handshake is genuinely disconnected — not half-connected.
 */
export const CONNECTION_STATUSES = ['disconnected', 'connecting', 'connected', 'error'] as const;
export type ConnectionStatus = (typeof CONNECTION_STATUSES)[number];

/* ── Inbound ──────────────────────────────────────────────────────────── */

/**
 * Re-exported from the schema rather than redefined here.
 *
 * The shape lives beside the table in `db/schema/seams.ts` because it is
 * signed at M0 with the schema, and a second declaration of it in this
 * module is exactly the drift that made the console's workspace drawer
 * render a field it could not see (`15 §C30`). One definition, one place.
 */
export type { InboundMessageEvent };

/**
 * Zod mirror of `InboundMessageEvent`, for validating what an adapter
 * produces before it reaches anything else.
 *
 * ⚠ THE TWO PERSONAL-DATA FIELDS ARE MARKED IN BOTH PLACES. `sender.handle`
 * and `content.text` are the fields 06 §11 forbids reaching a log. The type
 * carries the comment; this carries the runtime check. Neither alone is
 * enough: the comment does not survive `JSON.stringify`, and the schema does
 * not survive a developer reading only the type.
 */
export const inboundMessageEventSchema = z.object({
  eventId: z.string().min(1),
  tenantId: z.string().uuid(),
  channel: channelSchema,
  connectionId: z.string().uuid(),
  receivedAt: z.string().datetime(),
  sender: z.object({
    externalId: z.string().min(1),
    displayName: z.string().optional(),
    /** PERSONAL DATA. Redacted in logs. */
    handle: z.string().optional(),
  }),
  content: z.object({
    type: z.enum(['text', 'image', 'audio', 'video', 'document', 'location', 'unsupported']),
    /** PERSONAL DATA. Redacted in logs. */
    text: z.string().optional(),
    mediaRef: z.string().optional(),
    mimeType: z.string().optional(),
  }),
  replyToExternalId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()),
});

/** The fields an adapter must never place in a log line or an error message.
 *  Consumed by the redaction helper the logger already applies. 06 §11. */
export const PERSONAL_DATA_PATHS = ['sender.handle', 'content.text'] as const;

/* ── Outbound ─────────────────────────────────────────────────────────── */

export type OutboundMessage = {
  tenantId: string;
  connectionId: string;
  /** The provider's ID for the recipient, as it arrived on the inbound event. */
  recipientExternalId: string;
  content: { type: 'text'; text: string } | { type: 'media'; mediaRef: string; caption?: string };
  /**
   * ⚠ THE CALLER'S IDEMPOTENCY KEY, NOT THE PROVIDER'S.
   *
   * Inbound is idempotent on the provider's `eventId` because the provider
   * owns that identity. Outbound has no provider ID until after the send
   * succeeds, so the caller supplies one and the adapter must not send twice
   * for the same key. Without this a retry after a timeout double-sends to a
   * real customer, which is the one failure in this seam a person notices.
   */
  idempotencyKey: string;
};

export type SendResult =
  | { ok: true; externalMessageId: string }
  | { ok: false; retryable: boolean; code: string; message: string };

/* ── Webhook verification ─────────────────────────────────────────────── */

/**
 * The result of verifying a webhook signature.
 *
 * ⚠ VERIFICATION HAPPENS BEFORE PARSING, ALWAYS. 07 §10: "verify first,
 * return 200 fast, do work asynchronously." A handler that parses a body it
 * has not authenticated is processing attacker-controlled input, and the
 * ordering is the entire defence.
 */
export type VerificationResult =
  | { valid: true; tenantId: string; connectionId: string }
  | { valid: false; reason: 'bad_signature' | 'unknown_connection' | 'malformed' };

/* ── The adapter interface ────────────────────────────────────────────── */

/**
 * Every channel adapter implements exactly this. 12 lists the five methods;
 * they are here with the types that make each one checkable.
 *
 * ⚠ AN ADAPTER NEVER READS OR WRITES THE DATABASE DIRECTLY. It normalises
 * provider shapes into `InboundMessageEvent` and hands that upward. Tenant
 * resolution happens in `verifyWebhook`, from the connection record, and
 * never from anything in the request body — a webhook body is
 * attacker-controlled, so a `tenantId` read out of one would be a
 * cross-tenant write waiting to happen. 06 §2.
 */
export type ChannelAdapter = {
  readonly channel: Channel;

  /** Begin or complete the provider handshake. Returns the external account
   *  reference to store on the connection row. */
  connect(input: { tenantId: string; config: Record<string, unknown> }): Promise<
    { ok: true; externalAccountRef: string } | { ok: false; code: string; message: string }
  >;

  /** Revoke at the provider and mark the connection disconnected. Must be
   *  safe to call on an already-disconnected connection. */
  disconnect(input: { connectionId: string }): Promise<{ ok: boolean }>;

  /** Authenticate an inbound webhook and resolve which tenant it belongs to.
   *  Runs before the body is parsed. */
  verifyWebhook(input: {
    rawBody: string;
    headers: Record<string, string>;
  }): Promise<VerificationResult>;

  /** Provider payload → the internal shape. Pure: no IO, so it is trivially
   *  testable against recorded fixtures, which is how a Phase 2 adapter is
   *  proven correct without a live provider account. */
  normaliseInbound(input: {
    rawBody: string;
    tenantId: string;
    connectionId: string;
  }): InboundMessageEvent[];

  /** Send a message. Honours `idempotencyKey`. */
  sendOutbound(message: OutboundMessage): Promise<SendResult>;
};

/* ── Retry and idempotency ────────────────────────────────────────────── */

/**
 * The rules a Phase 2 processing layer must satisfy, as data rather than
 * prose, so they can be asserted in a test rather than remembered.
 */
export const RETRY_POLICY = {
  /** Exponential, jittered. Attempt 1 is the original delivery. */
  maxAttempts: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
  /**
   * ⚠ AFTER `maxAttempts` A MESSAGE GOES TO A DEAD-LETTER RECORD, NEVER
   * SILENTLY DROPPED. A poison message that vanishes is a customer whose
   * message was never answered and no one knows. It is retained with its raw
   * payload for replay once the defect is fixed.
   */
  onExhausted: 'dead_letter' as const,
  /** How long a processed `eventId` is remembered, so a provider redelivering
   *  outside this window cannot create a duplicate conversation. Providers
   *  commonly retry for 24h; 7 days is deliberate headroom. */
  idempotencyWindowDays: 7,
} as const;
