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
CI now starts this same pinned Supabase provider profile. A plain PostgreSQL 16
image cannot supply the real Auth and Storage schemas used by application policies.
The provider check runs before migrations; all application RLS and isolation
assertions still run under the restricted app role. See the ledger for actual results.

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

The verification toolchain requires Node 22.12 or newer in the supported 22.x line,
or Node 24+. CI uses Node 22. The expanded suite also exercises avatar SQL policies
against the provider's actual `storage.objects`, `auth.uid()` and authenticated role,
including cross-identity writes and the direct-deletion safeguard. This SQL evidence
does not replace browser upload, Storage HTTP or avatar lifecycle verification.

`pnpm check:security` retains the raw registry audit in `.test-report/security/` and
blocks unresolved moderate, high and critical findings. Its one local remediation is
documented in [the dependency security note](security/README.md). Registry/network
errors, muted findings, incomplete reports or altered patch bytes fail the gate.

The account checkpoint passes **463/463 cache-disabled cases in 34 files**, including
actual provider invitations, PKCE recovery and token-hash confirmation. Those tests
call the route handlers with a request-cookie harness; they do not replace the complete
browser lifecycle or prove production delivery. A short-lived database session permits
password setup only after a verified, recent provider OTP/invitation/recovery method.
It cannot open either application door. Ordinary password sign-in proof is refused;
a provider session cannot create the same email flow twice. Password writes serialize
per account before the external provider call. A definite provider refusal allows retry;
an uncertain response retains the claim until its 15-minute session expires.

The policy catalogue revokes direct `sessions` table access from PUBLIC, anon and
authenticated roles; issuance and revocation use the private application connection.
The real provider contract verifies 403 responses for forged flows, attempted session
revival and private-row reads. A regression checks effective database permissions and
preserved application rights. Apply the maintained policy catalogue with `db:migrate`
or `db:policies`; do not restore browser-facing grants when provisioning the app role.

The provider redirect allowlist includes the complete URLs, including their query:

- `http://localhost:3100/auth/confirm?type=invite`
- `http://localhost:3100/auth/confirm?type=recovery`

Matching loopback-IP URLs are reserved for provider configuration; browser journeys use
localhost consistently. Restart the named local stack after changing `config.toml`.
The launchers supply `NEXT_PUBLIC_APP_URL=http://localhost:3100`; CI exports the same
non-secret origin. On Vercel production, email uses `VERCEL_PROJECT_PRODUCTION_URL`
with HTTPS when available, otherwise an explicitly configured production APP URL.
Before qualifying production email, allowlist both corresponding HTTPS confirmation
URLs in the hosted Auth project, verify the sending domain/SMTP configuration and test
delivery to an authorized recipient. No hosted configuration or delivery is implied by
the disposable environment's capture.

Auth invitation and recovery emails use the shared brand layout in
`src/modules/email/templates.ts`. Run `pnpm email:templates` after a design change;
`pnpm check:email-templates` checks the committed HTML against that source and runs
in CI. The local provider loads `supabase/templates/invite.html` and `recovery.html`
relative to `verification/local`. Restart it after changing these files.

For the hosted Auth project, copy those HTML files into the matching Invite user
and Reset password templates, with subjects “Your aLcassa workspace invitation”
and “Reset your aLcassa password”. Preserve `{{ .ConfirmationURL }}` in both action
and fallback link. These files have no external images, scripts or font requests;
solid navy remains the fallback when a client drops the dotted background. Actual
Outlook/Gmail client acceptance and hosted installation remain separate gates.
Configure the sender name as aLcassa through verified SMTP; the disposable provider's
default sender is not evidence of production sending-domain readiness.

Confirmation responses use `strict-origin` referrer policy. It preserves the native
form's Origin while withholding paths, query strings and proof values. `no-referrer`
can make native POST origins opaque, so accepting a `null` origin is not a workaround.
The explicit confirmation removes proof parameters before further navigation.
