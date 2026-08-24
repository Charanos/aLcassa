/**
 * 04 §3 · 11 §6. The only file another module may import.
 *
 * `channels` owns the Phase 2 seam: the adapter contract, the internal event
 * shape and the retry rules. In Phase 1 it owns no behaviour at all — there
 * is no repository and no service here, because there is nothing to run
 * yet. 04 ADR-011: "Each gets a table with full RLS, a typed interface, and
 * a documented contract. None gets logic."
 *
 * The table is in `db/schema/seams.ts` with its policies in
 * `db/policies/06_seams.sql`. The written contract is
 * `project-docs/16-channel-adapter-guide.md`.
 */

export {
  CHANNELS,
  CONNECTION_STATUSES,
  PERSONAL_DATA_PATHS,
  RETRY_POLICY,
  channelSchema,
  inboundMessageEventSchema,
} from './types';

export type {
  Channel,
  ChannelAdapter,
  ConnectionStatus,
  InboundMessageEvent,
  OutboundMessage,
  SendResult,
  VerificationResult,
} from './types';
