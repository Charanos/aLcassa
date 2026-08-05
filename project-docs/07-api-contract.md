# 07 · API Contract

**Bases:** `/api/v1` session door · `/api/service/v1` machine door · `/api/platform/v1` console
**Specification:** OpenAPI 3.1, generated from Zod schemas, verified by contract tests in CI. The specification and the implementation cannot drift, because the tests fail if they do.

---

## 1. Conventions

| Concern | Rule |
|---|---|
| Casing | `camelCase` in payloads |
| Dates | ISO 8601 with offset, UTC on the wire |
| Identifiers | UUID strings, opaque to the client |
| Money | `{ amount, currency }`, minor units. Never a formatted string |
| Pagination | Cursor: `?cursor=&limit=`, response carries `nextCursor` |
| Idempotency | `Idempotency-Key` required on provisioning and credential creation |
| Correlation | `X-Request-Id` accepted, generated if absent, echoed always, appears in every log line and every audit row |
| Validation | Zod at the boundary. 422 with field-level detail |
| Rate limits | `X-RateLimit-Limit`, `-Remaining`, `-Reset` on every response |
| Versioning | Path version. Breaking changes get `/v2` |

### Envelope

One shape, both doors. Requirement 6 asks for one typed error contract across the API and this is it.

```ts
type ApiSuccess<T> = { data: T; meta?: { nextCursor?: string; total?: number } };

type ApiError = {
  error: {
    code: string;           // machine readable, stable, from the catalogue in §2
    message: string;        // human readable, safe to display
    details?: Array<{ field: string; code: string; message: string }>;
    requestId: string;
  };
};
```

Every message is written to be shown to a user. If it is not safe to display, the code is generic and the detail goes to the log.

### Status codes

`200` read · `201` created · `202` accepted · `204` no content · `400` malformed · `401` unauthenticated · `403` unauthorised · `404` not found or not visible · `409` conflict including version conflicts · `410` gone for expired invitations · `422` validation · `423` locked · `429` rate limited · `500` · `503` with `Retry-After`.

**`404`, never `403`, for a resource in another tenant.** A `403` confirms the resource exists, which is an information leak on a multi-tenant platform. This is a rule, not a preference.

---

## 2. Error code catalogue

Stable, because the client and Phase 2 both map these to behaviour.

| Code | Meaning |
|---|---|
| `auth.invalid_credentials` | |
| `auth.account_locked` | Too many attempts |
| `auth.session_expired` | |
| `auth.email_unverified` | |
| `auth.no_membership` | Authenticated but not attached to a tenant |
| `tenant.suspended` | |
| `tenant.not_found` | |
| `member.last_owner` | Cannot remove or demote the only owner |
| `member.already_exists` | |
| `invitation.expired` | |
| `invitation.already_accepted` | |
| `invitation.revoked` | |
| `entitlement.limit_reached` | Carries `key`, `limit` and `current` in details |
| `entitlement.feature_unavailable` | Not on this plan |
| `subscription.not_active` | |
| `credential.not_found` | |
| `credential.revoked` | |
| `credential.scope_missing` | Carries the required scope in details |
| `credential.limit_reached` | |
| `rules.version_conflict` | Optimistic lock failure, carries both versions |
| `rules.field_locked` | A tenant attempted to override a platform-locked field |
| `support.session_expired` | |
| `support.not_permitted` | |
| `platform.not_admin` | |
| `validation.failed` | Generic, with `details` populated |
| `rate_limit.exceeded` | Carries `retryAfter` |

---

