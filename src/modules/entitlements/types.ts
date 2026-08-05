import { z } from 'zod';

/**
 * 08 §2. Six entitlement keys at launch. Three enforce Phase 1 behaviour and
 * three are seams whose guards exist now, which means Phase 2 adds an adapter
 * rather than an enforcement layer.
 */
export const ENTITLEMENT_KEYS = [
  /** Active members plus PENDING INVITATIONS. Counting invitations is not an
   *  implementation detail: without it a tenant on five seats sends fifty
   *  invitations and exceeds the limit the moment they are accepted, at which
   *  point the only remedy is removing people who have already joined. */
  'seats',
  'channels', // Phase 2 behaviour, guard present now
  'api_keys',
  'kb_documents', // Phase 2 behaviour, guard present now
  'ai_rules_versions',
  'audit_retention_days',
] as const;

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

export const entitlementKeySchema = z.enum(ENTITLEMENT_KEYS);

export type EntitlementKind = 'limit' | 'feature';

export type Entitlement = {
  key: EntitlementKey;
  displayName: string;
  kind: EntitlementKind;
  /** null means unlimited. Rendered as ∞ through MathExpr, never as a full
   *  progress bar, because a full bar for an unlimited plan is a lie. 03 §10. */
  limit: number | null;
  current: number;
  enabled: boolean;
  /** Set when a live subscription_overrides row is answering instead of the
   *  plan. The tenant is shown this, with its reason, because a customer who
   *  has been granted extra seats should know it and should know it may expire. */
  override: { reason: string; expiresAt: string | null } | null;
};

export type EntitlementSnapshot = {
  tenantId: string;
  planCode: string;
  subscriptionStatus: string;
  byKey: Partial<Record<EntitlementKey, Entitlement>>;
  compiledAt: string;
};

export type EntitlementDecision =
  | { allowed: true; approachingLimit?: boolean }
  | {
      allowed: false;
      code: 'entitlement.limit_reached' | 'entitlement.feature_unavailable';
      details?: { key: EntitlementKey; limit: number | null; current: number };
    };
