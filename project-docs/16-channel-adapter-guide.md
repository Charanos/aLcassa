# 16 · Channel Adapter Guide

**Status:** for review and signature at M0.
**Scope:** the Phase 2 seam. Phase 1 delivers the table, the typed interface and these rules. Phase 1 builds no adapter and no webhook receiver.
**Code:** `src/modules/channels/types.ts`, `src/db/schema/seams.ts`, `src/db/policies/06_seams.sql`, `src/app/api/webhooks/[channel]/route.ts`.

---

## 1. Why this document exists, and why now

`04 ADR-011` names three seams. This is the one Phase 2 depends on most, and the one the brief names as its biggest risk.

The mitigation is timing rather than cleverness: **the contract is reviewed and signed at M0, before the schema locks.** A wrong assumption about the event shape costs an afternoon in week one and a migration plus a re-write of the processing layer in month four. Everything below is deliberately settled early so it can be settled cheaply.

It is also the artefact that most directly serves *"handed to other hands"*, which is Requirement 7. A developer who has never met us should be able to write the WhatsApp adapter from this document alone.

---

## 2. The `channel_connections` table

One row per connected account, per tenant. `src/db/schema/seams.ts`.

| Field | Purpose |
|---|---|
| `id` | Primary key. This is the `connectionId` on every event. |
| `tenant_id` | Owner. Every RLS policy on this table scopes to it. |
| `channel` | `whatsapp` · `instagram` · `messenger` · `widget` |
| `display_name` | What the tenant calls this connection. Theirs to set, shown in their UI. |
| `status` | `disconnected` · `connecting` · `connected` · `error` |
| `external_account_ref` | The provider's ID for the account. Unique per tenant per channel. |
| `credentials_ref` | **A pointer into Supabase Vault, never the secret.** `04 ADR-008`. |
| `connected_at` | When the handshake last completed. |
| `last_event_at` | When traffic last arrived. The field that answers "is this actually working". |
| `config` | Per-adapter JSON. Non-secret settings only; anything secret is a vault reference. |

`status` defaults to `disconnected` rather than `pending`, because a row that exists but has never completed a handshake is genuinely disconnected — not half-connected.

---

## 3. The internal event shape

`07 §11`, in code at `src/db/schema/seams.ts` as `InboundMessageEvent`, with a Zod mirror at `src/modules/channels/types.ts`.

Every adapter normalises its provider's payload into exactly this. The processing layer above never sees a provider shape.

| Field | Notes |
|---|---|
| `eventId` | **The provider's ID. This is the idempotency key.** Not ours, because the provider is the one that redelivers. |
| `tenantId` | Resolved during verification, from the connection record. **Never from the request body.** See §6. |
| `channel` | One of the four. |
| `connectionId` | Which connection received it. |
| `receivedAt` | ISO 8601, when *we* received it, not when the provider claims it was sent. Clock skew on a provider is not our problem to inherit. |
| `sender.externalId` | The provider's user ID. Stable, non-personal. |
| `sender.displayName` | Optional. |
| `sender.handle` | ⚠ **PERSONAL DATA.** Redacted in logs. |
| `content.type` | `text` · `image` · `audio` · `video` · `document` · `location` · `unsupported` |
| `content.text` | ⚠ **PERSONAL DATA.** Redacted in logs. |
| `content.mediaRef` | A storage reference, not a provider URL — provider URLs expire. |
| `content.mimeType` | |
| `replyToExternalId` | Threading, where the provider supports it. |
| `metadata` | Anything provider-specific worth keeping. Not interpreted upstream. |

**`unsupported` is a first-class content type, not an error.** A provider will introduce a message kind we do not handle, and the correct behaviour is to record that a message arrived and could not be rendered — not to drop it and leave a customer wondering why nobody replied.

The two personal-data fields are marked in three places: the type comment, the Zod schema, and `PERSONAL_DATA_PATHS`. `06 §11` forbids customer data reaching a log; a comment alone does not survive `JSON.stringify`.

---

## 4. The adapter interface

`ChannelAdapter`, five methods, in `src/modules/channels/types.ts`.

| Method | Contract |
|---|---|
| `connect` | Begin or complete the provider handshake. Returns the `externalAccountRef` to store. |
| `disconnect` | Revoke at the provider, mark disconnected. **Must be safe to call twice.** |
| `verifyWebhook` | Authenticate the request and resolve the tenant. Runs **before** the body is parsed. |
| `normaliseInbound` | Provider payload → `InboundMessageEvent[]`. **Pure: no IO.** |
| `sendOutbound` | Send. Honours `idempotencyKey`. |

**`normaliseInbound` is pure on purpose.** It takes a string and returns events, with no database and no network. That is what lets a Phase 2 adapter be proven correct against recorded fixtures without a live provider account, which is the difference between a test suite that runs in CI and one that runs on a good day.

It returns an **array** because a single webhook delivery commonly carries a batch.

**An adapter never touches the database.** It normalises and returns. Persistence, audit and tenant scoping all happen above it, inside `withTenantContext`.

---

## 5. Webhook handler requirements

In order. The order is the requirement.

