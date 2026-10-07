# Local Phase One verification

The full environment uses the Supabase CLI **2.119.0**, a separate project ID
`alcassa-phase-one-verification`, PostgreSQL 17, API port 55421, database port
55422, and local email capture 55424. Studio's reserved port is 55423. The app uses port 3100;
the separate FastAPI repository uses port 8100. Drizzle remains the application
migration authority. No hosted Supabase project is linked here.

Requirements: a working Docker runtime, at least 6 GB free on the system drive
(10 GB recommended for a cold image download)
(and adequate free space on Docker's data drive), Node, the repository's pinned pnpm,
and uv for the service repository. See [Supabase local configuration](https://supabase.com/docs/guides/local-development/cli/config).

From the application repository:

```powershell
./scripts/verification-local.ps1 Start
./scripts/verification-local.ps1 Prepare
./scripts/verification-local.ps1 Test
./scripts/verification-local.ps1 Upgrade
./scripts/verification-local.ps1 Dev
```

Open **http://localhost:3100** for every authenticated browser journey. Use this
same host for entry, redirects and cookies; mixing `127.0.0.1` and `localhost`
can leave a successful sign-in without the expected cookie at its destination.
The listener still binds only to loopback. Dev writes `.next-local-verify`.

For production-runtime browser verification:

```powershell
./scripts/verification-local.ps1 BuildLive
./scripts/verification-local.ps1 Serve
```

BuildLive and Serve share `.next-live-verify`, use the disposable provider
credentials and refuse non-local database/provider URLs. Stop Serve before
rebuilding. These commands qualify a local runtime; they do not deploy the app.

Start saves local keys and generated disposable account credentials in the ignored
`.env.verification.local`. Prepare applies migrations/policies, creates the
restricted app role and seeds disposable data, including two tenant login accounts
whose credentials are saved only in the ignored environment file. The launcher clears external cache,
email and telemetry settings and validates localhost URLs before application
commands. It never rewrites `.env.local`. Stop preserves the stack's local data.
Use the generated account locally; do not copy customer credentials.

Start excludes optional Studio, Postgres Meta, Realtime, Edge Functions, Logflare,
Vector and Supavisor containers. Auth, PostgreSQL, the REST gateway, Storage,
image handling and email capture cover the Phase One provider dependencies here.
This smaller profile avoids downloading and running unrelated services. It does
not verify the excluded products or replace external observability/recovery gates.

```powershell
./scripts/verification-local.ps1 Preview
```

Preview provides a read-only fixture review without running Supabase. Source labels
identify examples; this is not evidence for authentication, RLS, mutations, real
data integrity, delivery or full E2E acceptance. It binds only to loopback.

Docker was confirmed available on 6 October 2026 (server 29.8.2). The CLI rejects
PostgreSQL 16, so the disposable Supabase stack uses the supported PostgreSQL 17.
CI's separate PostgreSQL 16 policy suite remains a different compatibility gate;
local results do not replace it. See the verification ledger for actual results.

```powershell
./scripts/verification-local.ps1 Build
```

Build uses an isolated output directory and inaccessible placeholder credentials;
it requires no hosted account and does not perform runtime verification.

`./scripts/verification-local.ps1 Unit` runs all tests that do not require the database
with external providers cleared and saves `.test-report/phase-one/non-database.json`.
It complements the full Test command; database tests are explicitly excluded.

On 6 October 2026 the disposable stack completed fresh migrations and policy
setup, eight upgrade/replay assertions, and 342/342 cache-disabled test cases.
See [the verification ledger](../project-docs/26-phase-one-verification-ledger.md)
for report links and remaining browser, contract and release obligations.

On 7 October the expanded cache-disabled suite completed **356/356 cases in 20 files**,
including real console reader regressions and subscription/customer Activity atomicity.
`node --import tsx scripts/verification-browser-readback.ts` independently checks the
named disposable Acme plan-change replay and writes its report only when every assertion
passes. It intentionally refuses hosted database URLs and must follow the documented
Business-to-Pro browser replay. These results do not close the remaining surface,
service-contract, load, recovery or handover gates.
