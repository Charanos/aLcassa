# 04 · System Architecture

**Shape:** one Next.js application on Vercel, one Supabase project, one Upstash Redis instance. No separate services in Phase 1.

---

## 1. Container view

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                                 │
│  Browser (tenant users)   ·   Browser (platform owner)                   │
│  FastAPI + AGNO (machine, Phase 2 consumer, reads AI rules now)          │
└──────────────────┬───────────────────────────────────────────────────────┘
                   │ HTTPS
┌──────────────────▼───────────────────────────────────────────────────────┐
│  VERCEL EDGE                                                             │
│  WAF · rate limiting · middleware: session resolve → tenant resolve       │
└──────────────────┬───────────────────────────────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────────────────────────────┐
│  NEXT.JS 15 APPLICATION                                                  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ (marketing) · (access) · (tenant)/app · (platform)/platform        │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ API LAYER — one pipeline, both doors                               │  │
│  │  auth guard → tenant resolver → entitlement guard → handler        │  │
│  │             → audit writer                                          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ MODULES                                                            │  │
│  │  tenancy   identity   membership   subscriptions   entitlements    │  │
│  │  credentials   airules   audit   platform   support   health       │  │
│  │  seams(kb, customer-records, channels)                             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Shared: db client · rls context · logger · result types · errors   │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└────┬──────────────────────────┬──────────────────────────┬───────────────┘
     │                          │                          │
     ▼                          ▼                          ▼
┌─────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐
│ SUPABASE        │   │ UPSTASH REDIS    │   │ OBSERVABILITY            │
│ Postgres + RLS  │   │ 4 scoped uses    │   │ Sentry · Axiom           │
│ Auth · Storage  │   │ never truth      │   │ Better Stack · status    │
│ Vault · pgvector│   └──────────────────┘   └──────────────────────────┘
└─────────────────┘
                    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
                      PHASE 2 SEAM · channel adapter interface
                    │  WhatsApp   Instagram   Messenger   Widget    │
                     ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

## 2. The request pipeline

Every request through both doors passes the same five stages, in the same order, implemented once.

```
1 · AUTHENTICATE     session cookie → Supabase Auth   |   API key → credential lookup
                     ↓ resolves an actor
2 · RESOLVE TENANT   session: membership row for actor  |  key: tenant on the credential
                     ↓ sets the RLS context for the connection
                     ↓ NEVER reads tenant_id from the request body or query
3 · AUTHORISE        role check against the action's required role
                     ↓ or scope check for the service door
4 · ENTITLE          checkEntitlement(tenant, key, delta). ONE function, both doors
                     ↓
5 · HANDLE           the business operation, inside a transaction
                     ↓
6 · AUDIT            written in the same transaction as the operation
```

Stages 1 and 3 legitimately differ by door. **Stages 2, 4 and 6 are identical implementations**, which is the substantive answer to the open question raised in the brief. `01 D-04`.

---

## 3. Module boundaries

| Module | Owns | Never touches |
|---|---|---|
| `tenancy` | Tenant records, provisioning, suspension, lifecycle | User credentials |
| `identity` | Users, sessions, password reset, platform admins | Tenant business data |
| `membership` | The user-to-tenant relationship, roles, invitations | Plans |
| `subscriptions` | Plans, tiers, subscription state, lifecycle | Usage counting |
| `entitlements` | Limit definitions, usage counters, the guard | Business meaning of a limit |
| `credentials` | API keys, scopes, hashing, rotation, last-used | What a scope permits at the handler |
| `airules` | Master singleton, tenant rules, versions, compilation | Delivery |
| `audit` | Append-only log, both tenant and platform | Everything. It only appends |
| `platform` | Console operations, service-role paths | Tenant day-to-day data |
| `support` | Support session minting, boundary state, dual audit | Anything the support role may not see |
| `health` | Service checks, metrics aggregation, watchlists | Writes to any domain table |
| `seams` | Knowledge base and customer record tables, channel interface | Any logic above the table |

Enforcement: directory boundaries with an ESLint `no-restricted-imports` rule, one service surface per module exported from `index.ts`, route handlers that never touch Drizzle directly.

---

## 4. Core sequences

### 4.1 · Tenant provisioning

```
Browser        access route     tenancy      identity     membership    audit
   │                │              │            │             │           │
   ├─sign-up───────▶│              │            │             │           │
   │                ├─BEGIN────────────────────────────────────────────── │
   │                ├─create tenant (status=provisioning)─▶  │            │
   │                ├─create auth user────────────────────▶  │            │
   │                ├─create membership (role=owner)──────────────────▶   │
   │                ├─create default subscription (free tier)             │
   │                ├─create tenant_settings row                          │
   │                ├─create ai_rules row (empty)                         │
   │                ├─set tenant status=active                            │
   │                ├─write audit────────────────────────────────────────▶│
   │                ├─COMMIT ───────────────────────────────────────────  │
   │◀─session + redirect to /app                                          │
```

