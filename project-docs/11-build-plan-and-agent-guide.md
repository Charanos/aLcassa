# 11 · Build Plan and Agent Operating Guide

Sections 1 to 5 plan the work against the brief's milestones. Sections 6 onward are the operating contract for coding agents.

---

## 1. Milestones

Nine working weeks, two developers, mapped exactly to the brief so a gate here is a gate there and a payment trigger is unambiguous.

### M0 · Design lock · week 1

ERD, RLS policy map, API contract, role matrix, architecture decision records. **Plus three things the brief lists as blocking and one I am adding:**

- ~~The channel adapter contract and internal event shape, reviewed and signed.~~ **Written, 24 Aug 2026: `16 · Channel Adapter Guide`, with the interface at `src/modules/channels/types.ts` and the webhook route shell returning 501. Awaiting signature.** `07 §11`
- ~~The AI rules precedence model, confirmed.~~ **Done, 24 Aug 2026: layered, master wins on conflict.** `01 D-08`
- ~~The embedding model Phase 2 will use, confirmed.~~ **Done, 24 Aug 2026: OpenAI `text-embedding-3-small`.** `05 §8`
- **The support role matrix, signed.** `09 §4`. **Done, 24 Aug 2026, though signed differently than proposed: read and write, not read-only, per `01 D-13`.** The brief deferred this to design lock without naming it as an artefact, and it needed to be a table with a signature because it generates test cases; it still does, and the isolation suite's support-mode cases need regenerating against it.

**Also closed at M0, not originally listed here:**

- **The plan tiers**, `08 §2`, confirmed 24 Aug 2026, three weeks ahead of the week-4 schedule this document originally set for them.
- **The brand palette**, approved 24 Aug 2026. No token change; confirms the resolution already recorded in `15 §1`.
- **The FastAPI boundary**, `01 D-14` and `04` ADR-012, resolving a conflict between what Brian says he specified before Phase 1 and what the signed brief and this document set describe. Not one of the brief's original blocking items; raised by Brian on 24 Aug 2026 and closed the same day with a scoped answer rather than a full re-baseline. See `§1`'s new M3/M4a entry below.

**Gate:** Brian approves before any code. **Every M0 artefact is now written.** The channel adapter contract was the last one outstanding and is drafted as `16`, with a sign-off block at its end. What remains for this gate to close is signature rather than work: `16 §9` signed, and written approval of the brief itself.

### M1 · Tenancy core · weeks 2 to 3

Schema and migrations, RLS on every table, provisioning, the isolation suite, CI, staging. Observability switched on in week 2, not at hardening.

**Gate:** demo showing tenant A provably unable to read tenant B. The isolation suite runs live, on screen, with its per-table breakdown. **This gate releases tranche 2, so it is demonstrated rather than reported.**

### M2 · Auth and access · week 4

Sign-in, password reset, sessions and revocation, invitations, the role model, ownership transfer.

**Gate:** demo of the full account lifecycle: provision, invite, accept, change role, remove, transfer ownership, revoke a session.

### M3 · Subscriptions · week 5

Plans, tiers, entitlements, subscription states, the shared guard. **The caching layer and scoped credentials land alongside**, per the amendment.

**Gate:** demo of limit enforcement, driven through both doors, showing an identical decision. That demonstration closes the brief's open question in front of the client rather than in a document.

### M4 · Platform console · week 6

Owner login, tenant management, plan assignment, platform metrics, the organization switcher, support sessions, the boundary frame.

**Gate:** demo of console operations including a support session start to finish, showing both audit trails. **Releases tranche 3.**

### M5 · Tenant settings · week 7

Company profile, team management, the encrypted credential store, the reveal-once flow, rotation.

**Gate:** demo of secrets auditing. Specifically: create a credential, see it once, confirm it is unreadable everywhere afterwards including as the creator and including from the console.

### M4a · AI rules and seams · week 7, parallel

Master and tenant rules, versioning, the compiler, the service door with scopes, ETag support, the knowledge base and customer record tables with isolation.

**Gate:** a rules edit made in the dashboard, visible through the API within five seconds, measured on screen with a timer.

### M6 · Handover · weeks 8 to 9

