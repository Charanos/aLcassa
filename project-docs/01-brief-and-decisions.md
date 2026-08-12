# 01 · Brief and Decision Log

**Engagement:** Phase 1, platform foundation
**Source of truth for scope:** Project Brief Rev 3.1, 29 July 2026
**Status:** internal working document, not client-facing

---

## 1. What is being built

The platform layer beneath a customer support inbox. Tenancy, authentication, subscriptions, an owner console, AI rules with a machine-readable path, two storage seams, health monitoring, and the documentation to hand all of it on.

Ten requirements, taken from the brief and restated in the order they will be built rather than the order they were sent.

| #   | Requirement                                          | Milestone               |
| --- | ---------------------------------------------------- | ----------------------- |
| 1   | Multi-tenant architecture, isolated per tenant       | M1                      |
| 2   | Auth: login, reset, sessions, roles, invitations     | M2                      |
| 3   | Subscription structure, no billing automation        | M3                      |
| 8   | Master and tenant AI rules, readable via API         | M3, M4a                 |
| 4   | Platform console with separate owner login           | M4                      |
| 5   | Tenant settings, company profile, secure credentials | M5                      |
| 9   | Knowledge base and customer record seams             | M4a                     |
| 6   | Logging, errors, audit trail, secrets                | Throughout              |
| 10  | Platform health monitoring                           | M6                      |
| 7   | Documentation for every part                         | Throughout, gated at M6 |

## 2. What is deliberately not being built

Channel integrations and webhook receivers. The agent inbox, threading, assignment, routing. Payment gateway integration. Analytics dashboards, canned replies, chatbots, AI assist. Native mobile. Embedding generation, retrieval, RAG. Population or reading of customer records by the AI. Retention and erasure automation.

That last one is a **known gap, flagged rather than omitted**. It becomes necessary the first time a tenant operates somewhere with data erasure rights, and it is cheaper to build on a finished foundation than alongside one.

## 3. Who uses this

Four audiences. Only two of them are humans using an interface every day.

**A1 · The tenant owner.** Runs a small business. Signed up, pays, invites their team, sets the company profile, holds the API credentials, and edits their AI rules. They will use this product for twenty minutes in week one and five minutes a month afterwards, which is exactly why onboarding has to be right and why nothing else needs to be delightful.

**A2 · The tenant admin and agent.** Invited. In Phase 1 they can sign in, see the team and read the settings their role permits. Their real workspace, the inbox, does not exist yet. **This is a design problem, not just a scope note:** an agent who logs in and finds an empty product will assume it is broken. See D-05.

**A3 · Brian, the platform owner.** The only user of the platform console. Creates and suspends tenants, assigns plans, edits master AI rules, watches health, and steps into a tenant to support them. He is the power user and the console should be built for keyboard and density.

**A4 · The machine.** FastAPI and AGNO, holding a machine-to-machine credential, reading AI rules on every generated response. Not a person, and the highest-volume caller in the system by a wide margin. It gets a designed contract in `07 §8`, not an afterthought endpoint.

## 4. Naming

The product has no name in the brief. It is referred to as "a customer support SaaS" throughout.

**aLcassa** is the codename for the design system and this document set, not a proposed product name. It describes the thing accurately: the layer that carries messages between systems without being the message. If Brian wants a product name later, only `03 §22` and a handful of strings in `10` change.

Ask him at design lock whether a name and any brand assets exist. If they do not, the interface ships with the placeholder mark in `03 §22` and looks deliberate rather than unfinished.

---

## 5. Decision log

Twelve decisions. Where I disagree with an implication of the brief, I have said so and built the alternative.

### D-01 · Row Level Security is the isolation mechanism, and the application never becomes a second one

Every tenant-scoped table carries `tenant_id` and a policy. The application resolves `tenant_id` server side from the session and the membership record, never from anything the browser sent. A table without a policy fails the build.

The temptation, three weeks in, will be to add a `where tenantId = ...` filter in the application layer "for safety". **Resist it.** Two enforcement mechanisms means two places to forget, and a defence-in-depth argument that quietly becomes an excuse for a weaker policy. One mechanism, in the database, tested exhaustively. Detail in `06`.

