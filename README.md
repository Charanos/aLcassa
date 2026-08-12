# aLcassa

**Multi-tenant customer support platform · Phase 1 foundation**
Andishi, for Brian. Against project brief revision 3.1, 29 July 2026.

The platform layer beneath a customer support inbox: tenancy with real isolation,
authentication, subscription structure, an owner-level console, AI rules readable
by machines, and documentation good enough that a stranger can pick this up cold.

> **On the name.** The client identity landed on 3 August 2026. `aLcassa` was the
> codename for the design system and this document set, never a proposed product
> name — so it appears in git history and in the repository URL, and nowhere a
> customer can see. The wordmark is **`aLcassa`**, mixed case with a capital L,
> in all product-facing copy; `alcassa` lowercase is the correct form in code,
> identifiers and URLs. `Alcassa` is prohibited by the brand guidance and is
> checked for in review. See `project-docs/15-spec-delta.md` §3b.

---

## This README has a pass mark

Condition 6 of the definition of done:

> A developer with no prior exposure to the codebase clones the repository and
> runs it locally, following the README alone, in under 30 minutes.

That test is run with a real person and the result is reported whether or not it
flatters us. If any step below fails or is unclear, that is a defect in this
file, not in the reader. Raise it.

---

## Running locally

### 1 · Prerequisites

| Tool         | Version        | Check                           |
| ------------ | -------------- | ------------------------------- |
| Node         | 20.11 or later | `node -v`                       |
| pnpm         | 9 or later     | `pnpm -v`, or `corepack enable` |
| Docker       | any current    | `docker -v`                     |
| Supabase CLI | any current    | `supabase -v`                   |

`npm` works if you prefer it; the scripts are package-manager agnostic.

### 2 · Install

```bash
git clone https://github.com/Charanos/aLcassa.git
cd aLcassa
pnpm install
```

### 3 · Start Postgres

The isolation suite needs a real database with real policies, so there is no
in-memory shortcut here.

```bash
supabase start
```

That prints a connection string and an anon key. If you would rather not run
Supabase locally, any Postgres 15+ with `pgcrypto`, `pgvector` and `pg_trgm`
will do, including a Supabase branch.

### 4 · Configure

```bash
cp .env.example .env.local
```

Fill in `DATABASE_URL` and `DATABASE_URL_ADMIN` from the previous step. Every
other variable has a documented default or is optional; **the cache credentials
are genuinely optional**, because with Redis switched off every correctness
property still holds and only speed changes.

### 5 · Migrate and seed

```bash
pnpm db:migrate
pnpm db:seed
```

The seed creates four plans and **three tenants, deliberately different**: one on
the free tier at its seat limit, one on growth mid-usage, and one suspended. That
third one is not decoration. An isolation suite needs at least two tenants with
overlapping-looking data to prove anything, and a suspended one to prove the
status predicate in the modify policies actually fires.

### 6 · Verify the guarantee before you write anything

```bash
pnpm check:policies
pnpm test:isolation
```

The first reads the schema and the policy catalogue and compares them. A
tenant-scoped table without a policy fails the build. The second runs ten
isolation cases against every tenant-scoped table.

**Run both before your first line of code.** If either fails on a clean clone,
stop and raise it rather than working around it.

### 7 · Run

```bash
pnpm dev
```

| URL                   | What                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| `/`                   | The review surface: documentation set, design sheets, foundation status |
| `/product`            | The marketing page from `02 §2`                                         |
| `/app`                | Tenant application                                                      |
| `/platform`           | Platform console                                                        |
| `/docs/<slug>`        | A project document, rendered from `project-docs/`                       |
| `/design/<slug>.html` | A design sheet                                                          |

---

## Commands

