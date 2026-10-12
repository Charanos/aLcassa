# Google account setup and acceptance

Google is required for first-time workspace creation and returning sign-in. The
application uses Supabase's server-side PKCE exchange; Google credentials belong
to the identity provider configuration.

## Configure the provider

1. Create a **Web application** OAuth client in Google Cloud. Configure the consent
   screen for aLcassa and add the intended Google accounts as test users while the
   OAuth application is in Testing. Use only OpenID, email and profile scopes.
2. Add the application's origin to Authorized JavaScript origins, for example
   `http://localhost:3100` or `https://a-lcassa.vercel.app`.
3. Add the **Supabase provider callback** to Authorized redirect URIs:
   `https://<project-ref>.supabase.co/auth/v1/callback` for the hosted sandbox, or
   `http://127.0.0.1:55421/auth/v1/callback` for the disposable local provider.
4. Keep `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` and
   `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET` in an ignored local environment
   file. Blank provisioning fields are documented in `.env.example`. For hosted
   Supabase, copy the values into Authentication → Sign In / Providers → Google
   and enable it. Adding them to the Next.js environment alone does not enable
   the hosted provider.
5. Set Supabase's Site URL to the application's actual origin. Allow its
   `/api/v1/auth/callback` route, including the `next` query. For the hosted
   sandbox, use `https://a-lcassa.vercel.app/api/v1/auth/callback**`; do not allow
   arbitrary deployment origins. The local verification config already lists
   both loopback callback origins.

For a separate local Google rehearsal, add this provider section to the local
Supabase config and restart only that owned stack after exporting the secret:

```toml
[auth.external.google]
enabled = true
client_id = "<Google web client ID>"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET)"
skip_nonce_check = false
```

Use the exact callback origin throughout a journey. Switching between localhost
and 127.0.0.1 midway loses the browser's PKCE verifier cookie. Never put the Google
secret in a browser variable, tracked config or verification artifact. The normal
disposable CI stack intentionally leaves Google disabled; it needs no external
Google credentials.

The sign-in and sign-up pages check the provider configuration on every visit,
without a presentation cache. Once the provider is enabled, reload either page
to activate its Google button; no application rebuild is required. Blank settings,
a disabled provider or a settings outage leave a disabled, labelled Google option
and the normal email form. Direct OAuth submissions recheck availability before
starting a flow.

## Hosted sandbox checkpoint — 12 October 2026

The hosted provider is enabled, nonce checking remains on, and an email address
is required. Site URL and allowed application callbacks match the deployed
sandbox. Google Cloud is External / Testing with one approved test user. The
deployed sign-up action completes Google's name/profile/email consent screen.
Workspace setup creates one trial workspace, one owner membership, one occupied
seat and one creation audit, confirmed by scoped database readback. After sign-out,
returning Google sign-in resumes the requested company page in the same workspace.
The owned acceptance workspace remains available for existing-email identity
continuity and invitation checks; those journeys are not yet qualified.

The OAuth application name is **aLcassa**. Google shows the Supabase hostname
until brand verification permits the name/logo to be displayed. Prepare the
application homepage, privacy notice and terms links in Google Branding, and
verify domain ownership as requested by Google. A Supabase custom auth domain is
a separate paid option, not a required Next.js environment variable.

References: [Google OAuth branding](https://support.google.com/cloud/answer/15549049)
and [Supabase consent branding](https://supabase.com/docs/guides/auth/social-login/auth-google#setup-consent-screen-branding).

## Acceptance to record after configuration

| Journey                                      | Required result                                                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| New Google identity from Sign up             | Verified account reaches workspace naming; completion creates exactly one trial workspace, one owner membership and one seat. |
| Repeated or concurrent completion            | Reuses the same workspace; creates no extra membership or seat and retains the original role.                                 |
| Returning Google identity from Sign in       | Opens its existing workspace without requesting its name again.                                                               |
| Existing verified email account using Google | Returns to the same identity and workspace; does not duplicate the customer record.                                           |
| Intended settings destination                | Safe internal path and query survive the callback; external destinations are refused.                                         |
| Cancelled consent or expired exchange        | Clear sign-in recovery; no application session is issued.                                                                     |
| Suspended or invited colleague               | Does not become the owner of a duplicate workspace; existing invitation/access rules apply.                                   |
| Provider disabled or unavailable             | Email access remains available; direct Google initiation fails safely.                                                        |

The contract tests and disposable database tests cover application routing,
identity refusals, role preservation and concurrent setup. They **do not prove** a
Google Cloud consent journey. Record actual Google acceptance separately after
the client is configured; retain only redacted outcomes, never codes or tokens.

Provider instructions: [Supabase Google setup](https://supabase.com/docs/guides/auth/social-login/auth-google)
and [redirect allowlists](https://supabase.com/docs/guides/auth/redirect-urls).