### D-02 · The service role key is for managing tenants as records, never for reading their data

It exists in a small number of server-side platform routes: provisioning, suspension, plan assignment. It never appears in a route that reads a tenant's day-to-day content. Every call it makes writes an audit entry before the operation, not after.

This is enforced by a lint rule on the import path, not by discipline. `06 §7`.

### D-03 · Support mode is a scoped session, not a bypass

The organization switcher mints a session where `tenant_id` resolves to the target tenant and the role resolves to a limited support role. Brian is then bound by the same policies as the tenant's own agents. The brief states this and it is the single best decision in it, so it gets built exactly as written rather than shortcut under time pressure.

Two audit writes per action, a persistent boundary frame, thirty-minute inactivity timeout. `09 §3`.

### D-04 · Entitlements are data, and one guard answers for both doors

Plans, tiers and limits live in tables. A Growth tier with 15 seats and 3 channels is a row.

Requests arrive through two doors: a session cookie from a browser, an API key from the service. Authentication and tenant resolution differ between them, legitimately. **Plan-limit enforcement does not.** Both paths call the same `checkEntitlement()` function, and this is written down as an explicit rule at design lock rather than left implicit in a diagram. The brief raises this as an open question; the answer is one guard, and it should be closed at M0. `08 §3`.

### D-05 · The empty product problem needs a designed answer

Phase 1 ships a working account for a product whose main surface does not exist. An agent signs in and finds settings and a team list.

Three options: hide non-owner roles until Phase 2, which contradicts the B2B day-one assumption. Ship an empty inbox shell, which is scope creep. Or **state the situation honestly in the interface**: a designed placeholder for Messaging Inbox and Billing that explains what is coming and roughly when, rather than a dead link or a `#`.

The brief already asks for placeholder links. This decision is that they are designed surfaces with real copy, costing perhaps four hours, rather than disabled nav items. `02 §5`, copy in `10 §7`.

### D-06 · The AI rules read path is designed for polling, not for cleverness

Phase 2 will read rules on every generated response. The contract in the brief is: a change is live within five seconds.

Implementation: strong ETag on the rules resource, `Cache-Control` with a short max-age, and a conditional GET that returns `304` with no body in the overwhelming majority of cases. Invalidation is explicit on write rather than left to expiry. Redis holds the compiled rules document keyed by tenant and version.

**No webhooks, no push, no subscription channel.** Polling with ETags is the correct answer at this scale, it is trivially debuggable, and it fails safe. `08 §5`.

### D-07 · Redis is scoped to four uses and the system is correct without it

Compiled AI rules by tenant. Entitlement snapshots. Credential scope lookups. Rate limit counters. Nothing else.

Every one of those has a database fallback on miss. The definition of done includes running the full suite with the cache disabled, and this is a real test rather than an assertion. `08 §6`.

### D-08 · Master and tenant AI rules need a precedence rule before the schema is locked

The brief lists this as blocking for week one and it is. Three candidate models, and they produce different tables:

| Model           | Behaviour                                                                                      | Cost                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **Master wins** | Platform rules override tenant rules on conflict                                               | Simple, and tenants will be surprised by it                            |
| **Tenant wins** | Tenant rules override master on conflict                                                       | Simple, and Brian loses the ability to enforce anything                |
| **Layered**     | Master is the base, tenant appends, specific fields are marked non-overridable by the platform | More work, and it is the one that survives contact with real customers |

**Recommendation: layered.** Master rules carry a per-field `overridable` boolean. Tenants can change what is permitted and see plainly what is not. It costs perhaps a day more than the naive options and it removes an entire category of future support conversation.

Get Brian's answer before M0 closes. `08 §4`.

### D-09 · Customer records are personal data belonging to someone twice removed

The customer records seam holds information about a tenant's customers. That is one step further from us than anything else in the schema, and the brief says so plainly.

Phase 1 obligations, all small and all now: extend log redaction to those fields, provide a soft-delete column, apply the same isolation suite, and never let an ingestion-scoped credential read them. Phase 2 obligation, flagged and quoted separately: retention and erasure.

Also worth saying to Brian in writing: under the Kenyan Data Protection Act 2019 he is a data processor for his tenants and they are controllers for their customers. That relationship should be documented in his terms before he signs his first customer. It is not our deliverable and it is our responsibility to raise. `06 §9`.

