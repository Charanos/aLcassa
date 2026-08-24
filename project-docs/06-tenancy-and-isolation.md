# 06 · Tenancy and Isolation

**This is the document to read most carefully.** Everything else in this engagement is ordinary SaaS engineering. This part is what Brian is actually buying, and it is the part that ends a business if it fails once.

---

## 1. The guarantee, stated precisely

> No request, through any door, in any role, including the platform owner's, can read or write a row belonging to a tenant other than the one resolved for that request by the server.

Four things in that sentence are load-bearing:

- **Any door.** Session and service key must be equally bound.
- **Any role.** Including `owner`, including `platform_admin` in support mode.
- **Read or write.** A policy that prevents reading but permits a tenant reassignment on update is not isolation.
- **Resolved by the server.** Never from anything the client sent.

---

## 2. Three rules

From the brief, restated with what each one costs to keep.

### Rule 1 · Every tenant-scoped table carries `tenant_id` and a policy. A table without a policy fails the build.

The enforcement is a CI script, not a review habit:

```ts
// scripts/check-policies.ts — runs before tests in CI
const tenantScoped = await introspectTablesWithColumn('tenant_id');
const withRls = await introspectRlsEnabled();
const policies = await introspectPolicies();

for (const table of tenantScoped) {
  assert(withRls.has(table), `${table} has tenant_id but RLS is not enabled`);
  assert(policies.select(table).length > 0, `${table} has no SELECT policy`);
  assert(policies.modify(table).length > 0, `${table} has no modify policy`);
  for (const p of policies.modify(table)) {
    assert(p.withCheck, `${table}.${p.name} has no WITH CHECK clause`);
  }
}
```

Three assertions, perhaps forty lines with the introspection queries. It is the highest-value script in the repository.

### Rule 2 · The application never trusts a `tenant_id` from the browser.

It is resolved server side, in middleware, from the session and the membership record, and then set on the database connection. A request body containing `tenantId` is not an error; it is simply ignored, and a lint rule prevents anything reading it.

### Rule 3 · The service role key exists only in server-side platform routes, and every call it makes writes an audit entry.

Enforced by ESLint on the import path. `01 D-02`, `05 I-05`, `§7` below.

---

## 3. How the context is set

The single most important twenty lines in the codebase.

```ts
// src/lib/db/withTenantContext.ts
export async function withTenantContext<T>(
  ctx: ResolvedContext,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set once, on this connection, for the life of this transaction.
    await tx.execute(sql`select set_config('app.tenant_id', ${ctx.tenantId}, true)`);
    await tx.execute(sql`select set_config('app.role', ${ctx.role}, true)`);
    await tx.execute(sql`select set_config('app.support_mode', ${String(ctx.supportMode)}, true)`);
    await tx.execute(sql`select set_config('app.actor_id', ${ctx.actorId}, true)`);
    return fn(tx);
  });
}
```

Three details that matter more than they look:

1. **`true` as the third argument to `set_config` makes it transaction-local.** Without it the setting persists on a pooled connection and leaks into the next request, which is the exact failure this whole document exists to prevent. This is the single most dangerous line in the project and it gets a comment saying so.
2. **Every query runs inside a transaction**, even a read, so context and query cannot be separated by connection reuse.
3. **`ResolvedContext` is only ever produced by the middleware resolver.** It has a private brand type so it cannot be constructed by hand elsewhere in the codebase.

```ts
declare const brand: unique symbol;
export type ResolvedContext = {
  readonly [brand]: 'ResolvedContext';
  tenantId: string;
  role: 'owner' | 'admin' | 'agent' | 'support';
  actorId: string;
  supportMode: boolean;
};
```

A branded type is a small thing that makes an entire category of mistake impossible to write.

---

## 4. The isolation test suite

The suite is the deliverable that proves the guarantee. It runs in CI on every pull request, and it blocks merge with no override path.

### Shape

For each tenant-scoped table, with tenant A and tenant B seeded with recognisable data:

