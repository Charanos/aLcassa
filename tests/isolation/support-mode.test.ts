import { afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { adminQuery, asActor, cleanup, closeHarness, type Actor } from './harness';
import {
  SEED_PLATFORM_ADMIN,
  SEED_TENANT_A,
  SEED_TENANT_B,
  SEED_USER_A,
} from '../../src/db/seed/constants';

/**
 * 09 §3 · 09 §4 · 09 §7. SUPPORT MODE, AGAINST THE REAL DATABASE.
 *
 * ⚠ THE CLAIM UNDER TEST IS THE ONE THE ENGAGEMENT IS SOLD ON.
 *
 * "A tenant can see every time the platform entered their workspace, who it
 * was, why, and anything they changed while they were in there." That is a
 * promise about rows, and it is only true if the rows are actually there and
 * actually visible to the tenant — which is what these cases check.
 *
 * The other half is the CEILING. A support session is an ordinary `sessions`
 * row with `kind = 'support'`, so RLS reads its tenant and role the same way
 * it does for a tenant user. The carve-outs in 01 D-13 — credential secrets,
 * a session extending itself, customer records — are policy, and a support
 * session hits them like anybody else. Those are proved here rather than
 * assumed from the policy text.
 */

const asOwnerA: Actor = {
  tenantId: SEED_TENANT_A,
  role: 'owner',
  actorId: SEED_USER_A,
  supportMode: false,
};

/** The platform, inside tenant A. Role 'support', support mode on. */
const asSupportInA: Actor = {
  tenantId: SEED_TENANT_A,
  role: 'support',
  actorId: SEED_PLATFORM_ADMIN,
  supportMode: true,
};

const created = { sessions: [] as string[], audit: [] as string[] };

afterAll(async () => {
  if (created.sessions.length > 0) {
    await cleanup`delete from sessions where id = any(${created.sessions})`;
  }
  if (created.audit.length > 0) {
    await cleanup`delete from audit_log where id = any(${created.audit})`;
  }
  await closeHarness();
});

/** Mints a session the way the platform module does: as the platform. */
async function openSupportSession(tenantId: string, reason: string): Promise<string> {
  const rows = await adminQuery<{ id: string }[]>`
    insert into sessions (user_id, kind, tenant_id, effective_role, support_context,
                          last_activity_at, expires_at)
    values (${SEED_PLATFORM_ADMIN}, 'support', ${tenantId}, 'support',
            ${{
              platformAdminId: SEED_PLATFORM_ADMIN,
              reason,
              enteredAt: new Date().toISOString(),
            }},
            now(), now() + interval '30 minutes')
    returning id
  `;
  const id = rows[0]!.id;
  created.sessions.push(id);
  return id;
}

describe('support mode · the tenant can see it', () => {
  /**
   * ⚠ 09 §7's PROMISE, AS AN ASSERTION.
   *
   * The entry is written into the CUSTOMER's audit log, not only ours, and
   * `support_mode = true` is what lets them filter to exactly these events.
   */
  it('writes an entry into the tenant’s own audit log, which the tenant can read', async () => {
    const sessionId = await openSupportSession(SEED_TENANT_A, 'Investigating a failed webhook');

    const written = await adminQuery<{ id: string }[]>`
      insert into audit_log (tenant_id, actor_user_id, actor_type, actor_label, support_mode,
                             action, entity_type, entity_id, request_id)
      values (${SEED_TENANT_A}, ${SEED_PLATFORM_ADMIN}, 'platform_admin', 'Brian', true,
              'support.entered', 'support_session', ${sessionId}, ${randomUUID()})
      returning id
    `;
    created.audit.push(written[0]!.id);

    // Read as the TENANT. If this is empty, the transparency claim is false.
    const seen = await asActor(
      asOwnerA,
      (tx) => tx`
        select action, actor_label, support_mode
        from audit_log where id = ${written[0]!.id}
      `,
    );

    expect(seen.length, 'the tenant cannot see that the platform entered').toBe(1);
    expect(seen[0]?.support_mode).toBe(true);
    expect(seen[0]?.actor_label).toBe('Brian');
  });

  it('lets a tenant filter their log to every support visit', async () => {
    const rows = await asActor(
      asOwnerA,
      (tx) => tx`select count(*)::int as n from audit_log where support_mode = true`,
    );
    // The filter must be usable, which means the column has to be readable
    // and populated — not merely present in the schema.
    expect(Number(rows[0]?.n ?? 0)).toBeGreaterThan(0);
  });

  /**
   * 09 §7 · 02_identity.sql. An owner sees a support session opened into
   * THEIR workspace, and can revoke it. That is the difference between a
   * ceiling and a promise.
   */
  it('lets the owner see and revoke a support session in their workspace', async () => {
    const sessionId = await openSupportSession(SEED_TENANT_A, 'Owner-visible session');

    const visible = await asActor(
      asOwnerA,
      (tx) => tx`select id, kind from sessions where id = ${sessionId}`,
    );
    expect(visible.length, 'the owner cannot see a support session in their own workspace').toBe(1);

    const revoked = await asActor(asOwnerA, async (tx) => {
      const rows = await tx`
        update sessions set revoked_at = now(), revoked_reason = 'revoked by the owner'
        where id = ${sessionId} and revoked_at is null returning id
      `;
      return rows.length;
    });
    expect(revoked, 'the owner cannot revoke a support session in their own workspace').toBe(1);
  });
});

describe('support mode · the ceiling', () => {
  it('cannot see a workspace it was not opened into', async () => {
    // Support in tenant A, asking about tenant B.
    const rows = await asActor(
      asSupportInA,
      (tx) => tx`select id from tenants where id = ${SEED_TENANT_B}`,
    );
    expect(rows.length, 'a support session reached another workspace').toBe(0);
  });

  /**
   * 01 D-13, carve-out three. 06 §9 proposes no support access to customer
   * records at all, and the policy implements that. This duplicates the case
   * in `generated.test.ts` deliberately: that one asserts it as an isolation
   * property, this one asserts it as a SUPPORT property, and if the carve-out
   * were ever narrowed both should fail rather than one.
   */
  it('reads nothing at all from customer records', async () => {
    const rows = await asActor(asSupportInA, (tx) => tx`select id from customer_records`);
    expect(rows.length).toBe(0);
  });

  /**
   * 01 D-13, carve-out two: "a support session cannot extend its own
   * timeout". `sessions_modify` refuses it via `not app.is_support_session()`.
   *
   * The application also has an `extendSupportSession`, and the two are not in
   * conflict: that runs as the PLATFORM from the console, outside any support
   * context, and is audited into the tenant's log. What is forbidden is the
   * session reaching back and renewing itself from inside.
   */
  it('cannot extend its own timeout from inside the session', async () => {
    const sessionId = await openSupportSession(SEED_TENANT_A, 'Self-extension attempt');

    let affected = -1;
    try {
      affected = await asActor(asSupportInA, async (tx) => {
        const rows = await tx`
          update sessions set expires_at = now() + interval '8 hours'
          where id = ${sessionId} returning id
        `;
        return rows.length;
      });
    } catch {
      affected = 0;
    }
    expect(affected, 'a support session extended its own ceiling').toBe(0);
  });

  /**
   * 01 D-13 opened support mode to read AND WRITE on 24 Aug 2026. This is the
   * positive half — the carve-outs above are meaningless if support cannot do
   * the ordinary work it was opened for.
   */
  it('can write where 01 D-13 opened it', async () => {
    const affected = await asActor(asSupportInA, async (tx) => {
      const rows = await tx`
        update tenant_settings set updated_at = now()
        where tenant_id = ${SEED_TENANT_A} returning tenant_id
      `;
      return rows.length;
    });
    expect(affected, 'support mode cannot do the work it was opened for').toBe(1);
  });
});

describe('support mode · the session row', () => {
  it('is an ordinary sessions row, which is what makes the ceiling real', async () => {
    const sessionId = await openSupportSession(SEED_TENANT_A, 'Shape check');

    const [row] = await adminQuery<
      { kind: string; effective_role: string; tenant_id: string }[]
    >`select kind, effective_role, tenant_id from sessions where id = ${sessionId}`;

    expect(row?.kind).toBe('support');
    // 'support', not 'owner' and not the admin's own role: the carve-outs in
    // the policies key on exactly this value.
    expect(row?.effective_role).toBe('support');
    expect(row?.tenant_id).toBe(SEED_TENANT_A);
  });

  it('stops resolving the moment it is revoked', async () => {
    const sessionId = await openSupportSession(SEED_TENANT_A, 'Revocation check');

    const before = await adminQuery<{ id: string }[]>`
      select id from sessions
      where id = ${sessionId} and revoked_at is null and expires_at > now()
    `;
    expect(before.length).toBe(1);

    await cleanup`update sessions set revoked_at = now() where id = ${sessionId}`;

    const after = await adminQuery<{ id: string }[]>`
      select id from sessions
      where id = ${sessionId} and revoked_at is null and expires_at > now()
    `;
    expect(after.length).toBe(0);
  });

  it('carries the operator and the reason, so the frame can name both', async () => {
    const sessionId = await openSupportSession(SEED_TENANT_A, 'Investigating a failed webhook');

    const [row] = await adminQuery<{ support_context: { reason?: string; platformAdminId?: string } }[]>`
      select support_context from sessions where id = ${sessionId}
    `;

    expect(row?.support_context?.reason).toBe('Investigating a failed webhook');
    expect(row?.support_context?.platformAdminId).toBe(SEED_PLATFORM_ADMIN);
  });
});