One transaction. A half-provisioned tenant is worse than a failed sign-up, because it presents as a working account that quietly cannot do things. The definition of done requires end-to-end provisioning in under two minutes with no manual database work, and that is a test, not a hope.

### 4.2 · Support mode entry

```
Brian      console      support        identity        target tenant     audit×2
  │           │            │              │                  │              │
  ├─switch───▶│            │              │                  │              │
  │           ├─verify platform_admin ───▶│                  │              │
  │           ├─mint scoped session ─────▶│                  │              │
  │           │   tenant_id = target                                        │
  │           │   role = support                                            │
  │           │   expires_at = now + 30m                                    │
  │           │   NOT the service role key                                  │
  │           ├─write platform_audit_log ────────────────────────────────▶  │
  │           ├─write tenant audit_log (actor = Brian, mode = support) ──▶  │
  │◀─redirect to /app with boundary frame                                   │
  │                                                                          │
  │   every subsequent action inside this session writes to BOTH logs        │
  │   inactivity 30m → session expires → forced fresh switch                 │
```

The scoped session is a real session row with a `support_context` payload. RLS reads `tenant_id` and `role` from it exactly as it does for a tenant user, which is what makes the ceiling genuine rather than a convention. `06 §6`.

### 4.3 · AI rules read, the machine path

```
FastAPI/AGNO         service door        redis          postgres
     │                    │                │                │
     ├─GET /service/v1/ai-rules            │                │
     │  If-None-Match: "v42-t7"            │                │
     │                    ├─verify key hash, check scope ai_rules:read
     │                    ├─get compiled:{tenant}:v ────────▶│
     │                    │◀─hit, version 42 ───────────────┤
     │◀─304 Not Modified, no body ─────────┤                │
     │                    │                │                │
     │   on miss:         ├────────────────────────────────▶│ read master + tenant
     │                    ├─compile, apply precedence       │
     │                    ├─set redis, ttl 300s             │
     │◀─200 + compiled document + ETag ────┤                │
```

Cache invalidation is explicit on write, not left to expiry. The 300-second TTL is the worst case if an invalidation is somehow missed, and it is stated in the API documentation as the contract. Normal case is under five seconds and it is measured rather than asserted. `08 §5`.

---

## 5. Architecture decision records

### ADR-001 · Shared Postgres with Row Level Security, not schema or database per tenant

**Status:** accepted, matching the brief

**Options.**

| | Shared + RLS | Schema per tenant | Database per tenant |
|---|---|---|---|
| Migration cost | One migration | N migrations, or dynamic DDL | N databases |
| Cost per tenant | Near zero | Low | Significant |
| Isolation strength | Policy-enforced, strong if correct | Structural | Physical |
| Connection pooling | Simple | Complicated by search_path | Hard |
| Cross-tenant reporting | Trivial | Painful | Very painful |
| Blast radius of a bug | All tenants | One tenant | One tenant |

**Decision.** Shared with RLS. Correct at Brian's stage, and it is what he agreed to.

**The honest cost:** the blast radius row. A single policy mistake exposes every tenant, where a schema-per-tenant mistake exposes one. That risk is bought down with the automated isolation suite in `06 §4`, a policy review at two milestones, and a build that fails when a tenant-scoped table has no policy. It is not eliminated, and it should be revisited past roughly 500 tenants or the first customer who demands physical separation.

### ADR-002 · Supabase Auth over Clerk or Auth0

**Status:** accepted, matching the brief

One vendor covering auth, Postgres, storage and isolation, with the JWT and the database speaking the same language. `auth.uid()` inside a policy is the mechanism that makes RLS work cleanly; an external auth provider means propagating identity into the database yourself, which is exactly the kind of custom plumbing this budget cannot absorb.

**The cost, stated:** organisation modelling is ours to build. Supabase has no first-class notion of a tenant with members and roles, so `tenants`, `tenant_members` and the invitation flow are hand-built. That is roughly a week of M1 and M2 and it is already in the plan.

### ADR-003 · Row Level Security is the only isolation mechanism

**Status:** accepted. See `01 D-01`.

Not defence in depth. One mechanism, in the database, exhaustively tested. Two mechanisms produce two places to forget and a weaker policy justified by the other layer's existence.

The application does hold a tenant context, and it uses it to set the RLS session variable, not to filter. A `where tenantId = ...` in application code is a lint failure with a documented exception list that is currently empty.

### ADR-004 · Drizzle ORM alongside the Supabase client

**Status:** accepted

Drizzle owns schema, migrations and typed queries. The Supabase client owns auth and storage. They talk to the same Postgres.