| Command                    | What it does                                               |
| -------------------------- | ---------------------------------------------------------- |
| `pnpm dev`                 | Development server                                         |
| `pnpm build`               | Production build                                           |
| `pnpm typecheck`           | TypeScript, strict, no `any`                               |
| `pnpm lint`                | Includes the module boundary and service-role import rules |
| `pnpm check:policies`      | **A tenant-scoped table without a policy fails here**      |
| `pnpm test`                | Unit, integration and contract tests                       |
| `pnpm test:isolation`      | The generated isolation suite                              |
| `pnpm test:cache-disabled` | The whole suite with the cache off                         |
| `pnpm db:generate`         | Generate a migration from the schema                       |
| `pnpm db:migrate`          | Apply migrations                                           |
| `pnpm db:seed`             | Seed plans, tenants and the platform admin                 |
| `pnpm verify`              | Everything CI runs, locally                                |

---

## Reading order

Nine documents, in `project-docs/`, also readable at `/docs`.

| Doc                             | Read it when                                            |
| ------------------------------- | ------------------------------------------------------- |
| `00-INDEX`                      | First. The engagement in four lines                     |
| `02-information-architecture`   | Adding a route or navigation                            |
| `03-design-system`              | Any visual work                                         |
| `04-system-architecture`        | Structural decisions. Eleven ADRs                       |
| `05-data-model`                 | Any database work. Full schema and every invariant      |
| **`06-tenancy-and-isolation`**  | **Anything touching tenant data. No exceptions**        |
| `07-api-contract`               | Any endpoint. Both doors                                |
| `08-subscriptions-...`          | Plans, limits, the singleton, the cache                 |
| `09-platform-console-...`       | The console, the switcher, support mode                 |
| `10-copy-deck`                  | Any string. Do not write new copy without checking here |
| `11-build-plan-and-agent-guide` | Milestones, gates, and the operating rules              |
| `15-spec-delta`                 | Where the code and the documents deliberately differ    |

---

## The twenty rules

From `11 §6`. The first ten are the isolation guarantee made mechanical; break
one and the build stops, which is the point.

1. **Never write a `where tenantId = ...` filter in application code.** Isolation
   is Row Level Security. If a query appears to need an application-level tenant
   filter, you have found a missing policy and the answer is to write the policy.
2. **Never import the service role client outside `src/modules/platform`.** The
   lint rule will stop you. If it seems necessary, the answer is support mode.
3. **Never read `tenantId` from a request body, query string or header.**
4. **Every database query runs inside `withTenantContext`**, including reads.
5. Every write to a tenant-scoped table writes an audit row **in the same
   transaction**.
6. Never return a credential secret from any route except `POST /v1/credentials`.
7. **Return `404`, never `403`, for a resource in another tenant.** A 403
   confirms the resource exists.
8. Every new tenant-scoped table ships with its policies **in the same migration**.
9. **The cache is never a source of truth.** Every read falls through on a miss.
10. **Both doors call the same entitlement guard.**
11. No hardcoded colour, spacing, radius or font size. Semantic aliases only.
12. **Weight 400 only.** There is no weight axis in this system.
13. **No italics.** `font-synthesis: none` is set globally.
14. Six hues, one meaning each. Every coloured element carries a glyph and a word.
15. No emoji, in the interface, in copy, or in commit messages.
16. **No em dashes in any copy.** Commas, colons, semicolons or a rewrite.
17. No exclamation marks anywhere in the product.
18. Route-based tabs, never state-based.
19. TypeScript strict. No `any`. No `@ts-ignore` without a comment naming why.
20. **Scope discipline.** If a task would build something in the out-of-scope
    list in `01 §2`, stop and raise it. Nine weeks has no slack in it.

---

## Where things live

