# 10 · Copy Deck

Every string a person reads. Written once, here, so the product has one voice.

---

## 1. Voice

The audience is a technical or semi-technical business owner and, in the console, an operator. The voice should sound like competent infrastructure documentation written by someone who respects the reader's time.

| Do | Don't |
|---|---|
| "This key is shown once. Copy it now." | "Oops! Don't forget to save your key! 🔑" |
| "You have used 12 of 15 seats." | "You're almost at your limit!" |
| "Support mode · Acme Logistics · 24:18 remaining" | "You're viewing a customer account" |
| "Messaging arrives in the next phase." | "Coming soon! Stay tuned!" |
| "Only the owner can create credentials." | "You don't have permission to do that." |

### Rules

1. **Sentence case.** Everywhere except `--t-label` and `--t-data-caps`.
2. **Say what happens.** A button called `Publish rules` produces a confirmation that says `Rules published`. Same verb throughout.
3. **Never apologise for the system.** State what happened and what to do.
4. **Name the actor.** "Only the owner can do this" beats "you do not have permission", because it tells the reader who to ask.
5. **Numbers are numerals.** 12 of 15, not "twelve of fifteen", not "almost all".
6. **No AI vocabulary.** The words leverage, seamless, empower, journey, unlock, revolutionise, robust and delve do not appear in this product.
7. **No em dashes.** Commas, colons, semicolons or a rewrite.
8. **No exclamation marks.** Not one, anywhere.
9. **No emoji.** Not in the interface, not in copy, not in commit messages.
10. **Technical terms are used correctly and not explained twice.** The audience knows what an API key is. They may not know what an entitlement is, so that one gets a sentence.

---

## 2. Marketing page

**Eyebrow** `Customer support platform`

**Headline** `One inbox for every message your customers send.`

**Subhead** `WhatsApp, Instagram, Messenger and your website, handled in one place by one team. Currently in development.`

**Primary action** `Sign in`
**Secondary** `Request access`

**Honest status line, below the fold**
`The platform foundation is live. Channel connections arrive in the next phase. If you are an early customer, your workspace is already provisioned and you can set up your team now.`

That paragraph is unusual on a marketing page and it is correct here. Brian has real early customers with real accounts and a product whose main surface does not exist yet. Saying so plainly is better than a page that implies otherwise.

---

## 3. Access

| Screen | Copy |
|---|---|
| Sign in heading | `Sign in` |
| Sign in fields | `Email` · `Password` |
| Sign in action | `Sign in` |
| Forgot link | `Forgot your password?` |
| Sign up heading | `Create your workspace` |
| Sign up fields | `Your name` · `Company name` · `Email` · `Password` |
| Sign up action | `Create workspace` |
| Sign up legal | `By creating a workspace you agree to the terms of service and the privacy notice.` |
| Verify heading | `Check your email` |
| Verify body | `We sent a confirmation link to {email}. It expires in 24 hours.` |
| Verify resend | `Send it again` |
| Forgot heading | `Reset your password` |
| Forgot body | `Enter your email and we will send a reset link.` |
| Forgot result | `If an account exists for {email}, a reset link is on its way.` |
| Reset heading | `Choose a new password` |
| Reset note | `Setting a new password signs you out everywhere else.` |
| Platform sign in heading | `Platform sign in` |
| Platform sign in note | `This account manages every workspace. Access is logged.` |

**Invitation**

Heading `Join {companyName}`
Body `{inviterName} invited you to join {companyName} as {role}.`
Action `Accept invitation`
Expired `This invitation expired on {date}. Ask {inviterName} to send a new one.`
Already accepted `You have already joined {companyName}. Sign in to continue.`
Revoked `This invitation was withdrawn. Ask {inviterName} if you think that is a mistake.`

---

## 4. Setup checklist

Heading `Set up your workspace`
Body `Five steps. You can come back to any of them.`

