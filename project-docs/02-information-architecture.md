# 02 · Information Architecture

**Scope:** every route in Phase 1, across two applications sharing one codebase.
**Stack:** Next.js 15 App Router, route groups, server components by default, middleware for auth and tenant resolution.

---

## 1. Two applications, one deployment

```
┌───────────────────────────────────────────────────────────────────────┐
│  MARKETING AND ACCESS                                    unauthenticated │
│  /  ·  /sign-in  ·  /sign-up  ·  /invite/[token]  ·  /legal/*          │
└──────────────────────┬────────────────────────────────────────────────┘
                       │
        ┌──────────────┴───────────────┐
        ▼                              ▼
┌──────────────────────┐    ┌────────────────────────────────┐
│  TENANT APPLICATION  │    │  PLATFORM CONSOLE              │
│  /app/*              │    │  /platform/*                   │
│  session + tenant    │    │  separate owner login          │
│  RLS-bound           │    │  service role OR support session│
│  roles: owner,       │    │  role: platform_admin          │
│  admin, agent        │    │                                │
└──────────────────────┘    └────────────────────────────────┘
```

They are deliberately separate URL trees on the same deployment. Not subdomains, which would add DNS, certificate and cookie complexity for no Phase 1 benefit. Not the same tree with a role switch, which invites a permission mistake.

**Route group layout:**

```
app/
  (marketing)/          public, indexed
  (access)/             sign-in, sign-up, invite, reset. noindex
  (tenant)/app/         authenticated tenant users
  (platform)/platform/  authenticated platform admins
  api/v1/               session door
  api/service/v1/       machine door
```

---

## 2. Marketing and legal

Minimal. Brian has not asked for a marketing site and it is not in scope. What exists is the shell needed to sign in, sign up and satisfy legal obligations.

| Route | Purpose | Index |
|---|---|---|
| `/` | Single page: what the product is, one call to action, sign-in link | Yes |
| `/legal/terms` | Terms of service | Yes |
| `/legal/privacy` | Privacy notice | Yes |
| `/legal/dpa` | Data processing terms for tenants. **See `01 D-09`** | Yes |
| `/status` | Public status page, hosted externally, linked | n/a |

The DPA page is not decoration. Brian is a processor for his tenants, who are controllers for their customers. That relationship needs to exist in writing before his first paying customer, and a linked page is the cheapest correct version.

---

## 3. Access

| Route | Purpose | Notes |
|---|---|---|
| `/sign-in` | Tenant user sign-in | Email and password. `?next=` preserved throughout |
| `/sign-up` | New tenant registration | Creates tenant, membership and owner in one transaction |
| `/sign-up/verify` | Email confirmation | |
| `/forgot-password` | Request reset | Always reports success, never confirms an account exists |
| `/reset-password` | Token-scoped reset | Single use, 30 minute expiry, invalidates all sessions on success |
| `/invite/[token]` | Accept an invitation | Resolves tenant and role from the token, then registers or signs in |
| `/platform/sign-in` | **Separate owner login** | Distinct route, distinct session cookie, distinct rate limit. No link from the tenant sign-in page |

Requirement 4 says "separate owner login" and that is taken literally: a different URL, a different cookie name, a different session table row type, and no navigational path between the two. A platform admin who is also a tenant user holds two sessions and switches by URL.

---

## 4. Tenant application

All under `/app`. Middleware resolves the session, then the membership, then the tenant. A user with no membership is bounced to a holding state rather than a 403, because that state means something went wrong during provisioning and it needs to be visible.

| Route | Purpose | Roles |
|---|---|---|
| `/app` | Overview: plan usage, team size, recent activity, setup checklist | all |
| `/app/settings` | Redirects to `/app/settings/company` | owner, admin |
| `/app/settings/company` | Name, logo, contact, timezone, locale | owner, admin |
| `/app/settings/team` | Members, roles, pending invitations, revoke | owner, admin |
| `/app/settings/team/invite` | Send an invitation | owner, admin |
| `/app/settings/credentials` | API credentials, masked, scopes, last used, rotate, revoke | owner |
| `/app/settings/credentials/new` | Create. **The only screen that ever shows a secret** | owner |
| `/app/settings/ai-rules` | Tenant AI rules editor, version history, what master locks | owner, admin |
| `/app/settings/subscription` | Plan, entitlements, usage against limits, status | owner |
| `/app/settings/audit` | Tenant's own audit log, filterable | owner, admin |
| `/app/account` | The signed-in user: name, email, password, sessions | all |
| `/app/account/sessions` | Active sessions, revoke individually or all | all |
| `/app/inbox` | **Placeholder, designed.** See §5 | all |
| `/app/billing` | **Placeholder, designed.** See §5 | owner |

### Setup checklist

`/app` carries a checklist for a newly provisioned tenant: verify email, complete company profile, invite a team member, create an API credential, set AI rules. It disappears permanently once complete, and it never reappears. A checklist that comes back is a nag.

This is the highest-value four hours in the tenant application. A B2B owner's entire first impression is whether they knew what to do next.

---

## 5. The placeholder surfaces

Requirement 5 asks for placeholder links to Messaging Inbox and Billing. `01 D-05` decides they are designed surfaces rather than disabled nav items.

