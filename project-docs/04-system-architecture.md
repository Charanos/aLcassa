# 04 · System Architecture

**Shape:** one Next.js application on Vercel, one FastAPI service on its own host, one Supabase project, one Upstash Redis instance. Two services in Phase 1, not one, per `01 D-14` and ADR-012 below.

---

## 1. Container view

**Revised 24 Aug 2026, per `01 D-14` and ADR-012.** FastAPI moves from the CLIENTS box into its own service, owning the door it was always contracted for. AGNO becomes its client rather than Next.js's.

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                                 │
│  Browser (tenant users)   ·   Browser (platform owner)                   │
│  AGNO (machine, Phase 2 consumer, reads AI rules through FastAPI)        │
└─────────┬──────────────────────────────────────────────┬─────────────────┘
          │ HTTPS, session cookie                         │ HTTPS, API key
┌─────────▼──────────────────────────────────────────────┐│
│  VERCEL EDGE                                            ││
│  WAF · rate limiting · middleware: session → tenant      ││
└─────────┬────────────────────────────────────────────────┘│
          │                                                 │
┌─────────▼───────────────────────────────────┐   ┌─────────▼───────────────┐
│  NEXT.JS 15 APPLICATION                      │   │  FASTAPI SERVICE        │
│                                               │   │  (Andishi-built,        │
│  ┌─────────────────────────────────────────┐ │   │   Phase 1, own host)    │
│  │ (marketing)·(access)·(tenant)/app·       │ │   │                        │
│  │ (platform)/platform                      │ │   │  /service/v1/*         │
│  └─────────────────────────────────────────┘ │   │  auth guard (key)      │
│  ┌─────────────────────────────────────────┐ │   │  → tenant resolver     │
│  │ API LAYER — session door, /api/v1/*      │ │   │  → entitlement guard   │
│  │  auth guard → tenant resolver →          │ │   │  → handler             │
│  │  entitlement guard → handler →           │ │   │  → audit writer        │
│  │  audit writer                            │ │   │                        │
│  └─────────────────────────────────────────┘ │   │  Same five entitlement │
│  ┌─────────────────────────────────────────┐ │   │  keys, same RLS        │
│  │ MODULES                                  │ │   │  binding contract as   │
│  │  tenancy identity membership             │ │   │  the session door,     │
│  │  subscriptions entitlements credentials  │ │   │  proven identical by   │
│  │  airules audit platform support health   │ │   │  the conformance suite │
│  │  seams(kb, customer-records, channels)   │ │   │  in `07 §12`.          │
│  └─────────────────────────────────────────┘ │   │                        │
│  ┌─────────────────────────────────────────┐ │   └───────────┬────────────┘
│  │ Shared: db client·rls context·logger·    │ │               │
│  │ result types · errors                    │ │               │
│  └─────────────────────────────────────────┘ │               │
└────┬──────────────────────┬───────────────────┘               │
     │                      │                                   │
     ▼                      ▼                                   ▼
┌─────────────────┐   ┌──────────────────┐   ┌──────────────────────────┐
│ SUPABASE        │   │ UPSTASH REDIS    │   │ OBSERVABILITY            │
│ Postgres + RLS  │◀──┤ 4 scoped uses    │──▶│ Sentry · Axiom           │
│ Auth · Storage  │   │ never truth      │   │ Better Stack · status    │
│ Vault · pgvector│   └──────────────────┘   │ (both services report in)│
└─────────────────┘                          └──────────────────────────┘
                    ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
                      PHASE 2 SEAM · channel adapter interface
                    │  WhatsApp   Instagram   Messenger   Widget    │
                     ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

Both services share one Postgres, reached through the same RLS contract (ADR-004 below), and one Redis, scoped to the same four uses (ADR-006). Nothing about the database or cache design changes; what changes is that a second runtime now sits in front of one door of it.

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

**Amended 24 Aug 2026, per `01 D-14`.** "Implemented once" held while one runtime served both doors. With FastAPI now owning the service door, stages 2, 4 and 6 are implemented once per runtime rather than shared by function call, and "identical" is enforced by a cross-language conformance suite instead of by construction. See ADR-005 amendment and ADR-012 below, and the test in `07 §12`.

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
   │                ├─create default subscription (trialing, no free plan) │
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

**Relabelled 24 Aug 2026.** FastAPI is now the service door itself, not a caller of it. AGNO calls FastAPI; FastAPI calls Redis and Postgres directly, in its own runtime.

```
AGNO            FastAPI (service door)     redis          postgres
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

The publish still happens on the Next.js side, inside the session-door transaction in `08 §5`. It is the read that has moved runtime, not the write.

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

**Amended 24 Aug 2026, per ADR-012.** "One guard" no longer means one function shared across a single Next.js runtime; it means one specification, `checkEntitlement(tenant, key, delta)`, implemented once in Next.js for the session door and once in FastAPI for the service door, against the same `plan_entitlements` and `usage_counters` tables and the same Redis snapshot format. Sameness is no longer structural, it is tested: the M3 gate still drives one scenario through both doors and asserts an identical decision, per `07 §12`, but that test is now a cross-language conformance suite rather than proof by shared code path. This is a weaker guarantee than one function in one runtime, honestly stated, and it is why the conformance suite is a permanent CI job rather than a one-time check.

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

### ADR-012 · FastAPI owns the service door in Phase 1

**Status:** accepted, 24 Aug 2026. See `01 D-14`.

**Context.** Brian's original specification, stated before Phase 1 began, was FastAPI as the backend with all data access routed through it. The approved Project Brief Rev 3.1 and every document produced against it instead named Next.js and Supabase as the stack, with FastAPI placed as a consumer of this platform's service door, consistent with `01 §3 A4`'s description of it as "the machine" and `02 §7`'s namespace table. Both positions are real: the brief that was signed says one thing, and Brian's recollection of what he asked for says another. This ADR is the resolution, not an attempt to decide who was right.

**Options.**

| | A · FastAPI stays a consumer | B · FastAPI as edge proxy only | C · FastAPI owns the service door | D · Full data-plane migration |
|---|---|---|---|---|
| What moves | Nothing | FastAPI forwards to Next.js, adds no logic | FastAPI implements auth, tenant resolution, entitlement guard and audit for `/service/v1/*` | Every route, including the dashboard, moves behind FastAPI; Next.js becomes presentation only |
| Matches the signed brief | Yes | Partially | Partially, in spirit | No |
| Matches what Brian says he asked for | No | Barely | Partially | Yes |
| Engineering cost | None | Small, and it duplicates a hop for no behaviour | Medium: a second implementation of the RLS binding, the entitlement guard and the audit writer, proven identical by a conformance suite | Large: the whole request pipeline, in a second language, including the session-cookie doors |
| Risk to the nine-week fixed fee | None | Low | Contained, if scoped to the three existing service-door endpoints | High. This is the re-baseline in option D of the client-facing decision |

**Decision: C.** FastAPI becomes a real, Andishi-built service for Phase 1, implementing exactly the three endpoints already specified in `07 §8`: `GET /service/v1/ai-rules`, `GET /service/v1/tenant`, `GET /service/v1/health`. It authenticates the API key, resolves the tenant from the credential, calls the same entitlement guard specification as the session door, reads and writes the same Redis keys under the same TTLs (`08 §6`), and writes to the same `audit_log` and `platform_audit_log` tables Postgres already defines. The session-door dashboard, `/api/v1/*` and `/api/platform/v1/*`, stays on Next.js.

**Why not A.** It is the cheapest answer and it is the wrong one here: it treats a documented disagreement with the client as if restating the existing design settles it. It does not; it just repeats the position he is objecting to.

**Why not D.** A full data-plane migration inside the current fee and timeline would mean cutting the isolation suite, the auth work, or the documentation set to make room for reimplementing the entire request pipeline in a second language. Given `01 D-01`'s decision that isolation is not to be diluted, and `12`'s treatment of documentation as a contracted deliverable, neither is available to cut. Option D is real and it may be exactly what Brian wants; it is priced separately rather than absorbed silently.

**The honest cost of C, stated plainly.** Two runtimes now share one Postgres and one Redis. The RLS session-binding mechanism in ADR-004 must be reproduced correctly in Python, not merely called; a mistake there is the single worst mistake available in this codebase, per ADR-004's own wording, and it is now possible in two languages instead of one. The thirty-minute onboarding test in `12 §5` now spans two runtimes and two dependency ecosystems, which is new risk to a contractual gate and is called out in `12 §5` rather than discovered at handover. Deployment, environment configuration and CI both roughly double for this one door.

**What C does not resolve.** Whether the dashboard itself should eventually sit behind FastAPI, which is Brian's request read literally, stays open as a scoped and separately priced change note rather than folded into Phase 1's fixed fee.

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

**Rate limiting, corrected 28 Aug 2026.** `§1` places rate limiting at the edge, before session resolve. It did not exist: `CACHE_USES.rateLimit` and its TTL had been in the cache module since it was written, listed as one of the four uses ADR-006 permits, and nothing ever called them. It is now applied to the five public entry points — sign-in, password forgot, password reset, invitation read and invitation accept — with the tightest budgets on the two that send email or create an account.

**It fails open.** `CACHE_DISABLED` is a supported mode with a CI job dedicated to proving the product works in it, so a limiter that failed closed would take sign-in down whenever the cache blinked, converting a latency problem into an outage. Rate limiting is a mitigation; correctness is the policies, and they do not depend on Redis. A test asserts the fail-open behaviour specifically, because it is the property a future edit is most likely to "fix".

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

**Corrected 28 Aug 2026.** `@sentry/nextjs` had been a dependency for months and was never initialised — no `instrumentation.ts`, no configuration, no DSN. Every production exception would have gone nowhere, while this document and the tracker both described error tracking as wired. It now initialises for all three runtimes (node, edge, browser).

**An error report is an exfiltration path.** `05 I-16` keeps customer fields out of logs; a crash report is a log with a wider audience, read by whoever holds a Sentry seat rather than by whoever holds database access. So the same `redact()` that guards the logger guards the event payload: request bodies redacted, headers **dropped** except the correlation id — the header carrying something is the one nobody thought of — query strings replaced entirely because recovery and invitation tokens travel in them, and the user object reduced to an opaque id. `sendDefaultPii` is off rather than scrubbed after the fact.

**Session replay is deliberately not enabled.** It would record a customer's workspace — their team, their settings, their messages — and ship it to a third party. `01 D-09` makes Brian a processor for his tenants' data, and that is not a decision to take on his behalf to make debugging easier.

**`GET /api/health`** is the probe target, added the same day; there was previously nothing for an uptime service to poll. It reports database reachability and cache status, distinguishing them: the database is required and its absence returns 503, while the cache is optional by design (`08 §6`) and its absence is reported without failing the check. It checks that the SCHEMA is present rather than that `select 1` answers, because the failure that actually happens is a deploy reaching an unmigrated database.


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
| Local | Supabase local or a branch | Development, seeded with three tenants. FastAPI runs alongside Next.js, both pointed at the same local database |
| Preview | Supabase branch per PR | Every PR gets a URL and a database. The FastAPI service deploys as its own preview per PR |
| Staging | Dedicated project | Boundary frame shows `STAGING` per `03 §8` |
| Production | Primary | PITR, restricted access |

**Added 24 Aug 2026, per ADR-012.** The FastAPI service is a second deployable with its own environment variables (`DATABASE_URL`, the Redis connection, the argon2id parameters) and its own release, versioned independently of the Next.js application. A migration still runs once, against the shared database, before either service's deploy proceeds.

### Continuous integration

**Corrected 28 Aug 2026.** This section previously described a CI pipeline that did not run at all. The workflow called `pnpm install --frozen-lockfile` while the repository contained only `package-lock.json`; pnpm exits immediately when asked for a frozen install with no `pnpm-lock.yaml`, so every job failed at the install step and always had. The isolation suite this document calls "blocking with no override path" had **never executed in CI**. It passed throughout, run by hand, but the enforcement was not there. See `15 · C44`.

The list below is now what the workflow actually contains, and nothing else. Work that is planned but not built is in the outstanding table underneath rather than described as though it runs.

| Job | What it gates |
|---|---|
| `static` | `typecheck`, `lint` (including the module-boundary and service-role import rules), `format:check` |
| `build` | `next build`. Added 28 Aug — a type error is a failed build per `11 §6` rule 19, which is only true if the build runs. It did not, so a broken build could reach `main` with every other job green. Runs with placeholder environment values of the correct shape: a build must never need real secrets |
| `isolation` | `check:policies`, then the isolation suite, then usage reconciliation in report mode. A tenant-scoped table without a policy fails here in ten seconds rather than after a full suite |
| `tests` | The whole vitest suite against a migrated, seeded database |
| `cache-disabled` | The same suite with `CACHE_DISABLED=true`, proving definition-of-done condition 9 |
| `audit` | `pnpm audit --audit-level moderate`. Vulnerable transitive dependencies are pinned in `pnpm-workspace.yaml` with the advisory each pin resolves |

**Outstanding, and named here rather than implied elsewhere:** contract tests against the OpenAPI specification, Playwright on the critical paths, an axe accessibility scan, and the cross-language conformance suite driving one entitlement scenario through both doors. None exists. The conformance suite in particular is blocked on the FastAPI service door itself (ADR-012).

**A tenant-scoped table without an RLS policy fails the build.** That check is a script that reads the schema and the policy catalogue and compares them, and it runs before the tests.

### Migrations and rollback

Migrations are forward-only and backwards-compatible for one release. Data migrations run as scripts with progress and resumability.

**There is no automated rollback, and that is a decision rather than an omission.** `db:migrate` runs `drizzle-kit migrate` and then applies the policy catalogue, as one command, so tables and their policies can never be applied separately. Drizzle emits no down-migrations, and a generated one would be a guess about intent — dropping a column to reverse an addition destroys whatever was written to it in the meantime.

The recovery path is therefore forward: write a new migration that undoes the change, or restore from point-in-time recovery, which the production project has. Both are slower than a rollback command and neither can silently lose data. The one-release backwards-compatibility rule is what makes this workable: a deploy can always be reverted to the previous application version without touching the schema.

### Scheduled work

ADR-007 notes that the serverless model gives no long-running process, so anything scheduled is a cron hitting a route. In Phase 1 there is exactly one: `/api/cron/reconcile` at 02:00 daily, declared in `vercel.json`.

It **reports and never repairs**, per `08 §3`. Repair is a CLI command requiring a named platform admin and a stated reason, and a scheduler can supply neither. The route authenticates with `CRON_SECRET` as a bearer token and answers 404 — not 401 — to anything else, including when the secret is unset: an unconfigured cron endpoint that answered would be an unauthenticated report on every workspace's usage.

---

## 10. Performance budget

From the definition of done plus what it implies.

| Surface | Budget |
|---|---|
| Tenant dashboard and settings, p95, 50 concurrent sessions | **under 400ms** (contractual) |
| Service door (FastAPI) AI rules read, 304 path, p95 | under 60ms |
| Service door (FastAPI) AI rules read, cache hit, p95 | under 120ms |
| Service door (FastAPI) AI rules read, cold, p95 | under 350ms |
| Console tenant grid, 500 rows | under 1.2s |
| Command palette, open to results | under 120ms |
| AI rules edit (Next.js) to visible through the API (FastAPI) | **under 5s** (contractual), measured |
| Marketing page LCP | under 2.0s |

The 400ms figure is a contractual gate and the load pass at M6 verifies it. The two five-second and 400ms numbers are the only performance claims Brian is buying; everything else is our own standard. **24 Aug 2026:** the service-door budgets above are unchanged in target now that FastAPI implements them; moving the door to a purpose-built service is expected to help these numbers, not threaten them, since the alternative was the same work done inside a serverless Next.js function.

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
| FastAPI service unavailable | Service door returns 503. AGNO's fallback behaviour on a 503 is Phase 2's concern, but Phase 1 makes the failure honest rather than a hang: no partial reads, no silent fallback to a cached value past its TTL |
| The two runtimes disagree on an entitlement decision | Should never happen if the conformance suite is green. If it does in production, treat it as a severity-1 incident, not a rounding difference: it means the two implementations of `checkEntitlement` have drifted |
| Postgres connection budget shared across two services | Each service's pool is sized down accordingly at deploy time. Monitored under the existing "Database connections above 80%" alert in `04 §8`, now watching both services' combined usage |