The important detail: **Drizzle connects as an RLS-bound role, not as the service role.** The connection sets `request.jwt.claims` or an equivalent session variable per request so policies apply to Drizzle queries exactly as they do to PostgREST. A Drizzle client connected as the service role would silently bypass every policy in the system, which would be the single worst mistake available in this codebase. It is prevented by having two clearly named clients, `db` and `dbAsService`, and a lint rule on the import path of the second.

### ADR-005 · Entitlements as data, one guard, both doors

**Status:** accepted. Closes the brief's open question. See `01 D-04` and `08 §3`.

### ADR-006 · Upstash Redis, scoped to four uses, never a source of truth

**Status:** accepted

**Context.** Reading AI rules on every generated response is the first machine-driven read path at customer-message volume rather than dashboard volume. Without a cache each read costs a database round trip plus credential verification, well over 100ms on every assistant reply.

**Decision.** Upstash Redis, serverless, four uses only: compiled AI rules by tenant and version, entitlement snapshots, credential scope lookups, rate limit counters.

**The property that matters:** every one falls back to Postgres on a miss. The definition of done includes running the entire test suite with the cache disabled and every correctness property still holding. Only latency changes. That is a test, and it is the thing that keeps a cache from quietly becoming a database.

**Rejected:** in-memory caching in the Node process, because Vercel's execution model gives no useful cache locality across invocations.

### ADR-007 · Vercel, matching the brief

**Status:** accepted

Preview deployment per pull request, which pairs with a Supabase branch so a migration is tested against production shape before merge. The trade-off worth knowing: serverless means no long-running background process, so anything scheduled runs as a Vercel cron hitting a route. In Phase 1 that is only the credential last-used rollup, the invitation expiry sweep and the health check. If Phase 2 needs sustained background work, it needs a worker, and that is a Phase 2 line item rather than a surprise.

### ADR-008 · Secrets in Supabase Vault, never in application code

**Status:** accepted, matching the brief

Tenant API credentials are hashed, never stored recoverably. Vault holds platform-level secrets and any credential that genuinely must be decryptable, with access logged. Application environment variables hold only what Vercel must have at boot.

**Corollary:** a credential is displayed exactly once and never again, for anyone. `01 D-11`.

### ADR-009 · Soft delete and suspend, hard delete as a separate operation

**Status:** accepted, matching the brief. See `01 D-10`.

### ADR-010 · Polling with ETags for AI rules, not push

**Status:** accepted. See `01 D-06` and `08 §5`.

A conditional GET returning 304 with no body costs Brian's infrastructure almost nothing and costs Phase 2 one header. Webhooks would mean delivery guarantees, retries, signature verification and a dead-letter path, all built for a consumer that is polling anyway.

### ADR-011 · Seams are typed contracts with tables, and nothing above them

**Status:** accepted

Three seams. Each gets a table with full RLS, a typed interface, and a documented contract. None gets logic.

| Seam | Phase 1 delivers | Phase 2 owns |
|---|---|---|
| Knowledge base | `kb_document` and `kb_chunk` with pgvector, isolation, a model-identifier column | Embedding, chunking, retrieval, RAG |
| Customer records | `customer_record` with isolation, redaction, soft delete | Population, reading by the AI, retention |
| Channel adapters | `channel_connection` table, the adapter interface, the internal event shape, retry and idempotency rules | Every adapter, every webhook receiver |

The channel adapter contract is written and reviewed **at M0, before the schema is locked**, because that is the cheapest moment to discover a wrong assumption. It is a document in `12`, not code.

---

## 6. Consistency and concurrency

| Concern | Approach |
|---|---|
| Transactions | Drizzle transactions on every multi-table write. Provisioning is one transaction, always |
| Audit atomicity | The audit row is written inside the same transaction as the operation. Never after, never best-effort |
| Usage counters | Incremented inside the operation's transaction with a row lock, not by a periodic recount |
| Counter drift | A reconciliation job rebuilds counters from source rows and alerts on divergence |
| Concurrent settings edits | Optimistic locking via a `version` column. A conflict returns 409 with both versions |
| AI rules publishing | Version rows are immutable and append-only. Publishing sets a pointer, so a rollback is a pointer move |
| Invitation races | Unique index on tenant plus email for pending invitations |
| Idempotency | `Idempotency-Key` accepted on provisioning and credential creation. Stored with the response for 24 hours and replayed |
| Session revocation | Sessions are rows. Revocation is real and immediate, not a token expiry wait |

---

## 7. Security

### Controls

