import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import { pk, softDelete, tenantRef, timestamps } from './_shared';

/**
 * 05 §8 · ADR-011. THE SEAMS.
 *
 * Structure and isolation only. Nothing above them.
 *
 * A seam is a promise about SHAPE, not a feature. Each gets a table with full
 * RLS, a typed interface and a documented contract, so Phase 2 starts from a
 * contract instead of a guess. None gets logic. If a task would build something
 * above one of these tables, it is in the out-of-scope list in 01 §2 and the
 * answer is to stop and raise it. 11 §6 rule 20.
 */

// ─── SEAM · knowledge base. Phase 2 owns embedding, chunking, retrieval. ─────

export const kbDocuments = pgTable(
  'kb_documents',
  {
    id: pk(),
    tenantId: tenantRef(),
    title: text('title').notNull(),
    sourceType: text('source_type').notNull(), // upload | url | manual
    sourceRef: text('source_ref'),
    contentHash: text('content_hash'),
    status: text('status').notNull().default('pending'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [index('kb_documents_tenant_idx').on(t.tenantId, t.status)],
);

export const kbChunks = pgTable(
  'kb_chunks',
  {
    id: pk(),
    /**
     * DENORMALISED DELIBERATELY, rather than joined through the document.
     *
     * A policy that has to join to check isolation is a policy that is slower
     * and easier to get wrong, and isolation case 10 exists precisely because a
     * child's policy can be correct while a query leaks through its parent's.
     * Denormalising the tenant reference onto every tenant-scoped table,
     * without exception, is a rule in this codebase. 05 §8.
     */
    tenantId: tenantRef(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => kbDocuments.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    embedding: vector('embedding', { dimensions: 1536 }),
    /**
     * WHICH MODEL PRODUCED THIS VECTOR.
     *
     * This column is why a Phase 2 embedding-model change is survivable rather
     * than a full re-index with no way to tell what is stale. CONFIRMED 24 Aug
     * 2026: OpenAI text-embedding-3-small, which is the 1536-dimension model
     * `embedding` above was already sized for. No migration was needed; this
     * column now has a known default value going forward. 01 §8 · 05 §8.
     */
    embeddingModel: text('embedding_model'),
    tokenCount: integer('token_count'),
    ...timestamps,
  },
  (t) => [
    index('kb_chunks_doc_idx').on(t.documentId, t.chunkIndex),
    index('kb_chunks_tenant_idx').on(t.tenantId),
    // The HNSW index still lands in Phase 2 per the original schedule; the
    // dimension is no longer a guess as of 24 Aug 2026 (1536,
    // text-embedding-3-small), so it can be specified whenever it is built
    // without risk of having to drop and rebuild it against a different one.
  ],
);

// ─── SEAM · customer records. PERSONAL DATA. 01 D-09 · 06 §9. ────────────────

/**
 * This table holds information about a TENANT'S CUSTOMERS: one step further
 * from us than anything else in the schema. Under the Kenyan Data Protection
 * Act 2019 Brian is a processor for his tenants and they are controllers for
 * their customers, and that relationship needs a DPA in writing before his
 * first paying customer. Raising it is our responsibility; the document is not
 * our deliverable. 06 §9.
 *
 * Phase 1 obligations, all small and all present from the first migration:
 * log redaction on the marked fields, the same isolation suite as every other
 * table, a soft-delete column, scope separation, and audited READS.
 *
 * Phase 2 obligation, flagged rather than omitted: retention and erasure
 * automation. It becomes necessary the first time a tenant operates somewhere
 * with data erasure rights.
 */
export const customerRecords = pgTable(
  'customer_records',
  {
    id: pk(),
    tenantId: tenantRef(),
    externalRef: text('external_ref'), // the tenant's own customer identifier
    displayName: text('display_name'), // REDACTED IN LOGS
    contactHandle: text('contact_handle'), // REDACTED IN LOGS
    channel: text('channel'),
    summary: text('summary'), // REDACTED IN LOGS
    preferences: jsonb('preferences'), // REDACTED IN LOGS
    keyFacts: jsonb('key_facts'), // REDACTED IN LOGS
    lastInteractionAt: timestamp('last_interaction_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete, // erasure support. Phase 2 automates it.
  },
  (t) => [uniqueIndex('customer_records_external_idx').on(t.tenantId, t.externalRef)],
);

// ─── SEAM · channel connections. Phase 2 owns every adapter. ─────────────────

export const channelConnections = pgTable(
  'channel_connections',
  {
    id: pk(),
    tenantId: tenantRef(),
    channel: text('channel').notNull(), // whatsapp | instagram | messenger | widget
    displayName: text('display_name').notNull(),
    status: text('status').notNull().default('disconnected'),
    externalAccountRef: text('external_account_ref'),
    /** A POINTER INTO SUPABASE VAULT, never the secret itself. ADR-008. */
    credentialsRef: text('credentials_ref'),
    connectedAt: timestamp('connected_at', { withTimezone: true }),
    lastEventAt: timestamp('last_event_at', { withTimezone: true }),
    config: jsonb('config'),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('channel_connections_unique').on(t.tenantId, t.channel, t.externalAccountRef),
  ],
);

/**
 * 07 §11. The internal event shape. Part of the M0 adapter contract, reproduced
 * in code because it is the seam Phase 2 depends on most, and reviewed and
 * signed BEFORE THE SCHEMA LOCKS. Getting this wrong is the risk named in the
 * brief; reviewing it early is the mitigation, and it is the M0 artefact most
 * likely to be deferred.
 */
export type InboundMessageEvent = {
  /** The provider's ID. This is the idempotency key. */
  eventId: string;
  tenantId: string;
  channel: 'whatsapp' | 'instagram' | 'messenger' | 'widget';
  connectionId: string;
  receivedAt: string;
  sender: {
    externalId: string;
    displayName?: string;
    /** PERSONAL DATA. Redacted in logs. */
    handle?: string;
  };
  content: {
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'unsupported';
    /** PERSONAL DATA. Redacted in logs. */
    text?: string;
    mediaRef?: string;
    mimeType?: string;
  };
  replyToExternalId?: string;
  metadata: Record<string, unknown>;
};

export type KbDocument = typeof kbDocuments.$inferSelect;
export type KbChunk = typeof kbChunks.$inferSelect;
export type CustomerRecord = typeof customerRecords.$inferSelect;
export type ChannelConnection = typeof channelConnections.$inferSelect;