**`/app/inbox`** renders the tenant application shell with a centred panel: what the inbox will do, that channel connections are coming in the next phase, and a single action to be notified. No fake message list, no greyed-out mock, no "coming soon" badge floating over a blurred screenshot. Those read as unfinished. A plain, well-set explanation reads as deliberate sequencing.

**`/app/billing`** renders the current plan and entitlements read-only, states that payment is handled directly for now, and gives the contact route. This is honest: the subscription data model exists, the payment gateway does not.

Both are real routes with real metadata, in the navigation, not disabled. Copy in `10 §7`.

---

## 6. Platform console

All under `/platform`. This is Brian's workspace and it is built for density and keyboard.

| Route | Purpose |
|---|---|
| `/platform` | Overview: tenant count by status, subscriptions by tier, tenants approaching a limit, tenants past due, recent platform actions |
| `/platform/tenants` | All tenants. Searchable, filterable by plan, status, usage. The main working surface |
| `/platform/tenants/new` | Provision a tenant |
| `/platform/tenants/[id]` | Tenant record: profile, plan, usage, members, credentials metadata, audit |
| `/platform/tenants/[id]/plan` | Assign or override a plan, set custom limits |
| `/platform/tenants/[id]/suspend` | Suspend with reason. Confirmation required |
| `/platform/plans` | Plan and tier definitions, entitlement editor |
| `/platform/plans/[id]` | Entitlements, limits, affected-tenant count before saving |
| `/platform/ai-rules` | **Master AI rules.** Singleton. Version history, diff, publish |
| `/platform/health` | Service status, database and cache metrics, error rates, limit and dunning watchlist |
| `/platform/audit` | Platform audit log, including every support-mode session |
| `/platform/admins` | Platform admin accounts, if more than one is required. See `01 §9` question 6 |

### The organization switcher

Not a route. A persistent control in the console header, available from every `/platform` page. Searchable by tenant name, showing plan tier and status inline. Selecting a tenant mints a support session and navigates to that tenant's `/app` view with the boundary frame applied.

Full behaviour in `09 §3`. Visual treatment in `03 §8`, where it is the signature element of the design system.

---

## 7. API namespaces

Two doors, deliberately different paths so a misrouted credential fails loudly rather than quietly working.

| Namespace | Auth | Consumer |
|---|---|---|
| `/api/v1/*` | Session cookie | The browser, both applications |
| `/api/service/v1/*` | `Authorization: Bearer` API key with scopes | FastAPI, AGNO, any future integration |
| `/api/platform/v1/*` | Platform session | Console operations only |
| `/api/webhooks/*` | Signature verification | Phase 2 seam. Route exists, handlers do not |

Full contract in `07`.

---

## 8. Navigation model

**Tenant application.** Persistent left sidebar at 240px, collapsible to a 56px icon rail, state persisted per user. Three groups: Workspace (Overview, Inbox), Settings (Company, Team, Credentials, AI Rules, Subscription, Audit), Account. Role-filtered, so an agent simply does not see Credentials rather than seeing it disabled. On mobile the sidebar becomes a bottom sheet triggered from the header, since a settings-heavy application does not suit a bottom tab bar.

**Platform console.** Same shell, different accent treatment per `03 §4`, with the organization switcher in the header and a command palette on `Cmd/Ctrl+K` covering tenant lookup by name or ID, navigation, and verbs like `suspend tenant` and `assign plan`.

**Breadcrumbs** on every detail route in both applications. The final crumb is text, not a link.

---

## 9. URL and identifier conventions

| Rule | Detail |
|---|---|
| Case | Lowercase, hyphen separated |
| Tenant identifiers in URLs | UUID, never a slug, never sequential. A guessable tenant URL is an invitation to probe |
| Tenant slug | Exists for display and for a future custom subdomain. Not used for routing in Phase 1 |
| API credential prefix | `csk_live_` and `csk_test_`, first 8 characters shown masked. The prefix is searchable, the secret is not |
| Invitation tokens | 32 bytes from a CSPRNG, hashed at rest, single use, 7 day expiry |
| Query parameters | Filters and pagination only |
| Trailing slash | Off |

---

## 10. Metadata and indexing

`robots.txt` disallows `/app`, `/platform`, `/api` and `/invite`. Only the marketing page and the three legal pages are indexed. `generateMetadata` per route. No structured data beyond `Organization` on `/`, because there is nothing else worth marking up and inventing schema for an unlaunched product is noise.

---

## 11. Error and empty routes

| Route | Handling |
|---|---|
| `error.tsx` per group | Reset action plus a support reference that maps to the request ID |
| `not-found.tsx` per group | A missing tenant reads differently from a missing settings page |
| No membership | Dedicated state explaining that the account is not attached to a workspace, with a contact route. Never a bare 403 |
| Suspended tenant | Explains the suspension and who to contact. Never a login loop |
| Expired invitation | Explains expiry and offers to request a new one from the inviter |
| Entitlement exceeded | Names the limit, the current usage and the upgrade path. Never a generic denial |

Empty states are designed surfaces, specified in `03 §16`. In a platform whose main product does not exist yet, the empty states are most of what a new user sees.