## 3. Access and identity

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/v1/auth/sign-up` | Provisions tenant, user, membership, subscription in one transaction. Idempotent |
| `POST` | `/v1/auth/sign-in` | |
| `POST` | `/v1/auth/sign-out` | Revokes the session row |
| `POST` | `/v1/auth/password/forgot` | Always 204, never confirms an account exists |
| `POST` | `/v1/auth/password/reset` | Revokes every session for the user on success |
| `POST` | `/v1/auth/verify-email` | |
| `GET` | `/v1/me` | Everything needed to render the shell in one round trip |
| `PATCH` | `/v1/me` | Name, avatar |
| `GET` | `/v1/me/sessions` | |
| `DELETE` | `/v1/me/sessions/:id` | |
| `DELETE` | `/v1/me/sessions` | Revoke all except the current |

```ts
type Me = {
  user: { id: string; fullName: string; email: string; emailVerified: boolean };
  tenant: { id: string; name: string; slug: string; status: TenantStatus } | null;
  membership: { role: MemberRole; status: MemberStatus } | null;
  subscription: { planCode: string; planName: string; status: SubscriptionStatus;
                  currentPeriodEnd: string } | null;
  entitlements: Array<{ key: string; displayName: string; kind: 'limit' | 'feature';
                        limit: number | null; current: number; enabled: boolean }>;
  supportMode: { active: boolean; expiresAt: string; platformAdminName: string } | null;
  platformAdmin: boolean;
};
```

`entitlements` carries both the limit and the current usage, so the interface can render `LimitBar` without a second call. `supportMode` is what the client uses to render the boundary frame, and it comes from the server rather than from a query parameter, because a frame that could be suppressed by editing a URL would be worthless.

---

## 4. Tenant settings

| Method | Path | Role |
|---|---|---|
| `GET` | `/v1/tenant` | all |
| `PATCH` | `/v1/tenant` | owner, admin |
| `GET` | `/v1/tenant/settings` | all |
| `PATCH` | `/v1/tenant/settings` | owner, admin. Requires `version` |
| `POST` | `/v1/tenant/logo` | owner, admin. Signed upload to a tenant-scoped bucket path |
| `POST` | `/v1/tenant/transfer-ownership` | owner. Atomic, requires password confirmation |

## 5. Team and invitations

| Method | Path | Role |
|---|---|---|
| `GET` | `/v1/members` | all |
| `PATCH` | `/v1/members/:id/role` | owner. Rejects `member.last_owner` |
| `DELETE` | `/v1/members/:id` | owner, admin (agents only) |
| `GET` | `/v1/invitations` | owner, admin |
| `POST` | `/v1/invitations` | owner, admin. **Passes through the entitlement guard on `seats`** |
| `POST` | `/v1/invitations/:id/resend` | owner, admin. Rate limited per invitation |
| `DELETE` | `/v1/invitations/:id` | owner, admin |
| `GET` | `/v1/invitations/accept/:token` | Public. Returns tenant name and role for the accept screen |
| `POST` | `/v1/invitations/accept/:token` | Public. Creates or attaches the user |

Inviting counts against `seats` at invitation time, not at acceptance. Otherwise a tenant on a 5-seat plan can send fifty invitations and blow through the limit the moment they are accepted.

## 6. Credentials

| Method | Path | Role |
|---|---|---|
| `GET` | `/v1/credentials` | owner. **Metadata only** |
| `POST` | `/v1/credentials` | owner. Idempotent. **The only response that ever contains a secret** |
| `POST` | `/v1/credentials/:id/rotate` | owner. Creates a successor, old one enters `rotating` with a grace window |
| `DELETE` | `/v1/credentials/:id` | owner. Immediate revocation |

```ts
// GET response. Note what is absent.
type CredentialView = {
  id: string;
  name: string;
  keyPrefix: string;              // 'csk_live_8f2a', display only
  scopes: string[];
  environment: 'live' | 'test';
  status: 'active' | 'rotating' | 'revoked';
  createdAt: string;
  createdByName: string;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  useCount: number;
};

