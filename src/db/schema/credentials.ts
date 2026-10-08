import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { pk, softDelete, timestamps } from './_shared';
import { tenantRef } from './tenancy';

/**
 * 05 §6 · 01 D-11 · ADR-008.
 *
 * EVERY CREDENTIAL IS WRITE-ONLY FROM THE INTERFACE, PERMANENTLY.
 *
 * A key is displayed exactly once, at creation. After that the interface shows
 * a masked prefix, the scopes, the created date and the last-used timestamp.
 * There is no reveal, for anyone: not for the person who created it, not for a
 * tenant owner, not for Brian, not from the console, not in support mode.
 * Rotation replaces; it never re-reveals.
 *
 * The definition of done tests this from every application route, by scanning
 * every response recursively for a `secret` or `keyHash` key at any nesting
 * depth, with one documented exception: POST /v1/credentials. 05 I-08 · 07 §12.
 */

export const credentialStatus = pgEnum('credential_status', ['active', 'rotating', 'revoked']);

export const apiCredentials = pgTable(
  'api_credentials',
  {
    id: pk(),
    tenantId: tenantRef(),
    name: text('name').notNull(), // 'AGNO production'
    /** Shown masked, searchable. The prefix is public; the secret is not. */
    keyPrefix: text('key_prefix').notNull(),
    /**
     * argon2id. NEVER RECOVERABLE and never selected by any application route:
     * the verification path reads it inside a service function that returns a
     * boolean, and the column is excluded from every projection type.
     */
    keyHash: text('key_hash').notNull(),
    scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
    environment: text('environment').notNull().default('live'), // live | test
    status: credentialStatus('status').notNull().default('active'),
    createdBy: uuid('created_by').notNull(),
    /** Reserved for the usage rollup; timestamp persistence remains an operational gate. */
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    lastUsedIp: text('last_used_ip'),
    useCount: bigint('use_count', { mode: 'number' }).notNull().default(0),
    rotatedFromId: uuid('rotated_from_id'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedBy: uuid('revoked_by'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    ...timestamps,
    ...softDelete,
  },
  (t) => [
    uniqueIndex('api_credentials_prefix_idx').on(t.keyPrefix),
    index('api_credentials_tenant_idx').on(t.tenantId, t.status),
  ],
);

/**
 * 05 §6. Reserved scopes exist in this list now so Phase 2 does not need a
 * migration to a shared table, and so the scope selector can show a tenant what
 * is coming rather than presenting a short list that grows mysteriously.
 */
export const SCOPES = {
  AI_RULES_READ: 'ai_rules:read',
  AI_RULES_WRITE: 'ai_rules:write', // reserved, Phase 2
  TENANT_READ: 'tenant:read',
  KB_READ: 'kb:read', // reserved, Phase 2 seam
  KB_WRITE: 'kb:write', // reserved, Phase 2 seam
  /** 06 §9. NEVER granted to an ingestion key. The scope selector warns when
   *  the combination is requested. */
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_WRITE: 'customers:write', // reserved, Phase 2 seam
  CHANNELS_READ: 'channels:read', // reserved, Phase 2 seam
  CHANNELS_WRITE: 'channels:write', // reserved, Phase 2 seam
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

/** Implemented in Phase 1. Every other scope returns 501 with a body naming
 *  the phase, so Phase 2 discovers the shape rather than a 404. 07 §8. */
export const PHASE_1_SCOPES: readonly Scope[] = [SCOPES.AI_RULES_READ, SCOPES.TENANT_READ];

export type ApiCredential = typeof apiCredentials.$inferSelect;

/**
 * The projection every route uses. `keyHash` is absent from the TYPE, not just
 * from the query, so returning it is a compile error rather than a code review
 * catch. 07 §6.
 */
export type CredentialView = Omit<ApiCredential, 'keyHash' | 'deletedAt'>;