| Step | Label | Done state |
|---|---|---|
| 1 | `Confirm your email` | `Email confirmed` |
| 2 | `Add your company details` | `Company details added` |
| 3 | `Invite your team` | `{n} people invited` |
| 4 | `Create an API credential` | `Credential created` |
| 5 | `Set your assistant rules` | `Rules published` |

Complete state `Your workspace is set up.` The checklist then disappears permanently and does not return.

---

## 5. Team and credentials

**Team**

Heading `Team`
Empty `It is just you so far. Invite the people who will handle your customer messages.`
Invite action `Invite someone`
Invite fields `Email` · `Role`
Role descriptions:
- `Owner` — `Full access, including billing, credentials and team roles. One owner per workspace.`
- `Admin` — `Manages settings, the team and assistant rules. Cannot manage credentials.`
- `Agent` — `Handles customer messages. Read-only access to settings.`

Last owner error `Every workspace needs an owner. Transfer ownership before removing this account.`
Seat limit error `Your plan includes {limit} seats and {current} are in use. Remove someone or ask us about a larger plan.`

**Credentials**

Heading `API credentials`
Description `Credentials let your systems read your assistant rules and, in a later phase, send and receive messages.`
Empty `No credentials yet. Create one when you are ready to connect a system.`
Create action `Create credential`
Fields `Name` · `Environment` · `Scopes`
Name helper `Something you will recognise later, like "Production assistant".`

**The reveal screen**

Heading `Your new credential`
Warning `This is the only time this key will be shown. Copy it now and store it somewhere safe.`
Copy action `Copy key`
Copy confirm `Copied`
Download action `Download as .env`
Confirm action `I have saved this key`
Confirm disabled tooltip `Copy or download the key first.`

**Credential list states**
Never used `Never used`
Last used `Last used {relativeTime}`
Unused 90 days `Not used in 90 days. Revoke it if it is no longer needed.`
Rotating `Rotating. The previous key stops working in {countdown}.`
Revoked `Revoked {date}`

Revoke confirmation
`Revoke {name}? Any system using this key stops working immediately. This cannot be undone.`
Type-to-confirm prompt `Type the credential name to confirm`

---

## 6. Subscription and limits

**24 Aug 2026:** plans are Pro, Business and Custom, confirmed in `08 §2`. No plan name is hardcoded below; `{planName}` continues to interpolate whichever plan applies, so nothing in this section needed to change for the new tiers themselves. `conversations_monthly` and `support_sla_hours` reuse the limit-bar and at-limit strings below like any other entitlement, except `support_sla_hours`, which is a feature value shown once on the plan card rather than a bar; it needs one string, added below.

Heading `Plan and usage`
Plan line `You are on {planName}.`
Period `Your current period ends {date}.`
Support SLA line (feature, not a limit bar) `Support response within {hours} hours.`

Limit bar labels: `{current} of {limit}` · unlimited renders `{current} of ∞`

At 80% `You are using {percent}% of your {entitlementName}.`
At limit `You have used all {limit} {entitlementName}. Ask us about a larger plan.`

Override notice `You have been granted {limit} {entitlementName}, above your plan. {reason}` and, when it expires, `This grant ends on {date}.`

Payment note
`Payment is handled directly for now rather than through this dashboard. Get in touch and we will sort it out.`

Past due
`Your workspace is past due. You can still see everything, but changes are paused until this is resolved. Get in touch and we will help.`

Suspended
`This workspace is suspended. {reason} You can still see everything here; changes are paused until this is resolved. Get in touch to resolve it.`

**Amended 24 Aug 2026.** Suspension's read-only behaviour moved from recommended to confirmed in `06 §8`; this string now says so directly rather than leaving it implied by the separate "Past due" string above, which already stated it.

---

## 7. The placeholder surfaces

`01 D-05` decided these are designed surfaces. This is the copy.

**Messaging inbox**

Heading `Messaging arrives next`
Body
`This is where every message from WhatsApp, Instagram, Messenger and your website will land in one thread per customer, handled by your team.`
`The platform underneath it is built and running: your workspace, your team, your credentials and your assistant rules are all live and ready for it.`
`Channel connections are the focus of the next phase.`
Action `Tell me when it is ready`
Confirmation `We will email {email} when messaging is live.`