// POST response, once, never again.
type CredentialCreated = CredentialView & { secret: string };
```

**`05 I-08` is tested here:** a contract test asserts that no response from any route in `/v1` or `/v1/platform` contains a `secret` or `keyHash` key at any nesting depth, with the single documented exception of `POST /v1/credentials`. That test is in the definition of done.

Rotation grace window: the old credential stays valid for 24 hours in `rotating` status, so Phase 2 can deploy the new key without an outage. The window is visible in the interface with a countdown.

---

## 7. AI rules, session door

| Method | Path | Role |
|---|---|---|
| `GET` | `/v1/ai-rules` | all. Returns current published tenant rules plus the master fields that are locked |
| `GET` | `/v1/ai-rules/versions` | owner, admin |
| `GET` | `/v1/ai-rules/versions/:id` | owner, admin |
| `POST` | `/v1/ai-rules/draft` | owner, admin. Creates or updates the working draft |
| `POST` | `/v1/ai-rules/publish` | owner, admin. Requires `version`. **Invalidates the cache synchronously** |
| `POST` | `/v1/ai-rules/rollback/:versionId` | owner, admin. Moves the pointer, creates an audit entry |

Publishing invalidates the Redis key before it returns 200. That ordering is what makes the five-second contract in `08 §5` honest: by the time the interface says published, the next machine read will miss the cache and recompile.

---

## 8. The service door

The machine's contract. Phase 2 lives here, so it gets the most careful treatment.

### Authentication

```
Authorization: Bearer csk_live_8f2a...
```

Verification: parse the prefix, look up the credential row by prefix (indexed), verify the full key against the argon2id hash, check status, check expiry, check the required scope. Cached in Redis for 60 seconds keyed on a hash of the presented key, so a hot path does not re-run argon2id on every request.

**Scope is checked before the handler runs.** A credential lacking `ai_rules:read` never reaches business logic, and the definition of done tests this for each scope.

### Endpoints

| Method | Path | Scope | Purpose |
|---|---|---|---|
| `GET` | `/service/v1/ai-rules` | `ai_rules:read` | **The one that matters.** Compiled master plus tenant rules |
| `GET` | `/service/v1/tenant` | `tenant:read` | Tenant name, timezone, locale, status |
| `GET` | `/service/v1/health` | none | Liveness, for Phase 2's own monitoring |

Three endpoints in Phase 1. Every other scope in `05 §6` is reserved and returns `501 Not Implemented` with a body naming the phase, so Phase 2 discovers the shape rather than a 404.

### The AI rules read, in full

```http
GET /api/service/v1/ai-rules HTTP/1.1
Authorization: Bearer csk_live_8f2a...
If-None-Match: "t7-v42-m5"
```

```http
HTTP/1.1 200 OK
ETag: "t7-v42-m5"
Cache-Control: private, max-age=5, must-revalidate
X-Rules-Master-Version: 5
X-Rules-Tenant-Version: 42
X-Request-Id: 01J8...

