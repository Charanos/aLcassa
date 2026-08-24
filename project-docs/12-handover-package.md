# 12 · Handover Package

Requirement 7. The one requirement with a measurable pass mark, and the one that changes how everything else gets built.

---

## 1. Why this is different from normal documentation

Brian's seventh point tells the rest of the story: the documentation has to be good enough for another developer to pick the codebase up cold. That means this foundation will be handed on, possibly to hands that are not ours.

Two consequences.

**Every boundary the messaging layer will later plug into gets defined, typed and documented now.** Whoever writes the WhatsApp adapter starts from a contract instead of a guess. That is the whole reason the seams in `04 §11` exist as tables and interfaces rather than as an intention.

**The acceptance test is a stranger with a stopwatch.** A developer with no prior exposure clones the repository and runs it locally, following the README alone, in under thirty minutes. We run that test with a real person and report the result whether or not it flatters us.

That second point is unusual and it is the right way to specify documentation. Every other measure of documentation quality is an opinion.

---

## 2. The artefacts

Seven, from the brief, with what each actually contains.

### Architecture overview

System and data flow diagrams, kept current with the code rather than written once at the end.

Contents: the container view, the request pipeline, the module map with boundaries, the three core sequences (provisioning, support mode entry, the AI rules read), and the environment topology. Essentially `04 §1` through `§4`, maintained.

**24 Aug 2026, per `01 D-14`:** the container view now shows two services, Next.js and FastAPI, not one, per `04` ADR-012. A handover document describing "the application" in the singular would already be wrong on day one; this artefact carries the two-service shape from the first draft rather than retrofitting it later.

**Kept current means:** a diagram lives in the repository as a Mermaid source file, is rendered in the README, and is updated in the same pull request as any change to what it describes. A diagram in a design tool that nobody can edit is a diagram that is wrong within a month.

### Entity relationship diagram

Generated from the live schema, regenerated on every migration.

`drizzle-kit` plus a Mermaid generator, run as a CI step that fails if the committed ERD differs from the schema. Generation is the only way this stays true; a hand-drawn ERD is a historical document.

### Policy reference

Every table, its Row Level Security policy, and the reasoning behind it.

This one is ours to write and it is the most valuable artefact in the set. For each tenant-scoped table: the policy SQL, what it permits for each role, what the `with check` clause prevents, and one sentence on why it is shaped that way.

The format is one section per table, generated from the policy catalogue for the SQL and hand-written for the reasoning, so the SQL cannot go stale and the reasoning is a human's.

**This is the document a security reviewer reads.** It should be written as though one will.

### API specification

OpenAPI 3.1 with request and response examples, backed by contract tests.

Generated from the Zod schemas on the Next.js side and from Pydantic on the FastAPI side, merged into one document, so specification and implementation cannot diverge in either service. Served at `/api/docs` behind auth in staging, exported as a file in the handover. Includes both doors and the reserved Phase 2 endpoints returning `501`, so the shape of what is coming is visible.

Every endpoint carries at least one request and one response example, and every error code in `07 §2` appears against at least one endpoint.

### Decision records

Architecture decision records covering tenancy, auth, entitlements and secrets. Eleven of them, in `04 §5`, in the repository as markdown, numbered, with status.

The format that matters: context, options considered with their trade-offs, the decision, and the consequences split into what becomes easier and what becomes harder. An ADR that only records what was chosen is a note; one that records what was rejected and why is the thing that stops the next developer relitigating it.

### Runbook

Environment setup, migrations, rollback, key rotation, incident triage.

Contents:
- Local setup from a clean machine, which is the thirty-minute test path, **now covering both the Next.js application and the FastAPI service, per `01 D-14`**
- Environment variables, every one, with what it is for and where to get it, across both services
- Running and creating migrations, including the branch workflow
- Rolling back a deployment and rolling back a migration, which are different operations, **for each service independently, since they now deploy separately**
- Rotating the service role key, the Supabase keys, and a tenant credential
- Suspending and reactivating a tenant, with the audit implications
- Responding to a suspected isolation failure. **This page is written even though we expect never to use it**
- Reading the logs: where they are, how to filter by request ID, what is redacted, **across both services' log streams**
- The on-call decision tree for each alert in `04 §8`, including the FastAPI-specific failure modes added there on 24 Aug 2026

### Channel adapter guide

The interface, the generic internal event shape, and the retry and idempotency rules the Phase 2 processing layer must satisfy.

This is the artefact that most directly serves "handed to other hands". Contents:
- The `channel_connection` table and what each field is for
- The `InboundMessageEvent` shape from `07 §11`, field by field, with which fields are personal data
- The adapter interface: connect, disconnect, verify webhook, normalise inbound, send outbound
- Webhook handler requirements: verify first, return 200 fast, work asynchronously, idempotent on the provider's event ID, store the raw payload
- Retry policy and what to do with a poison message
- How a tenant is resolved from an inbound webhook, which is the subtle part and the one most likely to be got wrong
- Worked example: a hypothetical adapter, in enough detail to copy

