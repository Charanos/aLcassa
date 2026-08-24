# 08 · Subscriptions, Entitlements and AI Rules

Requirements 3 and 8, plus the caching layer that the amendment made necessary.

---

## 1. What "no billing automation" means precisely

The brief is explicit: subscription structure, no billing automation. That boundary is worth drawing in code rather than leaving to memory, because it is the likeliest place for scope to creep.

**In scope:** plans, tiers, entitlements, limits, subscription lifecycle states, enforcement at the API boundary, usage counting, per-tenant overrides, and payment hooks stubbed.

**Out of scope:** connecting Stripe, Paystack or M-Pesa. Generating invoices. Taking a payment. Dunning. Proration. Tax.

**The stubs** are three nullable columns on `subscriptions`: `externalCustomerRef`, `externalSubscriptionRef`, `paymentProvider`. They exist so that connecting a gateway later is a service and a webhook rather than a migration and a data backfill. They are never populated in Phase 1.

Status transitions happen by platform action, not by payment event. Brian marks a tenant past due; nothing does it automatically. The interface says so plainly at `/app/billing`, per `02 §5`.

---

## 2. Plans and entitlements

Entitlements are rows. Adding a fourth tier between Business and Custom is inserting a plan and eight entitlement rows, with no deployment.

### The entitlement keys

Six at launch. Each has a `kind` of `limit` or `feature`.

| Key | Kind | Counts | Enforced at |
|---|---|---|---|
| `seats` | limit | Active members plus pending invitations | Invitation creation |
| `channels` | limit | Channel connections | Phase 2, guard present now |
| `api_keys` | limit | Active credentials | Credential creation |
| `kb_documents` | limit | Knowledge base documents | Phase 2, guard present now |
| `ai_rules_versions` | limit | Retained versions per tenant | Publish |
| `audit_retention_days` | limit | Days of audit history visible | Audit query |
| `conversations_monthly` | limit | Conversations in the current billing period | Phase 2, guard present now |
| `support_sla_hours` | limit | Not actually consumed by anything in Phase 1. See below | Never called. No handler invokes `checkEntitlement('support_sla_hours', ...)` |

**Added 24 Aug 2026,** confirming Brian's pricing page. Three of the original six enforce Phase 1 behaviour and three are seams; the two new keys follow the same seam pattern as `channels` and `kb_documents`, since there is no inbox yet to count a conversation against.

`support_sla_hours` is `kind: 'limit'` with the hour count in `limitValue`, not `kind: 'feature'`, because `plan_entitlements.featureEnabled` is a boolean and has nowhere to hold a number: the schema in `05 §5` offers exactly two value slots, an integer limit and a boolean flag, and an SLA hour count needs the former. What makes it display-only is not its `kind`, it is that nothing calls `checkEntitlement` against this key: there is no usage counter for it, no handler decrements it, and no Phase 1 action could breach an SLA in the first place. The `EntitlementRow` component renders it as a plain value, `Support response within {hours} hours` per `10 §6`, rather than a `LimitBar`, by checking the key rather than the `kind`. If a future entitlement genuinely needs a numeric feature value with enforcement, that is a schema change, not a convention, and should not be shortcut through this key as precedent.

**`seats` counts pending invitations.** Otherwise a tenant on five seats sends fifty invitations and exceeds the limit the moment they are accepted, at which point the only remedy is removing people who have already joined.

### Plan shape

**Confirmed 24 Aug 2026,** ahead of the week-four schedule, from Brian's pricing page. Replaces the four-tier proposal below it in this document's history.

| | Pro | Business | Custom |
|---|---|---|---|
| Price | KES 3,400 / month | KES 17,000 / month | Tailored |
| Seats | 1 | 10 | Unlimited |
| Conversations, monthly | 1,000 | 6,000 | Unlimited |
| Support SLA | 24 hours | 8 hours | 2 hours |
| Channels | 1 | 5 | Unlimited |
| API keys | 2 | 10 | Unlimited |
| Knowledge base documents | 100 | 1,000 | Unlimited |
| AI rules versions retained | 10 | 50 | Unlimited |
| Audit retention | 30 days | 90 days | 365 days |