| # | Case | Expected |
|---|---|---|
| 1 | As A, select all rows | Only A's rows. Count matches exactly |
| 2 | As A, select B's row by its known primary key | Zero rows. **Not an error, zero rows** |
| 3 | As A, update B's row by primary key | Zero rows affected |
| 4 | As A, delete B's row by primary key | Zero rows affected |
| 5 | As A, insert a row with `tenant_id = B` | Rejected by the `with check` clause |
| 6 | As A, update A's own row setting `tenant_id = B` | Rejected by the `with check` clause |
| 7 | As A with role `agent`, modify a table restricted to owner and admin | Rejected |
| 8 | With no context set at all | Zero rows on select, rejection on write |
| 9 | As A in support mode, write to a table the support role may not write | Rejected |
| 10 | As A, join through a foreign key to a B-owned parent row | Zero rows |

Case 2 deserves emphasis. RLS filters rather than errors, so a cross-tenant select returns an empty set. A test asserting "throws" would pass for the wrong reason and give false confidence. **Assert on the row count.**

Case 8 is the pooled-connection leak test. It is the one that catches a missing `set_config` or a transaction boundary mistake.

Case 10 catches the case where a child table's policy is correct but a query joins through a parent whose policy is not.

### Generation, not hand-writing

The suite is generated from the schema, so a new table gets coverage automatically:

```ts
// tests/isolation/generated.test.ts
for (const table of tenantScopedTables) {
  describe(`isolation · ${table.name}`, () => {
    for (const testCase of ISOLATION_CASES) {
      it(testCase.name, async () => runCase(testCase, table));
    }
  });
}
```

Ten cases across roughly eighteen tenant-scoped tables is 180 assertions. They run in a few seconds against a branch database and they are the reason Brian can be told the guarantee holds today rather than that it held when someone last checked.

### Gates

Reviewed manually, by a human reading every policy, at **M1** and again at **M6**. The brief specifies this and it should not be skipped under schedule pressure. Automated tests catch the cases you thought of; a person reading policies catches the case you did not.

---

## 5. Role model

Three tenant roles plus the support role.

**Amended 24 Aug 2026, per `01 D-13`.** Brian has confirmed support mode is read and write, not the read-only default this table originally specified. The support column below reflects that. Three cells stay blank regardless, marked ⁴⁵⁶, because they are not what "full access to a workspace" was asking to change.

| Capability | owner | admin | agent | support |
|---|:---:|:---:|:---:|:---:|
| Sign in, view overview | ✓ | ✓ | ✓ | ✓ |
| View company profile | ✓ | ✓ | ✓ | ✓ |
| Edit company profile | ✓ | ✓ | | ✓ |
| View team | ✓ | ✓ | ✓ | ✓ |
| Invite a member | ✓ | ✓ | | ✓ |
| Change a member's role | ✓ | | | ✓ |
| Remove a member | ✓ | ✓¹ | | ✓ |
| View credentials, masked | ✓ | | | ✓² |
| Create or rotate a credential | ✓ | | | ⁴ |
| Revoke a credential | ✓ | | | ⁴ |
| View AI rules | ✓ | ✓ | ✓ | ✓ |
| Edit AI rules | ✓ | ✓ | | ✓ |
| View subscription and usage | ✓ | ✓³ | | ✓ |
| View audit log | ✓ | ✓ | | ✓ |
| Transfer ownership | ✓ | | | ⁵ |
| Delete the tenant | ✓ | | | ⁶ |

¹ An admin may remove an agent, never another admin or the owner.
² Metadata only: name, prefix, scopes, last used. Never the hash, never a reveal.
³ Read-only.
⁴ **Stays owner-only, including in support mode.** This predates the read-write decision: `01 D-11` and ADR-008 already state credential creation, rotation and revocation are owner-only and never in support mode, independent of what support may otherwise do. The reasoning holds regardless of the general permission ceiling: a compromised or overzealous support session minting or rotating a live credential is a materially different risk than it editing a company profile, and the secret itself stays unreadable by anyone per D-11 either way. Not reopened by this decision.
⁵ **Stays owner-only.** Ownership transfer is an identity operation, not a workspace action; D-13's carve-out for "acting as the member's own identity row" extends naturally to never re-assigning it either. Worth a one-line confirmation with Brian rather than assumed silently, since it was not explicitly named.
⁶ **Stays owner-only.** Tenant deletion is irreversible-adjacent (D-10: soft delete and suspend, hard delete a separate deliberate operation with its own confirmation and runbook page); a support session performing it would bypass the deliberateness that decision was built to guarantee. Same status as ⁵: a reasonable extension, not an explicit instruction, and worth confirming.