Load and security pass, the health page, uptime and status page, log review, the documentation set, the walkthrough.

**Gate:** the full definition of done. **Releases tranche 4.**

---

## 2. What runs in parallel

Two developers, so the sequencing matters.

```
Week  1    2    3    4    5    6    7    8    9
      M0   ├────M1────┤   M3   M4   M5        M6
      │    │          M2  │    │    M4a       │
      │    └─ observability on │    │         │
      │                        │    │         │
      Dev A: schema, RLS, isolation suite, entitlements, service door
      Dev B: auth, invitations, console, settings, credential store
      Both:  M0 artefacts, M6 hardening and documentation
```

Dev A owns everything that touches isolation and the database. Dev B owns everything that touches interface and identity. The split is deliberate: isolation is the risk, and one person holding it end to end is more reliable than two people each half-knowing it.

**Flagged 24 Aug 2026, per `01 D-14`.** "Dev A: service door" was written when the service door was a Next.js route inside the one codebase both developers already work in. It is now a second service in a second language. Whether Dev A absorbs FastAPI within the existing nine-week, two-developer allocation, or this is genuinely new scope needing its own estimate, is a staffing question for Dennis and Ian, not a decision made silently by leaving this line unchanged. Raised in the reply to Brian rather than assumed either way.

Documentation is written alongside the code it describes, not in week 9. `12` explains why that is not optional here.

---

## 3. The critical path

```
M0 adapter contract ──▶ schema lock ──▶ M1 ──▶ everything else
                            │
   Brian: embedding model ✓┤
   Brian: rules precedence✓┘
   Brian: support matrix ✓─┘
```

**24 Aug 2026: all three of Brian's original critical-path inputs are answered**, ahead of their week-one deadline relative to this document's issue date. A schema locked without the rules precedence answer would have been a schema migrated in week seven; that risk is now closed.

The fourth, plan tiers, was due week four and is also answered, again ahead of schedule.

**A fifth input joined the critical path on 24 Aug 2026 and is not yet closed: the FastAPI staffing and effort question above.** Unlike the original four, it does not block schema lock, but it does block M4a, and M4a is where the service-door demonstration and the five-second gate both live.

---

## 4. Definition of done, with the test for each

Verbatim from the brief, with what proves it.

| #   | Condition                                                                                                                                          | Proof                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | Every tenant-scoped table has an RLS policy, and the isolation suite covers each with a cross-tenant read and write attempt that fails as expected | The generated suite, `06 §4`. 10 cases per table, in CI                                  |
| 2   | A new tenant is provisioned end to end, invitation to first login, in under two minutes with no manual database work                               | Playwright test with a timer                                                             |
| 3   | Every write action produces an audit entry with actor, tenant, action, entity, before and after, IP and request ID                                 | Audit wrapper test per module, plus a schema check that no domain write path bypasses it |
| 4   | No API credential is readable in plaintext through any application route, including as the user who created it                                     | Recursive key scan across every response. `07 §12`                                       |
| 5   | p95 under 400ms on tenant dashboard and settings routes at 50 concurrent sessions                                                                  | k6 load pass at M6, reported with the number                                             |
| 6   | A developer with no prior exposure clones and runs it locally in under 30 minutes, README alone                                                    | A real person, timed. `12 §5`                                                            |
| 7   | Every endpoint in the OpenAPI specification matches the implementation                                                                             | Contract tests in CI                                                                     |
| 8   | An AI rules change is visible through the API within 5 seconds, measured                                                                           | Automated propagation test, result quoted at M4a                                         |
| 9   | With the cache switched off entirely, every correctness property holds                                                                             | The `CACHE_DISABLED` CI job. `08 §6`                                                     |
| 10  | A credential lacking a required scope is rejected before the handler, tested per scope                                                             | Scope matrix test                                                                        |
| 11  | Both seam tables pass the same isolation suite as every other table                                                                                | Included in the generated suite                                                          |

Conditions 6 and 8 are the two that turn a promise into a measurement, and both are reported honestly whether or not the number flatters us.

---

## 5. Testing strategy