**Billing**

Heading `Billing`
Body
`Your plan and usage are shown under Plan and usage. Payment is arranged directly for now rather than through this dashboard.`
`Self-service billing arrives alongside messaging.`
Action `Get in touch about your plan`

Neither surface shows a mock, a blurred screenshot or a countdown. Plain type on a plain surface reads as deliberate sequencing rather than an unfinished product.

---

## 8. Assistant rules

Heading `Assistant rules`
Description `These instructions shape how the assistant replies to your customers. Changes take effect within a few seconds.`

Field labels and helpers:
- `Tone` — `How the assistant should sound. For example: warm and direct, never pushy.`
- `Response guidelines` — `How replies should be structured, how long they should be, when to ask a question back.`
- `Business information` — `What the assistant should know about you: hours, locations, policies, common answers.`
- `Escalation` — `When the assistant should hand over to a person instead of replying.`
- `Prohibited topics` — `Subjects the assistant should never discuss. Your entries are added to ours.`
- `Custom instructions` — `Anything else.`

Locked field notice
`This is set by the platform and cannot be changed here. Current value: "{value}"`

Prohibited topics note
`These are combined with the platform's list. You can add topics and cannot remove the platform's.`

Publish action `Publish rules`
Publish confirmation `Rules published. The assistant is using them now.`
Version note field `What changed?` with helper `One line. You will thank yourself later.`
Version history heading `Version history`
Rollback action `Restore this version`
Rollback confirmation `Restore version {n}? Your current rules stay in the history.`
Version limit `Your plan retains {limit} versions. Older ones are archived.`
Conflict error `These rules were changed by {name} while you were editing. Review the differences before publishing.`

---

## 9. Audit

Heading `Activity`
Description `Every change made in this workspace, including any time our support team looked into it.`
Empty `Nothing yet. Activity appears here as you and your team make changes.`

Support mode entries
`{platformAdminName} from support opened this workspace` and, where a reason exists, `Reason: {reason}`
`{platformAdminName} from support closed this workspace`

**24 Aug 2026, per `01 D-13`:** support mode is now read and write, so individual actions taken during a session appear as their own entries, attributed the same way any tenant action is, plus the existing open and close entries above marking the session's boundaries. No new string is needed for an individual action; it reuses whatever entry that action already produces elsewhere in this document, which is what makes "you can see every time we look at your workspace" (`06 §6`) still true when a look can now include a change.

Retention note `Your plan keeps {days} days of activity.`

Export action `Export as CSV`
Export note `Exporting is recorded in this log.`

---

## 10. Platform console

Shorter, denser, no reassurance.

| Situation | Copy |
|---|---|
| Overview attention band, empty | `Nothing needs attention.` |
| Tenant grid, empty | `No workspaces match these filters.` |
| Provision action | `Create workspace` |
| Suspend confirmation | `Suspend {name}? Their team keeps read access and cannot make changes.` |
| Suspend reason field | `Reason (appears in their workspace)` |
| Reactivate | `Reactivate {name}?` |
| Plan change preview | `This moves {name} from {old} to {new}. Seats {oldSeats} to {newSeats}.` |
| Plan edit warning | `This plan is used by {n} workspaces. {m} of them would be over the new limit immediately.` |
| Override grant | `Grant {name} {limit} {key}. Reason is required and appears in their workspace.` |
| Master rules publish | `Publish master rules? This affects all {n} workspaces and takes effect within five seconds.` |
| Switcher prompt | `Enter support mode for {name}?` |
| Switcher body | `You will be able to view and change their workspace as support. Every action is recorded in their activity log and yours.` |
| Switcher reason | `Reason (optional, appears in both logs)` |
| Support entered toast | `Support mode. {name}.` |
| Support expiring | `Support session ends in 2 minutes.` |
| Support extend | `Stay for another 30 minutes` |
| Support expired | `Your support session ended. Switch in again to continue.` |
| Service role notice | `This action uses platform-level access and is recorded.` |
| Isolation panel, pass | `Isolation: {n} of {n} tables passing, checked {time}.` |
| Isolation panel, fail | `Isolation: {failed} of {n} tables failing. Merges are blocked.` |
| Audit export | `Exported {n} entries. This export is recorded.` |