**A tenant always has exactly one owner.** Ownership transfers atomically: the new owner is promoted and the old owner demoted to admin in one transaction. There is no state in which a tenant has zero owners or two, and the last owner cannot be removed or demoted.

Roles are checked in one guard, so adding a role later touches the guard and the policies, not the handlers.

---

## 6. Support mode

The best decision in the brief, built exactly as written.

### What it is not

It is **not** the service role key. It does not bypass RLS. It is not a superuser view. If it were, the isolation guarantee would have an exception in it, and a guarantee with an exception is a marketing claim.

### What it is

A real session row with `kind = 'support'`, `tenant_id` set to the target, and `effective_role = 'support'`. Every policy in the database evaluates it exactly as it evaluates a tenant user's session. Brian is inside the same walls as the tenant's own agents, with a narrower role.

```ts
async function enterSupportMode(admin: PlatformAdmin, tenantId: string, reason?: string) {
  assert(admin.canEnterSupportMode, 'not permitted');
  const tenant = await platform.getTenant(tenantId);      // service role, audited
  assert(tenant.status !== 'closed', 'tenant is closed');

  const session = await createSession({
    userId: admin.userId,
    kind: 'support',
    tenantId,
    effectiveRole: 'support',
    supportContext: { platformAdminId: admin.id, reason, enteredAt: new Date() },
    expiresAt: addMinutes(new Date(), 30),
  });

  // Two writes. Both, always, in the same transaction as the session creation.
  await writePlatformAudit({ action: 'support.entered', targetTenantId: tenantId,
                             supportSessionId: session.id, reason });
  await writeTenantAudit({ tenantId, action: 'support.entered', actorType: 'platform_admin',
                           actorLabel: admin.displayName, supportMode: true });

  return session;
}
```

### The four properties

1. **Bound by the same policies.** Not a convention. The `support` role appears in the policy predicates in `05 §2`, and the isolation suite includes support-mode cases for every table.
2. **Read and write, confirmed 24 Aug 2026, per `01 D-13`.** Against this document's original read-only recommendation, Brian has asked for full access with full audit logging. The mechanism is `app.can_write_settings()` in `00_context.sql` admitting the `support` role alongside `owner` and `admin`, which opens company profile, team management, invitations, AI rules editing and the seam tables in one place, because they all gate through that one function. Three things this does not touch: the credential secret is still never readable by anyone (`01 D-11`), a support session still cannot extend its own timeout, and a support session still cannot act as the member's own identity row. See `05 role model` above for the complete, cell-by-cell table and `09 §4` for the matrix this generates isolation-suite cases from.
3. **Doubly audited.** Every action writes to the tenant's own log, attributed to Brian acting in support mode, and to the platform log. The tenant can see, in their own audit view, every time the platform looked into their workspace. That transparency is a selling point rather than a liability, and it should be said in the marketing copy. This matters more now that support can write: an audit trail of what changed, not just that someone looked, is the entire justification for opening write access at all.
4. **Times out.** Thirty minutes of inactivity, then the session expires and a fresh switch is required. An old context left open in a browser tab is exactly how an accidental cross-tenant action happens.

### The visual obligation

Support mode is unmissable. `03 §8` specifies the boundary frame: a copper inset around the entire viewport with the tenant name in a title block and a live countdown. Not a dismissible banner. The visual and the security control are the same decision.

---

## 7. The service role key

The one thing in this system that genuinely bypasses RLS. It is treated accordingly.

### Where it may be used

Exactly four operations, all in `modules/platform`:

| Operation | Why RLS cannot serve it |
|---|---|
| Provision a tenant | The tenant does not exist yet, so no context can resolve to it |
| Suspend or reactivate a tenant | Writes the `tenants` row itself, which sits above tenant scope |
| Assign or override a plan | Same |
| List tenants for the console | Reads across all tenants by definition |

### Where it may never be used

Reading a tenant's settings, members, credentials, AI rules, audit log, knowledge base or customer records. **For any of those, the answer is support mode.** The distinction, from the brief: the switcher is how Brian sees into a tenant's world; the service role key is how the platform manages tenants as records.

### Enforcement