```
src/
  app/
    (presentation)/   the review surface and the document viewer
    (marketing)/      the product page and the legal shell
    (access)/         sign-in, sign-up, invite, reset
    (tenant)/app/     the tenant application
    (platform)/
      platform/
        (console)/    the owner console, inside the shell layout
        sign-in/      deliberately OUTSIDE it, see below
    api/              v1 session door · service/v1 machine door · platform/v1
  modules/            one service surface per module, exported from index.ts
  components/
    console/          the platform console: shell, surfaces, charts, dialogs
    primitives/ structure/ feedback/ domain/
  hooks/              useRovingGrid — arrow-key grids, one tab stop
  db/
    schema/           one file per module
    policies/         one file per table, applied by migration
    seed/
  lib/
    db/               client · serviceClient · withTenantContext · context
    auth/  cache/  audit/  errors/  logger/  http/  result/
    motion.ts         gsapSafe — GSAP routed through prefers-reduced-motion
scripts/
  check-policies.ts   runs before tests in CI
tests/
  isolation/          generated from the schema
project-docs/         the documentation set
design-docs/          the fourteen design sheets
```

### The four files that carry the guarantee

Read these before anything else:

| File                              | Why                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `src/lib/db/withTenantContext.ts` | The single most important function here. The comment explains why one `true` argument is load-bearing |
| `src/lib/db/context.ts`           | The branded type that makes a whole category of mistake unwritable                                    |
| `src/db/policies/00_context.sql`  | Every policy in the database reads from these four functions                                          |
| `scripts/check-policies.ts`       | Forty lines that make an entire class of mistake impossible for nine weeks                            |

### Three things about the console that look odd and are not

**`sign-in` sits outside the `(console)` route group.** Anything under
`(console)` inherits the shell — header, sidebar, workspace switcher. A sign-in
page inheriting that would wrap the whole platform chrome around a screen for
someone who is not signed in yet. The route group changes no URLs; it exists
only to draw that line.

**`src/lib/console/data.ts` is a seam, not a mock layer.** Every export is
shaped exactly as the query that replaces it returns, and each one names that
query in its comment. Keeping the fixtures at the boundary means no screen has
ever seen anything but its real prop shape, so none of them can quietly grow a
dependency on a field the database will not have.

Two things in it are load-bearing rather than convenient:

- **Impact counts** (how many staff a suspension locks out) live in the read
  model, not the dialog, so the console cannot become confidently wrong about
  who it is about to break.
- **Redacted audit values** never enter the model at all. A redacted diff
  carries the literal string `redacted`; had it been a display flag, the secret
  would sit in the serialised RSC payload for anyone with devtools.

**The console's GSAP motion and `src/lib/errors/` are two different amendments
to the same design set, not the same amendment.** `src/lib/motion.ts` records
a deliberate divergence from sheet 13's `motion.instant = 0ms` for the console
chrome — the sliding nav indicator and its neighbours keep their GSAP motion,
routed through `gsapSafe` so `prefers-reduced-motion` still loses nothing; see
[15-spec-delta.md § C24](project-docs/15-spec-delta.md). `src/lib/errors/`
is the opposite kind of overlap: sheet 12's error shape (`code`, `message`,
`request_id`, `details`) already existed as `AppError` from a much earlier
pass, wired into `src/lib/http/`. Only the hue mapping sheet 12 adds on top —
`src/lib/errors/hue.ts` — was actually new; see § C26 for the contract.ts that
almost duplicated the whole thing.

---

## What is deliberately not built

Channel integrations and webhook receivers. The agent inbox, threading,
assignment, routing. Payment gateway integration. Analytics dashboards, canned
replies, chatbots, AI assist. Native mobile. Embedding generation, retrieval,
RAG. Population or reading of customer records by the AI. Retention and erasure
automation.

That last one is a **known gap, flagged rather than omitted**. It becomes
necessary the first time a tenant operates somewhere with data erasure rights,
and it is cheaper to build on a finished foundation than alongside one.

---

## When the specification is wrong

It will be, somewhere. Stop, name the conflict with the document and section,
propose the change with its consequences, and **update the document in the same
pull request as the code**.

The documentation is a contracted deliverable with an acceptance test, so a
stale document is a failed gate rather than an inconvenience. Deltas already
found and resolved are recorded in `project-docs/15-spec-delta.md`.

---

Andishi · Northern Bypass, Nairobi · commercial in confidence