| Layer          | Coverage                                                                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit           | Entitlement resolution, rules compilation and precedence, credential hashing and verification, role checks, ETag composition. Pure, near-total |
| **Isolation**  | **The generated suite. Blocks merge with no override — genuinely, since 28 Aug 2026: see 15 · C44, which records that CI had never run a single job until then**                                                       |
| Integration    | Every service against a branch database. Transactions, concurrency, the invariants in `05 §10`                                                 |
| Contract       | Every endpoint against the OpenAPI specification. Plus the three named tests in `07 §12`                                                       |
| End to end     | Playwright: provisioning, invitation acceptance, credential reveal-once, support mode entry and exit, limit enforcement through both doors     |
| Cache-disabled | The full suite with `CACHE_DISABLED=true`                                                                                                      |
| Accessibility  | axe on every route, plus a manual keyboard pass per milestone                                                                                  |
| Load           | k6 at M6 against the 400ms and 50-session figures                                                                                              |
| Log redaction  | Seeded customer record values scanned for in generated log output                                                                              |

---

## 6. Agent operating guide

From here, the contract for Code and Design.

### Read before writing

| Task                              | Read first                           |
| --------------------------------- | ------------------------------------ |
| Any UI                            | `03` entirely, then `10` for strings |
| Any route                         | `02 §3` to `§7`                      |
| Any database work                 | `05`, including the invariants       |
| Any endpoint                      | `07 §1` and `§2`                     |
| **Anything touching tenant data** | **`06` entirely. No exceptions**     |
| Entitlements or plans             | `08 §2` and `§3`                     |
| The console or support mode       | `09`                                 |
| Any copy                          | `10`                                 |

**Do not infer a token, a route, a table, a policy or a string. If it is not in these documents, ask.**

### Absolute rules

1. **Never write a `where tenantId = ...` filter in application code.** Isolation is RLS. `06 §2`. If you believe a query needs an application-level tenant filter, you have found a missing policy and the answer is to write the policy.
2. **Never import the service role client outside `modules/platform`.** The lint rule will stop you. If it seems necessary, the answer is support mode. `06 §7`.
3. **Never read `tenantId` from a request body, query string or header.**
4. **Every database query runs inside `withTenantContext`.** No exceptions, including reads.
5. **Every write to a tenant-scoped or platform table writes an audit row in the same transaction.**
6. **Never return a credential secret from any route except `POST /v1/credentials`.**
7. **Never return `403` for a resource in another tenant.** Return `404`.
8. **Every new tenant-scoped table ships with its policies in the same migration.** The build fails otherwise.
9. **The cache is never a source of truth.** Every read falls through on a miss.
10. **Both doors call the same entitlement guard.**
11. No hardcoded colour, spacing, radius or font size. Semantic aliases only.
12. **No font weight other than 400.** There is no weight axis in this system. `03 §5`.
13. **No italics.** `font-synthesis: none` is set globally.
14. Colour follows the six-hue semantic mapping in `03 §3`. One meaning each.
15. No emoji, in the interface, in copy, or in commit messages.
16. **No em dashes in any copy.** Commas, colons, semicolons or a rewrite.
17. No exclamation marks anywhere in the product.
18. Route-based tabs, never state-based.
19. TypeScript strict. No `any`. No `@ts-ignore` without a comment naming the reason.
20. **Scope discipline.** If a task would build something in the out-of-scope list in `01 §2`, stop and raise it. Nine weeks at this fee has no slack.

### Module construction pattern

Repeat for every module, in order. Step 3 catches what step 7 would otherwise hide.

1. Schema in `db/schema/{module}.ts` **plus policies in `db/policies/{table}.sql`, same migration**.
2. Run the policy check script. It should pass before you write a line of TypeScript.
3. Isolation suite cases generated for the new tables. Run them. They should pass.
4. Types and Zod schemas in `modules/{module}/types.ts`.
5. Repository, wrapped in `withTenantContext` and the audit wrapper.
6. Service with the business rules and every relevant invariant asserted.
7. Route handlers, thin, delegating to the service. OpenAPI generated from the Zod schemas.
8. Contract tests.
9. UI, using existing components only. A new component requires a `03 §9` entry first.
10. End-to-end test on the primary path.

### File layout