**Reviewed and signed at M0**, before the schema locks. That is the mitigation for the biggest risk in the brief.

### Walkthrough

A recorded tour of the codebase, plus a live session with Brian's next developer.

The recording covers: the repository layout, how a request flows through the pipeline, how to add a table with its policies, how the isolation suite works, and where the seams are. Forty minutes, chaptered.

The live session happens after the recording has been watched, so it is questions rather than a repeat.

---

## 3. The README

The thirty-minute test passes or fails here, so it gets its own specification.

Structure, in order:

1. **One paragraph on what this is.** Not the company, not the vision. What the software does.
2. **Prerequisites**, with exact versions. Node, pnpm, Docker if needed, the Supabase CLI, **and, per `01 D-14`, Python and the FastAPI service's own dependency manager**, since a working local instance now means two runtimes rather than one.
3. **Setup**, as a numbered list of commands that can be copied one at a time. No prose between steps that changes what the command should be.
4. **Environment variables**, as a table: name, required, where to obtain it, example value. Plus a `.env.example` that is complete and current.
5. **First run**, including seeding, and what a successful start looks like, with the actual expected terminal output.
6. **Verifying the setup worked**, which is a specific thing to do and see, not "open localhost:3000".
7. **Running the tests**, including the isolation suite specifically, because that is the one a new developer should run first to understand what the project cares about.
8. **The map**: where things are, one line per top-level directory.
9. **Where to read next**, linking the other artefacts in the order a new developer should read them.
10. **Common problems**, with the three or four that will actually happen.

What the README must not contain: a philosophy section, badges that do not link to anything working, an architecture diagram that duplicates the architecture document, or a contribution guide for a project with two contributors.

---

## 4. Documentation is written alongside the code

Not in week nine. The reasons are practical rather than principled.

A policy's reasoning is clear the day it is written and reconstructed with difficulty six weeks later. An ADR written after the fact records the decision without the alternatives, because the alternatives have been forgotten. And a documentation sprint at the end competes with the load pass, the security pass and the definition-of-done verification, all of which are also in M6.

So: each milestone carries its documentation as part of its gate. M1 delivers the policy reference for the tables it created. M3 delivers the entitlement ADR. M4a delivers the service door section of the API specification. M6 assembles, reviews and runs the thirty-minute test, rather than writing everything.

---

## 5. The thirty-minute test

Run in week 9, before sign-off.

**Method.** A developer who has not touched the project, ideally not from Andishi, is given the repository URL and nothing else. They are timed from clone to a verified working local instance. They may read the README. They may not ask questions. Anything they need to ask is a documentation defect.

**Amended 24 Aug 2026, per `01 D-14`.** "A verified working local instance" now means both the Next.js application and the FastAPI service running and talking to the same local database. This is new risk to a thirty-minute, contractual-adjacent gate that this document did not carry before Brian's decision, and it is stated here rather than discovered at M6: two runtimes, two dependency ecosystems and two sets of environment variables is a meaningfully harder thirty minutes than one. It is the reason this document recommends testing the README early and often, per the closing paragraph of this section, rather than treating that as a nice-to-have.

**Recording.** Where they stall, what they had to guess, what they got wrong. Each stall becomes a README fix, and the test is rerun after fixes with a second person if the first run failed.

**Reporting.** The result goes to Brian whether or not it flatters us. A thirty-two minute run reported honestly is worth more than a passed test nobody believes.

**What tends to fail it**, so it can be prevented rather than discovered:
- An environment variable that is required but not in `.env.example`
- A step that assumes a tool is already installed
- Seeding that fails silently and leaves an empty database that looks like a working one
- A Supabase project setup step that is described but not spelled out
- A version mismatch that produces a confusing error rather than a clear one
- **Added 24 Aug 2026:** the FastAPI service starting against a stale or divergent local schema because its migration path was not run, or its own dependency install being skipped because the developer stopped after the Node setup looked complete

Test the README on a clean machine at M3 and again at M5, informally, so week 9 is a confirmation rather than a discovery.

---

## 6. What Brian gets at sign-off

A repository containing the code and every artefact above. A recorded walkthrough. A live session with his next developer. A written statement of the definition-of-done results, including the two measured numbers, the p95 figure and the thirty-minute test result. The list of known gaps: retention and erasure automation, two-factor for tenant users, and anything else raised during the build.

And thirty days of support against defects, scoped to the definition of done.

**The known-gaps list is the most professional thing in the package.** A handover that claims completeness is a handover that gets discovered. One that names what is not there, and why it was left, is one that Brian can plan from.