---

## 11. Boundary frame

The frame's own strings, in `--t-data-caps`.

Top block `SUPPORT MODE · {TENANT NAME} · {MM:SS}`
Bottom block `EXIT`
Expired state `SESSION ENDED · SWITCH IN AGAIN`
Staging variant `STAGING`

Screen reader announcement on entry
`Support mode active. You are viewing {tenantName} as support, with the ability to make changes. The session ends after thirty minutes of inactivity.`

**Amended 24 Aug 2026,** matching the switcher body above. The visual frame, its copper colour and its countdown are unchanged; only the permission claim in the announcement changed, per `01 D-13`.

Screen reader announcement on exit
`Support mode ended. You are back in the platform console.`

---

## 12. Errors and empty states

| Situation | Copy |
|---|---|
| No membership | `Your account is not attached to a workspace. If you were invited, use the link in your invitation email. Otherwise get in touch.` |
| Session expired | `You have been signed out. Sign in again and we will bring you back here.` |
| Account locked | `Too many sign-in attempts. Try again in {minutes} minutes.` |
| Rate limited | `That is a lot of requests in a short time. Wait {seconds} seconds and try again.` |
| Version conflict | `Someone else changed this while you had it open. Reload to see the current version.` |
| Permission denied | `Only the {role} can do this.` |
| Support write denied | `Support mode cannot do this here.` Used for the three permanent carve-outs in `01 D-13`: revealing a credential secret, extending a support session's own timeout, or acting as a member's own account |
| Not found | `That is not here, or you do not have access to it.` |
| 500 | `Something broke on our side. We have logged it. Reference {requestId} if you get in touch.` |
| Offline | `You are offline. Nothing has been lost. We will retry when you reconnect.` |
| Maintenance | `We are running a database update. Back in a few minutes.` |

---

## 13. Service door documentation strings

Read by developers, so they are shorter and more precise.

Rules endpoint description
`Returns the compiled assistant rules for the tenant that owns this credential. Master and tenant rules are merged; the provenance object shows the source of each field.`

**24 Aug 2026:** this endpoint is served by FastAPI rather than by a Next.js route, per `01 D-14`. The description, the request and the response below are unchanged; only the sentence a developer might see in service status tooling naming which service answered the request is new, and it is out of scope for this deck since it is operational rather than copy.

Caching guidance
`Send the ETag from your last response as If-None-Match. A 304 confirms nothing has changed and costs almost nothing. A published change is visible within 5 seconds under normal conditions, and within 300 seconds in the worst case if cache invalidation fails.`

Scope error
`This credential does not have the {scope} scope. Add it in the dashboard under API credentials.`

Not implemented
`This endpoint is reserved for a later phase and is not yet available. The response shape is documented so you can build against it.`

---

## 14. Transactional email

Kept minimal. Five templates in Phase 1.

| Template | Subject | Opening line |
|---|---|---|
| Verify email | `Confirm your email` | `Click the link below to confirm your email and finish setting up {companyName}.` |
| Invitation | `{inviterName} invited you to {companyName}` | `You have been invited to join {companyName} as {role}.` |
| Password reset | `Reset your password` | `Use the link below to set a new password. It expires in 30 minutes.` |
| Credential created | `A new API credential was created` | `{actorName} created the credential "{name}" in {companyName}. If this was not expected, revoke it in your dashboard.` |
| Support session | `Our support team opened your workspace` | `{platformAdminName} opened {companyName} to help with a support request.` |

The last two are unusual and both are worth sending. A credential creation notification catches a compromised account. A support session notification is the transparency claim in `09 §7` made active rather than passive, and it costs one email.