```
src/
  app/
    (marketing)/  (access)/  (tenant)/app/  (platform)/platform/
    api/v1/  api/service/v1/  api/platform/v1/  api/webhooks/
  modules/
    {module}/
      index.ts        ← the only file another module may import
      types.ts  repository.ts  service.ts  policies.ts
      internal/       ← private, boundary rule blocks external imports
  components/
    primitives/  structure/  feedback/  overlays/  domain/  charts/
  db/
    schema/  policies/  migrations/  seed/
  lib/
    db/  auth/  cache/  audit/  errors/  logger/  result/
scripts/
  check-policies.ts   ← runs before tests in CI
tests/
  isolation/          ← generated
```

### Definition of done, per unit of work

Types strict and complete. Policies written and passing the check script. Isolation cases passing. Every state handled including loading, empty and error. Both themes. Works at 360px. Keyboard operable. axe clean. Copy from `10`. Audit row written where required. Tests at the appropriate layers. No rule above violated.

---

## 7. Guide for Design

**Brief.** A technical, warm, dense B2B platform interface. A drafting document rather than a dashboard. Copper on vellum, one weight of type, tinted surfaces instead of shadows. Read `03` in full before opening a canvas.

**Deliverables**, in order, each light and dark, listed in `03 §21`.

**Do not:** introduce a hue outside the six, add a typeface, use any weight but 400, use italics, use a shadow outside the overlay token, round a corner past 6px, use an emoji, add an illustration, or reach for a gradient. `03 §20` is the checklist.

**Do:** spend the design effort on the boundary frame and on the data grid. The first is what the product is remembered for; the second is where Brian spends his day.

---

## 8. Prompt patterns that work on this codebase

**A module**

> Read `05 §5` and `08 §2` and `§3`. Build the entitlements module following the pattern in `11 §6`. Schema and policies in the same migration, policy check passing, isolation cases generated and green, then the shared guard with tests driving it through both doors.

**A surface**

> Read `03 §9` for the `LimitBar` entry, `03 §10` for its specification, and `10 §6` for its strings. Build it. Existing primitives only. Normal, 80% and over-limit states, unlimited variant using `MathExpr`. Both themes, 360px, keyboard, Storybook with loading and empty stories.

**Anything touching isolation**

> Read `06` in full first. Then add the customer records table. Policies in the same migration, denormalised `tenant_id`, redaction list updated, isolation cases including the support-mode case, and the log-scanning test extended with a seeded value.

---

## 9. Review checklist before every merge

- [ ] Policy check script passes
- [ ] Isolation suite green, including any new table
- [ ] No application-level tenant filter added
- [ ] Service role client not imported outside `modules/platform`
- [ ] Every query inside `withTenantContext`
- [ ] Audit row written in the same transaction as every qualifying write
- [ ] No secret in any response
- [ ] `404` not `403` for cross-tenant resources
- [ ] Entitlement guard called through both doors where relevant
- [ ] OpenAPI regenerated, contract tests passing
- [ ] Copy from `10`, no em dashes, no exclamation marks
- [ ] Weight 400 only, no italics, no hardcoded colour
- [ ] Both themes, 360px, keyboard, axe clean
- [ ] Nothing built that appears in the out-of-scope list

---

## 10. When this specification is wrong

It will be, somewhere. Stop, name the conflict with the document and section, propose the change with its consequences, and update the document in the same pull request as the code.

A specification that drifts from the codebase is worse than none, because it produces confident wrong decisions. And on this engagement the documentation is a contracted deliverable with an acceptance test, so a stale document is a failed gate rather than an inconvenience.

---

## 11. First week

1. Send Brian the four blocking questions today: embedding model, rules precedence, support role matrix, and the plan tiers deadline. `01 §8`.
2. Get Supabase and GitHub access. Everything waits on it.
3. Write `scripts/check-policies.ts` **before the first table**. It is forty lines and it makes an entire class of mistake impossible for nine weeks.
4. Write the isolation suite generator alongside the first two tables, not after the schema is finished. A suite written at the end tests what you built; a suite written alongside shapes what you build.
5. Draft the channel adapter contract and send it for review. It is the M0 artefact most likely to be deferred and the one whose lateness is most expensive.