```json
// .eslintrc — no-restricted-imports
{
  "patterns": [{
    "group": ["**/lib/db/serviceClient"],
    "message": "The service role client may only be imported inside modules/platform. Use support mode to read tenant data. See 06 §7."
  }]
}
```

With an override permitting the import only under `src/modules/platform/**`. Every call goes through a wrapper that writes the audit row before the operation, not after, so a crash mid-operation still leaves a record that it was attempted.

---

## 8. Suspension

**Confirmed 24 Aug 2026: read-only.** `01 §9` question 4 asked what suspension actually means, and Brian's answer matches the standing recommendation below. The two rejected alternatives are kept here as a record of what was considered, not as live options.

| Model | Tenant users can | Cost |
|---|---|---|
| **Read-only** | Sign in, view everything, change nothing | One predicate on modify policies |
| ~~Blocked~~ | ~~Not sign in at all~~ | Rejected: it looks like an outage to the customer |
| ~~Grace~~ | ~~Full access for N days, then read-only, then blocked~~ | Rejected: most humane, also most state, and not what was chosen |

A suspended customer who can still see their configuration and their team is a customer who can fix their billing problem. One who is locked out entirely opens a support ticket, and Brian is the support team.

Implementation is a predicate added to every modify policy:

```sql
and exists (select 1 from tenants t
            where t.id = app.current_tenant_id() and t.status not in ('suspended', 'closed'))
```

Put it in a helper function so it is one place rather than eighteen.

---

## 9. Customer records and data protection

`01 D-09`. The customer records seam holds data about a tenant's customers, which makes Brian a processor for his tenants and his tenants controllers for their own customers.

### Phase 1 obligations, all small

| Obligation | Implementation |
|---|---|
| Log redaction | `contactHandle`, `summary`, `preferences`, `keyFacts` are on the redaction list. A test scans generated log output for known seeded values and fails if any appear |
| Isolation | Same suite as every other table, no exceptions |
| Soft delete | `deletedAt` present from the first migration |
| Scope separation | An ingestion credential is never granted `customers:read`. The scope selector warns when the combination is requested |
| Access logging | Every read of a customer record writes an audit row. This table is the one place where reads are audited, not just writes |

### Phase 2 obligation, flagged not built

Retention and erasure automation. Quoted separately. Flag it in the handover walkthrough rather than leaving it in a document Brian may not read.

### What to say to Brian in writing

Under the Kenyan Data Protection Act 2019 and equivalent regimes elsewhere, he needs a data processing agreement with each tenant before that tenant's customer data enters this system. That is a legal document, not a technical one, and it is not our deliverable. Raising it is our responsibility. `02 §2` puts a `/legal/dpa` route in the shell so there is somewhere for it to live.

---

## 10. Cross-tenant surfaces, and why there is only one

The platform console shows data across tenants: counts by status, subscriptions by tier, the limit watchlist, the past-due list.

Every one of those is an **aggregate**, computed through the service role, showing counts and names but never a tenant's content. The console never renders a tenant's AI rules, credentials, audit detail or customer records on a cross-tenant surface. To see any of those, Brian switches in.

This is a design rule with a practical consequence: any console feature request that would require reading tenant content across tenants is a request to weaken the isolation model, and it should be answered with support mode rather than built.

---

## 11. What would have to go wrong

Worth writing down, because knowing the failure modes is how they get tested.

| Failure | Where it would come from | Caught by |
|---|---|---|
| A new table ships without a policy | A migration written in a hurry | The CI policy check. Build fails |
| A modify policy has no `with check` | Copy-paste from a select policy | The CI policy check plus isolation case 6 |
| `set_config` without transaction-local scope | A refactor of the context helper | Isolation case 8 |
| A query runs outside `withTenantContext` | A handler touching Drizzle directly | Lint rule plus isolation case 8 |
| The service role client imported into a tenant route | Convenience under deadline | Lint rule on the import path |
| A support session granted a write it should not have | The role matrix drifting from the policies | Isolation case 9, generated from the matrix |
| A join leaks through an unprotected parent | A new relation added without thought | Isolation case 10 |
| Customer data in a log line | A `console.log` during debugging | The log-scanning test, plus a lint rule banning `console.*` |

Eight failure modes, eight mechanical checks, all in CI. That is what makes the guarantee something Brian can sell rather than something we hope is true.