**No free plan.** The prior four-tier proposal included one; the pricing page does not, and `§7` below already used `trialing` rather than a free tier as the entry state, so this removes a plan without touching the lifecycle.

Seats and the two headline prices come directly from the pricing page. Channels, API keys, knowledge base documents, AI rules versions and audit retention are **carried over from the equivalent rung of the prior proposal and are not on the pricing page**; they are marked here as still-proposed and worth a one-line confirmation from Brian rather than treated as agreed. `Custom` is priced by Ian directly and its non-seat limits are a starting point for that conversation, not a commitment.

Unlimited is `null` in `limitValue`, rendered as `∞` through `MathExpr` per `03 §9`, never as a full progress bar.

---

## 3. The entitlement guard

One function. Both doors. This closes the open question the brief raised.

```ts
export async function checkEntitlement(
  ctx: ResolvedContext,
  key: EntitlementKey,
  delta = 1,
): Promise<EntitlementDecision> {
  const snapshot = await getEntitlementSnapshot(ctx.tenantId);   // Redis, falls back to Postgres
  const ent = snapshot.byKey[key];

  if (!ent) return { allowed: false, code: 'entitlement.feature_unavailable' };
  if (ent.kind === 'feature') {
    return ent.enabled
      ? { allowed: true }
      : { allowed: false, code: 'entitlement.feature_unavailable' };
  }
  if (ent.limit === null) return { allowed: true };              // unlimited

  const projected = ent.current + delta;
  if (projected > ent.limit) {
    return { allowed: false, code: 'entitlement.limit_reached',
             details: { key, limit: ent.limit, current: ent.current } };
  }
  return { allowed: true, approachingLimit: projected / ent.limit >= 0.8 };
}
```

### The rule, written down at design lock

> Authentication and tenant resolution may differ between the session door and the service door. **Plan-limit enforcement may not.** Both paths call `checkEntitlement` with a `ResolvedContext` produced by their own resolver, and the decision is identical.

The contract test in `07 §12` drives the same scenario through both doors and asserts the same outcome. That test is the evidence, and it is why this can be presented to Brian as settled rather than as an intention.

**Amended 24 Aug 2026, per `04` ADR-012 and its ADR-005 amendment.** The service door now runs in FastAPI, not in the same Next.js runtime as the session door, so "both paths call `checkEntitlement`" is no longer literally one shared function. It is one specification, implemented once per runtime against the same tables and the same Redis snapshot, with sameness enforced by the cross-language conformance suite rather than by a shared call site. The rule above is unchanged as a requirement; what changed is how it is proven.

### Resolution order

For a given tenant and key:

1. A live `subscription_overrides` row, if one exists and has not expired.
2. The `plan_entitlements` row for the tenant's current plan.
3. Deny. There is no implicit default, because an implicit default is how an unlimited resource ships by accident.

### Counters

`usage_counters` is incremented inside the same transaction as the operation that consumed the resource, with a row lock. Never a periodic recount as the source of truth.

A reconciliation job runs nightly, rebuilds each counter from its source rows, and alerts on divergence rather than silently correcting it. Silent correction hides the bug that caused the drift. `05 I-13`.

### When a limit is hit

The response names the limit, the current usage and the path forward. `entitlement.limit_reached` carries `key`, `limit` and `current` in details, and the interface renders a specific message rather than a generic denial. Copy in `10 §6`.

At 80% the interface shows the `LimitBar` in ochre and the console watchlist picks the tenant up. That watchlist is one of the more commercially useful things in the console, since a tenant at 80% of their seats is a tenant about to upgrade.

---

## 4. AI rules

### The two levels

**Master rules** are a platform singleton, editable only by Brian, holding global instructions: tone, response guidelines, prohibited topics. One row, enforced by a unique index on a constant column, so a second set cannot be created by accident. `05 §7`.