| Control | Implementation |
|---|---|
| Transport | TLS 1.3, HSTS with preload |
| Isolation | RLS on every tenant-scoped table. `06` |
| Service role | Server-side platform routes only, audited before each call, lint-guarded import path |
| Credentials | Argon2id hashed, prefix stored separately for lookup and display, never recoverable |
| Scopes | Checked before the handler runs, per `07 §8`. A key lacking a scope never reaches business logic |
| Sessions | httpOnly, Secure, SameSite=Lax. Separate cookie names for tenant and platform |
| Rate limits | Per IP and per key. 5 sign-in attempts per 15 minutes with progressive delay. Service door limited per credential per plan tier |
| Input | Zod at every boundary |
| Output | React escaping. No `dangerouslySetInnerHTML` anywhere in Phase 1 |
| Headers | Strict CSP with nonces, `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin` |
| Logs | Structured, correlation ID on every line, **redaction covering credentials, tokens, and every customer record field** |
| Dependencies | Lockfile committed, audit in CI |
| Platform admin | Session lifetime 8 hours. Two-factor recommended and quoted separately if Brian wants it in Phase 1 |

### What is not in Phase 1, and should be said out loud

Two-factor authentication for tenant users. SSO or SAML. IP allowlisting. Penetration testing by a third party. Retention and erasure automation.

The first four are normal for a Phase 1 foundation. The fifth is a flagged gap under `01 D-09` and it should be in Brian's own roadmap before his first regulated customer.

---

## 8. Observability

Switched on in **week 2**, not during hardening, because instrumentation is only useful with history behind it. The brief says this and it is right.

| Layer | Tool | Signals |
|---|---|---|
| Errors | Sentry | Exceptions with correlation ID and tenant ID, release tagging, source maps |
| Logs | Axiom | One structured line per request and per job. No secrets, no customer record fields, ever |
| Uptime | Better Stack | Synthetic checks on sign-in, the service door, and the health route |
| Status | Better Stack public page | Linked from `/status` |
| Database | Supabase metrics | Connections, slow queries, index usage |
| Cache | Upstash metrics | Hit rate, latency, memory |

### Alerts that page

Any cross-tenant read detected by the isolation suite in CI, which should never fire and is therefore the most important alert. Error rate above 2% over 5 minutes. Service door p95 above 800ms. Cache hit rate below 70%, which usually means invalidation is thrashing. Any tenant past due beyond the grace period. Database connections above 80%.

### The health page

`/platform/health`, owner only. Service status rows, database and cache metrics, error rate over 24 hours, tenants approaching a limit, tenants past due, and the most recent isolation suite result with a per-table breakdown. That last panel is unusual and it is the point: Brian should be able to see, on any given day, that the guarantee he sells is currently holding.

---

## 9. Environments and delivery

| Environment | Database | Purpose |
|---|---|---|
| Local | Supabase local or a branch | Development, seeded with three tenants |
| Preview | Supabase branch per PR | Every PR gets a URL and a database |
| Staging | Dedicated project | Boundary frame shows `STAGING` per `03 §8` |
| Production | Primary | PITR, restricted access |

CI on every pull request: typecheck, lint including the module boundary and service-role import rules, unit tests, **the isolation suite**, contract tests against the OpenAPI specification, Playwright on the critical paths, and an axe accessibility scan.

**A tenant-scoped table without an RLS policy fails the build.** That check is a script that reads the schema and the policy catalogue and compares them, and it runs before the tests.

Migrations are forward-only and backwards-compatible for one release. Data migrations run as scripts with progress and resumability.

---

## 10. Performance budget

From the definition of done plus what it implies.

| Surface | Budget |
|---|---|
| Tenant dashboard and settings, p95, 50 concurrent sessions | **under 400ms** (contractual) |
| Service door AI rules read, 304 path, p95 | under 60ms |
| Service door AI rules read, cache hit, p95 | under 120ms |
| Service door AI rules read, cold, p95 | under 350ms |
| Console tenant grid, 500 rows | under 1.2s |
| Command palette, open to results | under 120ms |
| AI rules edit to visible through the API | **under 5s** (contractual), measured |
| Marketing page LCP | under 2.0s |

The 400ms figure is a contractual gate and the load pass at M6 verifies it. The two five-second and 400ms numbers are the only performance claims Brian is buying; everything else is our own standard.

---

## 11. Failure modes

| Failure | Behaviour |
|---|---|
| Redis unavailable | Every read falls through to Postgres. Latency rises, correctness unaffected. Alert fires |
| Supabase Auth degraded | Existing sessions continue, new sign-ins fail with an honest message |
| Database unavailable | Read-only maintenance page, no partial writes |
| A policy check fails unexpectedly | Deny and log. **Never fall back to an unfiltered query** |
| Service door credential revoked mid-flight | 401 with a specific code so Phase 2 can distinguish it from a transient failure |
| Support session expires mid-action | The action fails with a specific code, the frame shows expiry, one click re-switches |
| Migration fails on deploy | Deploy halts, previous version continues serving |
| Isolation suite fails in CI | Merge blocked. No override, no exception path |
