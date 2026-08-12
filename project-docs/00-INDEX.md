# aLcassa · Documentation Set

**Engagement:** customer support SaaS, Phase 1, platform foundation
**Client:** Brian
**Studio:** Andishi, Northern Bypass, Nairobi
**Project lead:** Dennis Munge · **Commercial:** Ian
**Against:** Project Brief Rev 3.1, 29 July 2026
**Design system codename:** aLcassa

---

## The engagement in four lines

Brian is building one inbox where a business handles every customer message, whatever app it arrived from. He has not asked for the inbox. He has asked for the platform underneath it: tenancy with real isolation, authentication, subscription structure, an owner-level console, AI rules readable by machines, and documentation good enough that a stranger can pick the codebase up cold.

The seventh requirement is the one that shapes everything. This foundation will be handed on, possibly to hands that are not ours. So every boundary the messaging layer will later plug into gets defined, typed and documented now.

---

## The governing constraint

**KES 65,000, nine working weeks, two developers, fixed scope.**

Every document in this set stays inside the Phase 1 boundary set out in the brief. Where a document describes something the messaging layer will need, it is marked as a **seam**: the contract is defined, the table exists, the interface is typed, and nothing above it is built. A seam is a promise about shape, not a feature.

If a document here appears to expand scope beyond the brief, the brief wins and the document is wrong. Raise it rather than building it.

---

## Reading order

| Doc  | Title                                    | Read it when                                                                         |
| ---- | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| `01` | Brief and Decision Log                   | Always first. What was agreed, and the twelve decisions the rest rests on            |
| `02` | Information Architecture                 | Adding a route or navigation. Two applications, one codebase                         |
| `03` | Design System · aLcassa                  | Any visual work. Palette, the one-weight type system, components, the boundary frame |
| `04` | System Architecture                      | Structural decisions. Eleven ADRs, sequences, caching, observability                 |
| `05` | Data Model                               | Any database work. Full schema, every RLS policy, invariants                         |
| `06` | Tenancy and Isolation                    | **Anything touching tenant data. No exceptions.** The safety core of this project    |
| `07` | API Contract                             | Any endpoint. Both doors: session and service                                        |
| `08` | Subscriptions, Entitlements and AI Rules | Plans, limits, the singleton, the read path, the cache                               |
| `09` | Platform Console and Support Mode        | The owner's workspace, the organization switcher, the audit obligation               |
| `10` | Copy Deck                                | Every string. Do not write new copy without checking here                            |
| `11` | Build Plan and Agent Guide               | Milestone mapping, gates, and the operating contract for coding agents               |
| `12` | Handover Package                         | Requirement 7, treated as a deliverable with its own acceptance test                 |
| `13` | Code Brief                               | Paste-ready prompt, plus follow-up patterns                                          |

---

## The five things that matter most

**1 · Isolation is the product.** Everything else here is ordinary SaaS engineering. The thing Brian is paying for, and the thing that ends the business if it fails once, is that tenant A can never read tenant B. It is enforced in the database rather than in the application, tested automatically, and gated at two milestones. `06`

**2 · The owner is bound by the same policies as everyone else.** The organization switcher does not use the service role key. It mints a scoped support session where the same Row Level Security that protects a tenant applies to the person looking in. That is a genuine ceiling, not a courtesy. `09 §3`

**3 · Documentation is a deliverable with a pass mark.** A developer who has never seen the repository clones it and runs it locally in under thirty minutes, following the README alone. We run that test with a real person and report the result whether or not it flatters us. `12`

**4 · The cache is an optimisation and never a source of truth.** With Redis switched off entirely, every correctness property in this system still holds. Only speed changes. That is a testable claim and it is tested. `08 §6`

**5 · Seams are contracts, not stubs.** The channel adapter interface, the knowledge base table and the customer records table are shaped now so Phase 2 starts from a contract instead of a guess. Nothing above them is built. `04 §9`

---

## Stack

Next.js 15 with TypeScript strict · Supabase for Postgres, Auth, Storage and Row Level Security · Drizzle ORM · Upstash Redis, scoped to four uses · Vercel · pgvector · Sentry, Axiom, Better Stack · Libertinus Serif, Libertinus Sans, Fira Code · Tabler Icons

## Before anything is built

Six items are blocking, listed in `01 §9`. Two of them need answers in week one and change the schema: which embedding model Phase 2 will use, and the precedence rule between master and tenant AI rules. Send them the day the brief is signed.