**Tenant rules** are per-tenant business information, preferences and instructions, editable by a tenant's owner or admin, following exactly the same pattern as tenant settings.

Both are versioned, both are audited, both are readable through the service door.

### Precedence

**Confirmed 24 Aug 2026: layered, master wins on conflict.** See `01 D-08` for the full reading of Brian's answer, since it combines two of the candidate models in the table there. What follows was written as the layered recommendation and needs no change beyond the confirmation: `lockedFields` now defaults to locked rather than open, so a field is master-authoritative unless explicitly marked overridable.

```
compiled[field] =
  if master.locked.includes(field)      → master[field]
  else if tenant[field] is present      → tenant[field]
  else                                  → master[field]
```

With an additive case for fields that genuinely compose:

```
compiled.responseGuidelines = master.responseGuidelines + "\n\n" + tenant.responseGuidelines
compiled.prohibitedTopics   = union(master.prohibitedTopics, tenant.prohibitedTopics)
```

`prohibitedTopics` is a union rather than an override in every model, because a tenant should be able to add a prohibition and should never be able to remove a platform one. If Brian chooses a simpler precedence model overall, this field keeps the union behaviour anyway.

The compiled document carries `provenance` per field, so Phase 2 and the tenant interface can both show where a value came from. `07 §8`.

### Versioning and publishing

Version rows are append-only. A draft is a version row with `status = 'draft'`. Publishing sets `status = 'published'`, stamps `publishedAt`, and moves the pointer on the parent row.

Rollback is a pointer move to an earlier version. It creates an audit entry, does not delete anything, and does not create a new version number. Every historical version stays readable.

The `ai_rules_versions` entitlement caps retention. Beyond the cap, the oldest versions are archived rather than deleted, and the interface says how many are retained on this plan.

### The editor

`/app/settings/ai-rules`. Per `03 §9`:

- Field-by-field editing rather than one large textarea, because the compiled document has structure and a blob would make provenance meaningless.
- Fields locked by master rules render read-only with `LockedFieldNotice` showing the platform value and a plain explanation. Not hidden. A tenant should see what is being applied on their behalf.
- Version history with a `DiffView` between any two versions, line level, mono.
- Publish requires a change note. It is one field and it turns the version history into something readable six months later.
- After publish, a confirmation states that the change is live for the assistant, which is the thing the user actually cares about.

---

## 5. The read path and the five-second contract

The brief's stated contract: a rules change made in the dashboard is visible through the API within five seconds, measured rather than asserted.

### How it is met

```
Publish (session door)
  1. write version row, set pointer          ┐
  2. write audit row                          ├─ one transaction
  3. bump the tenant's rules version          ┘
  4. DELETE the Redis key for this tenant     ← before returning 200
  5. return 200
```

The next service-door read misses the cache, recompiles from Postgres, and returns a new ETag. Elapsed time is one round trip, well inside five seconds.

For a master rules publish, step 4 deletes every tenant's compiled key. With hundreds of tenants that is a pipeline of deletes; with tens of thousands it would need a version-prefixed key namespace instead. At Brian's stage the simple version is correct, and the key format `compiled:{tenantId}:{masterVersion}:{tenantVersion}` means a stale key is unreachable rather than wrong even if a delete fails.

### The worst case, stated in the documentation

Redis TTL is 300 seconds. If an invalidation fails entirely, the maximum staleness is five minutes. That number is published in the service-door documentation rather than hidden, because Phase 2 needs to know it to reason about behaviour after a rules change.

### Measurement

An automated test publishes a change, polls the service door, and asserts propagation under five seconds. It runs in CI and the result is quoted at the M4a gate. The brief says measured rather than asserted, so it is measured.

---

## 6. The caching layer

### The four uses, and nothing else