1. **Verify first.** Before parsing, before logging, before anything.
2. **Read the raw body, not `req.json()`.** A signature is computed over the exact bytes sent. Parsing and re-serialising changes them — the check then fails for legitimate requests and can be made to pass for crafted ones.
3. **Return 200 fast.** Providers time out in seconds and retry aggressively. Acknowledge, then work asynchronously.
4. **Be idempotent on `eventId`.** Providers redeliver. Retained `RETRY_POLICY.idempotencyWindowDays` = 7 days; providers commonly retry for 24 hours, so this is deliberate headroom.
5. **Store the raw payload.** When a normalisation bug is found in month four, the raw payloads are what makes replay possible.

The route shell at `src/app/api/webhooks/[channel]/route.ts` implements steps 1 and 2 and returns `501` for the rest. Steps 1–2 are built because they are what makes step 3 possible at all: a handler that has already consumed the body as JSON cannot verify it afterwards.

---

## 6. Resolving the tenant — the subtle part

**This is the one most likely to be got wrong, and it is the one that ends the business if it is.**

An inbound webhook arrives with no session and no tenant context. The tenant must be resolved, and there is exactly one correct source:

> Look up the connection by the provider's account reference, inside `verifyWebhook`. The `tenantId` comes from that row.

**Never from the request body.** A webhook body is attacker-controlled. A `tenantId` read out of one is a cross-tenant write, which is the single failure `06` exists to prevent. `06 §2` forbids reading a tenant id off a request in general; this route is where the temptation is strongest, because the body often contains something that looks like a tenant identifier.

Once resolved, everything downstream runs inside `withTenantContext` with that id, and RLS does the rest — the same way every other write in this system works. The webhook path gets no exemption.

If the connection is unknown, return `{ valid: false, reason: 'unknown_connection' }`. Do not create anything.

---

## 7. Retry and poison messages

`RETRY_POLICY` in `src/modules/channels/types.ts`, as data rather than prose so it can be asserted in a test.

| Rule | Value |
|---|---|
| Max attempts | 5, attempt 1 being the original delivery |
| Backoff | Exponential with jitter, 1s base, 60s ceiling |
| On exhaustion | **Dead-letter record, never a silent drop** |
| Idempotency window | 7 days |

**A poison message that vanishes is a customer whose message was never answered and nobody knows.** It is retained with its raw payload so it can be replayed once the defect is fixed. This is the rule most likely to be traded away under delivery pressure and the one least recoverable afterwards.

---

## 8. Worked example

A hypothetical adapter, in enough detail to copy.

```ts
import type { ChannelAdapter, InboundMessageEvent } from '@/modules/channels';

export const exampleAdapter: ChannelAdapter = {
  channel: 'whatsapp',

  async connect({ tenantId, config }) {
    // Exchange the code for a long-lived token, store the TOKEN IN VAULT and
    // the returned reference on the connection row. Never the token itself.
    const account = await providerOAuthExchange(config);
    return { ok: true, externalAccountRef: account.id };
  },

  async disconnect({ connectionId }) {
    await providerRevoke(connectionId);   // must tolerate already-revoked
    return { ok: true };
  },

  async verifyWebhook({ rawBody, headers }) {
    // 1 · signature over the RAW bytes
    const signature = headers['x-provider-signature'];
    if (!signature || !timingSafeEqual(sign(rawBody), signature)) {
      return { valid: false, reason: 'bad_signature' };
    }

    // 2 · tenant from the CONNECTION RECORD, never from the body
    const accountRef = headers['x-provider-account'];
    const connection = await findConnectionByAccountRef(accountRef);
    if (!connection) return { valid: false, reason: 'unknown_connection' };

    return { valid: true, tenantId: connection.tenantId, connectionId: connection.id };
  },

  normaliseInbound({ rawBody, tenantId, connectionId }): InboundMessageEvent[] {
    // PURE. No IO. Testable against a recorded fixture.
    const payload = JSON.parse(rawBody) as ProviderPayload;

    return payload.messages.map((m) => ({
      eventId: m.id,                       // the provider's id = idempotency key
      tenantId,
      channel: 'whatsapp',
      connectionId,
      receivedAt: new Date().toISOString(),
      sender: { externalId: m.from, handle: m.profile?.phone },   // handle = personal data
      content:
        m.type === 'text'
          ? { type: 'text', text: m.text.body }                    // text = personal data
          : { type: 'unsupported' },                               // never drop it
      replyToExternalId: m.context?.id,
      metadata: { providerTimestamp: m.timestamp },
    }));
  },

  async sendOutbound(message) {
    const res = await providerSend(message, { idempotencyKey: message.idempotencyKey });
    return res.ok
      ? { ok: true, externalMessageId: res.id }
      : { ok: false, retryable: res.status >= 500, code: res.code, message: res.message };
  },
};
```

---

## 9. Sign-off

| Item | Confirmed |
|---|---|
| The `channel_connections` table and its fields | |
| The `InboundMessageEvent` shape, field by field | |
| Which fields are personal data | |
| The five-method adapter interface | |
| Webhook ordering: verify first, 200 fast, async, idempotent, store raw | |
| Tenant resolution from the connection record, never the body | |
| Retry policy and dead-lettering | |

**Signed at M0 by:** ______________________  **Date:** ______________

Changing anything above after M1 means the schema has already locked against it. That is the cost this document exists to avoid.