### D-10 · Soft delete and suspend, with hard delete as a separate deliberate operation

Tenants, users and credentials are suspended or soft-deleted. Hard delete exists as a distinct platform operation with its own confirmation, its own audit entry and its own runbook page. Recovery and audit obligations both need this, and an accidental irreversible delete on a multi-tenant platform is the kind of incident that ends a vendor relationship.

### D-11 · Every credential is write-only from the interface, permanently

An API credential is displayed exactly once, at creation. After that the interface shows a masked prefix, the scopes, the created date and the last-used timestamp. There is no reveal, for anyone, including the person who created it and including Brian.

The definition of done tests this from every application route. Rotation replaces; it never re-reveals. `05 §6`.

### D-12 · The colour system carries real load, unlike the last project

Worth stating because the house style leans monochrome. This is a dense operational console where a person needs to distinguish tenant status, plan tier, subscription state, credential health, service status and audit severity at a glance, often in a table. Restricting colour to a rare signal would make it harder to use, not more elegant.

So aLcassa uses colour functionally and systematically, with a disciplined palette and a strict semantic mapping. The restraint moves to form: one weight of type, no shadows below the overlay layer, no decoration. `03 §3`.

---

## 6. Risks, restated with what we do about them

| Risk                                                             | Response                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A policy gap leaks data across tenants                           | Automated isolation suite in CI covering every table, plus manual policy review at M1 and M6. A new table without a policy fails the build                                                                                                  |
| Phase 2 reveals a wrong foundation assumption                    | The adapter contract is written and reviewed at M0, before the schema is locked. `04 §9`                                                                                                                                                    |
| Plan changes mid-build                                           | Entitlements are data. A tier change is a row                                                                                                                                                                                               |
| Phase 2 picks a different embedding model                        | The vector column records which model produced it. Confirming the model in week 1 avoids the problem entirely                                                                                                                               |
| A stale cache serves outdated AI rules                           | Invalidation is explicit on write. Contract: five seconds normally, 300 seconds worst case, stated in the API docs                                                                                                                          |
| Customer personal data reaches a log or an over-broad credential | Redaction covers those fields, scopes prevent an ingestion key from reading them                                                                                                                                                            |
| **Scope drift through helpfulness**                              | Added by me, and it is the likeliest risk on a fixed-fee engagement. Every request outside sections 02 and the amendment goes through the change note process before any code is written. Nine weeks with two developers has no slack in it |

## 7. Definition of done

Verbatim from the brief, because these are the acceptance criteria and paraphrasing them would be a mistake. Thirteen conditions, each verifiable rather than a matter of opinion. Reproduced in `11 §4` with the test that proves each one.

## 8. What Brian owes us, and when

| Item                                          | When            | Blocks              |
| --------------------------------------------- | --------------- | ------------------- |
| Written approval of the brief                 | Before kick-off | Everything          |
| Supabase organisation access                  | Week 1          | M1                  |
| GitHub organisation access                    | Week 1          | M1                  |
| Embedding model Phase 2 will use              | Week 1          | M4a seam            |
| Precedence between master and tenant AI rules | Week 1          | M4a, and the schema |
| Confirmed plan tiers with limits              | Week 4          | M3                  |

## 9. Questions to close at design lock

Beyond the six above. Each one changes a table or a policy, so none of them can wait.

1. **What exactly can the support role see and do?** The brief says read-only by default, exact permissions confirmed at design lock. That confirmation is a table, not a sentence. Propose the matrix in `09 §4` and get it signed.
2. **Is there a product name and any brand assets?** If not, the placeholder mark ships.
3. **Does a tenant owner's email need to be unique across the platform, or can one person own two tenants?** This changes the membership model and it is much cheaper to answer now.
4. **What happens to a tenant's data on suspension?** Read-only, fully blocked, or a grace period. Affects the policy, not just the flag.
5. **Are the API credentials per-tenant or per-integration?** The brief implies per-tenant. Per-integration is better and costs a column now, a migration later.
6. **Does Brian need more than one platform admin?** `platform_admins` is already a table. If the answer is yes, roles within it need defining now.