| Key | Contents | TTL | Invalidated by |
|---|---|---|---|
| `compiled:{tenant}:{mv}:{tv}` | Compiled AI rules document | 300s | Explicit delete on publish |
| `ent:{tenant}` | Entitlement snapshot with current usage | 60s | Explicit delete on plan change, override, or counter increment |
| `cred:{hash}` | Credential ID, tenant, scopes, status | 60s | Explicit delete on rotate or revoke |
| `rl:{key}:{window}` | Rate limit counter | window length | Expiry |

Adding a fifth use requires a note in this document. Caches accrete, and an uncontrolled cache is how a system becomes impossible to reason about.

### The property that makes it safe

**With Redis switched off entirely, every correctness property still holds. Only speed changes.**

Every read falls through to Postgres on a miss, and a miss and an outage are the same code path. The definition of done includes running the entire test suite with the cache disabled, and it is a real CI job rather than a claim:

```yaml
- name: Test suite, cache disabled
  env:
    CACHE_DISABLED: "true"
  run: pnpm test
```

`CACHE_DISABLED` makes every cache read return a miss and every write a no-op. If any test fails in that mode, something has started treating the cache as a source of truth and it is a defect.

### Why Redis at all

Stated plainly because it is a new dependency the client is paying for in complexity. Reading AI rules on every generated response is the first machine-driven read path in the system, running at the tenants' customers' message volume rather than at dashboard volume. Without a cache, each read costs a database round trip plus an argon2id verification, which is deliberately slow. That is well over 100ms added to every reply the assistant sends.

The argon2id detail is the one that is easy to miss. Password hashing is slow by design, and running it on the hottest path in the system at message volume would be the actual bottleneck, more than the query.

### Credential verification caching, carefully

Caching a credential lookup keyed on a hash of the presented key is safe because a revoked credential's cache entry is deleted synchronously on revocation, and the 60-second TTL bounds the worst case. Revocation is the operation where staleness matters most, so it invalidates before returning, exactly like a rules publish.

---

## 7. Subscription lifecycle

```
        provisioning
             │ tenant created
             ▼
        trialing ──trial ends──▶ active
             │                     │
             │                     │ marked past due by platform
             │                     ▼
             │                 past_due ──reactivated──▶ active
             │                     │
             │                     │ not resolved
             ▼                     ▼
        cancelled ◀──────────── expired
```

Every transition in Phase 1 is a platform action with an audit entry naming who made it and why. No automation, per the scope boundary.

**24 Aug 2026:** `trialing` is confirmed as the sole entry state; there is no free plan for a subscription to sit in indefinitely, matching `§2`'s three-tier catalogue. A trial that is not converted moves to `expired` rather than lingering, per the diagram above.

`past_due` applies the read-only suspension behaviour **confirmed** in `06 §8` rather than blocking sign-in, so a customer can see and fix their situation.

Cancellation at period end is a flag, not an immediate state change. The tenant keeps access until `currentPeriodEnd`, and the interface shows the date.

---

## 8. What the tenant sees

`/app/settings/subscription`:

- Current plan, status badge, period end.
- Every entitlement as an `EntitlementRow` with a `LimitBar`: name, current, limit, ochre at 80%, oxide at limit, `∞` for unlimited.
- Any active override, with the reason, because a customer who has been granted extra seats should know it and should know it might expire.
- A read-only statement of how payment works currently, and the contact route.
- No upgrade button in Phase 1. There is nothing behind it, and a button that opens an email client is worse than a sentence saying to get in touch.

## 9. What Brian sees

`/platform/tenants/[id]`, the plan band:

- Current plan with a change control, showing the affected entitlements before commit.
- Usage against every limit, with the same `LimitBar` component.
- Override management with a mandatory reason and an optional expiry.
- Subscription state with the transition controls and an audit trail of every past change.

`/platform` overview and `/platform/health` both carry the **watchlist**: tenants above 80% on any limit, and tenants past due. Sorted by how close they are. That list is the closest thing this Phase 1 has to a revenue feature, and it costs one query.