{
  "data": {
    "tenantId": "…",
    "compiledAt": "2026-07-29T09:14:22Z",
    "masterVersion": 5,
    "tenantVersion": 42,
    "rules": {
      "tone": "…",
      "responseGuidelines": "…",
      "businessInformation": "…",
      "escalationInstructions": "…",
      "prohibitedTopics": ["…"],
      "customInstructions": "…"
    },
    "provenance": {
      "tone": "master",
      "responseGuidelines": "master+tenant",
      "businessInformation": "tenant",
      "prohibitedTopics": "master",
      "customInstructions": "tenant"
    },
    "locked": ["tone", "prohibitedTopics"]
  }
}
```

Then, on the next poll with the same ETag:

```http
HTTP/1.1 304 Not Modified
ETag: "t7-v42-m5"
```

Design notes worth keeping:

- **The ETag composes both versions.** A master rules change invalidates every tenant's ETag, which is correct, since master rules affect every compiled document.
- **`provenance` tells Phase 2 where each field came from.** Without it, debugging why the assistant used a particular tone means reading two tables by hand.
- **`locked` names the fields a tenant cannot override**, so Phase 2 could surface that in its own tooling if it wants to.
- **The 304 has no body**, which is the entire point. At Phase 2's message volume this is the difference between a cheap poll and an expensive one.

### Rate limits, service door

Per credential, by plan tier, generous by design: the intended usage is one poll per generated response. Starting point: 600 requests per minute per credential, with 304 responses counted at a tenth weight. Configurable per tenant through `subscriptionOverrides`.

---

## 9. Platform door

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/platform/v1/tenants` | Cursor paginated, filterable, searchable |
| `POST` | `/platform/v1/tenants` | Provision. Idempotent. **Service role, audited** |
| `GET` | `/platform/v1/tenants/:id` | Record and aggregates, not content |
| `PATCH` | `/platform/v1/tenants/:id` | Name, slug. **Service role, audited** |
| `POST` | `/platform/v1/tenants/:id/suspend` | Reason required. **Service role, audited** |
| `POST` | `/platform/v1/tenants/:id/reactivate` | **Service role, audited** |
| `POST` | `/platform/v1/tenants/:id/plan` | Assign a plan. **Service role, audited** |
| `POST` | `/platform/v1/tenants/:id/overrides` | Grant a custom limit, reason required |
| `POST` | `/platform/v1/support/enter` | Mints a support session. Two audit writes |
| `POST` | `/platform/v1/support/exit` | Revokes it. Two audit writes |
| `GET` | `/platform/v1/plans` | |
| `POST` | `/platform/v1/plans` | |
| `PATCH` | `/platform/v1/plans/:id` | **Response includes the affected-tenant count before commit** |
| `GET` | `/platform/v1/ai-rules` | Master singleton |
| `POST` | `/platform/v1/ai-rules/publish` | Invalidates every tenant's cache |
| `GET` | `/platform/v1/health` | Service status, metrics, watchlists, isolation suite result |
| `GET` | `/platform/v1/audit` | Platform log, filterable by actor, tenant, action, service-role usage |

Every route marked "service role, audited" goes through the wrapper in `06 §7` that writes the audit row before the operation runs.

---

## 10. Webhook seam

`/api/webhooks/:channel` exists as a route with signature verification scaffolding and returns `501 Not Implemented`. It is documented in the channel adapter guide with the required behaviour: verify first, return 200 fast, do work asynchronously, be idempotent on the provider's event ID, store the raw payload.

Building the route shell now costs an hour and means Phase 2 starts from a shape rather than a blank file. Building anything above it is out of scope.

---

## 11. The internal event shape

Part of the M0 adapter contract, reproduced here because it is the seam Phase 2 depends on most.

```ts
export type InboundMessageEvent = {
  eventId: string;              // provider's ID, the idempotency key
  tenantId: string;
  channel: 'whatsapp' | 'instagram' | 'messenger' | 'widget';
  connectionId: string;
  receivedAt: string;
  sender: {
    externalId: string;         // provider's user ID
    displayName?: string;
    handle?: string;            // PERSONAL DATA. Redacted in logs
  };
  content: {
    type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'unsupported';
    text?: string;              // PERSONAL DATA. Redacted in logs
    mediaRef?: string;
    mimeType?: string;
  };
  replyToExternalId?: string;
  metadata: Record<string, unknown>;
};
```

Reviewed and signed at M0, before the schema locks. Getting this wrong is the risk named in the brief, and reviewing it early is the mitigation.

---

## 12. Contract testing

Every endpoint has a contract test asserting its response shape against the OpenAPI specification. The specification is generated from Zod, so a handler and its documentation cannot diverge.

Three tests carry more weight than the rest and are named individually in the definition of done:

1. **No secret in any response.** Recursive key scan across every route's response, one documented exception.
2. **Scope enforcement.** For each scope, a credential lacking it is rejected before the handler.
3. **Both doors, one guard.** The same entitlement scenario driven through the session door and the service door produces an identical decision. This is the test that closes the brief's open question.
