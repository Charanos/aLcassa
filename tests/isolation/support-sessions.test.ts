import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';
import { adminQuery, asActor, cleanup, closeHarness, sql } from './harness';
import { SEED_TENANT_A, SEED_TENANT_B, SEED_USER_A } from '../../src/db/seed/constants';
/* Through the module's entry, which installs the audit writer. */
import {
  endSupportSession,
  extendSupportSession,
  startSupportSession,
} from '../../src/modules/platform';
import { AppError, ERROR_CODES } from '../../src/lib/errors';

/**
 * Doc 24 · support sessions, end to end against the database.
 *
 * What each case proves is a claim the register, the customer's frame or the
 * guarantees panel now makes in words:
 *
 *   - operators read the workspace directory and every support session, and
 *     nothing tenant-scoped beyond them (D1);
 *   - every ending is written once, in both logs, with how it ended (S0.6);
 *   - extending has a window and a ceiling, and cannot revive a dead visit (D2);
 *   - a colleague may end a visit, and it says so (D5);
 *   - an owner or admin — and nobody else in the workspace — may end it (D6);
 *   - a refused entry is recorded (S0.8);
 *   - a support session reads the names on the workspace's own team (Stage 3).
 *
 * Everything is undone afterwards: this suite runs against the development
 * database, so the probes' sessions and audit rows are removed with them.
 */

const operator = randomUUID();
const colleague = randomUUID();
const powerless = randomUUID();
const agent = randomUUID();
const probes = [operator, colleague, powerless, agent];

const actor = (userId: string, label: string) => ({ userId, label, requestId: randomUUID() });
const OP = () => actor(operator, 'Support probe');
const COLLEAGUE = () => actor(colleague, 'Colleague probe');

async function asOperator<T>(
  actorId: string,
  run: (tx: postgres.TransactionSql) => Promise<T>,
): Promise<T> {
  return sql.begin(async (tx) => {
    await tx`select set_config('app.tenant_id', '', true)`;
    await tx`select set_config('app.role', 'none', true)`;
    await tx`select set_config('app.support_mode', 'false', true)`;
    await tx`select set_config('app.actor_id', ${actorId}, true)`;
    return run(tx);
  }) as Promise<T>;
}

async function session(id: string) {
  const [row] = await adminQuery<
    Array<{
      revoked_at: Date | null;
      end_reason: string | null;
      ended_by: string | null;
      expires_at: Date;
      support_context: { platformAdminName?: string; extensions?: number } | null;
    }>
  >`select revoked_at, end_reason, ended_by, expires_at, support_context from sessions where id = ${id}`;
  return row;
}

async function tenantLog(sessionId: string) {
  return adminQuery<
    Array<{ action: string; after: Record<string, unknown> | null; occurred_at: Date }>
  >`
    select action, after, occurred_at from audit_log
    where entity_id = ${sessionId} order by occurred_at, id`;
}

async function expectCode(call: Promise<unknown>, code: string) {
  const error = await call.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, `expected ${code}, the call succeeded`).toBeInstanceOf(AppError);
  expect((error as AppError).code).toBe(code);
}

beforeAll(async () => {
  for (const [id, name] of [
    [operator, 'Support probe'],
    [colleague, 'Colleague probe'],
    [powerless, 'Powerless probe'],
    [agent, 'Agent probe'],
  ] as const) {
    await adminQuery`
      insert into user_profiles (id, full_name, email)
      values (${id}, ${name}, ${`probe-${id.slice(0, 8)}@example.invalid`})
      on conflict do nothing`;
  }
  await adminQuery`
    insert into platform_admins
      (user_id, display_name, can_suspend_tenants, can_edit_master_rules, can_enter_support_mode)
    values (${operator}, 'Support probe', true, true, true),
           (${colleague}, 'Colleague probe', true, true, true),
           (${powerless}, 'Powerless probe', false, false, false)`;
  await adminQuery`
    insert into tenant_members (tenant_id, user_id, role, status, joined_at)
    values (${SEED_TENANT_A}, ${agent}, 'agent', 'active', now())`;
  /* No other support session may be open on tenant A during this suite. */
  await adminQuery`
    update sessions set revoked_at = now(), end_reason = 'operator'
    where kind = 'support' and tenant_id = ${SEED_TENANT_A} and revoked_at is null`;
});

afterAll(async () => {
  const ids = await adminQuery<Array<{ id: string }>>`
    select id from sessions where kind = 'support' and user_id = any(${[operator, colleague]})`;
  const sessionIds = ids.map((r) => r.id);
  await cleanup`delete from audit_log where entity_id = any(${sessionIds}::uuid[])`;
  await cleanup`delete from audit_log where actor_user_id = any(${probes})`;
  await cleanup`delete from platform_audit_log where entity_id = any(${sessionIds}::uuid[])`;
  await cleanup`delete from platform_audit_log where actor_user_id = any(${probes})`;
  await cleanup`delete from platform_audit_log where actor_user_id = ${SEED_USER_A} and action = 'support.ended_by_customer'`;
  await cleanup`delete from sessions where id = any(${sessionIds}::uuid[])`;
  await cleanup`delete from tenant_members where user_id = ${agent}`;
  await cleanup`delete from platform_admins where user_id = any(${probes})`;
  await cleanup`delete from user_profiles where id = any(${probes})`;
  await closeHarness();
});

describe('operators read the directory and the register · D1', () => {
  it('an operator reads every workspace', async () => {
    const [seen] = await asOperator(
      operator,
      (tx) => tx<Array<{ n: number }>>`select count(*)::int as n from tenants`,
    );
    const [all] = await adminQuery<Array<{ n: number }>>`select count(*)::int as n from tenants`;
    expect(seen?.n).toBe(all?.n);
  });

  it('an operator reads no tenant-scoped data table', async () => {
    const rows = await asOperator(operator, (tx) => tx`select 1 from tenant_members limit 1`);
    expect(rows.length).toBe(0);
    const audit = await asOperator(operator, (tx) => tx`select 1 from audit_log limit 1`);
    expect(audit.length).toBe(0);
  });

  it('an operator reads support sessions, but no customer sign-in session', async () => {
    const started = await startSupportSession(
      { tenantId: SEED_TENANT_B, reason: 'Probe: register visibility' },
      COLLEAGUE(),
    );
    const support = await asOperator(
      operator,
      (tx) => tx`select 1 from sessions where id = ${started.id}`,
    );
    expect(support.length, 'a colleague’s support session is invisible to the register').toBe(1);
    const tenantSessions = await asOperator(
      operator,
      (tx) => tx`select 1 from sessions where kind = 'tenant' limit 1`,
    );
    expect(tenantSessions.length).toBe(0);
    await endSupportSession(started.id, COLLEAGUE());
  });
});

describe('a visit, start to end · Stage 2', () => {
  it('opens with the operator’s name and a line in the customer’s log, and tells the owners', async () => {
    const s = await startSupportSession(
      { tenantId: SEED_TENANT_A, reason: '  Probe:   checking   invitation delivery ' },
      OP(),
    );
    expect(s.reason).toBe('Probe: checking invitation delivery');
    expect(s.notify.length).toBeGreaterThan(0);
    const row = await session(s.id);
    expect(row?.support_context?.platformAdminName).toBe('Support probe');
    expect(row?.support_context?.extensions).toBe(0);
    const log = await tenantLog(s.id);
    expect(log.map((l) => l.action)).toEqual(['support.entered']);
  });

  it('a second session on the same workspace closes the first, in both logs', async () => {
    const [first] = await adminQuery<Array<{ id: string }>>`
      select id from sessions where kind = 'support' and tenant_id = ${SEED_TENANT_A}
        and revoked_at is null`;
    const second = await startSupportSession(
      { tenantId: SEED_TENANT_A, reason: 'Probe: a second visit' },
      OP(),
    );
    const closed = await session(first?.id ?? '');
    expect(closed?.end_reason).toBe('superseded');
    const log = await tenantLog(first?.id ?? '');
    expect(log.map((l) => l.action)).toEqual(['support.entered', 'support.exited']);
    expect(log[1]?.after).toMatchObject({ endReason: 'superseded' });
    await endSupportSession(second.id, OP());
  });

  it('extending: refused early, allowed twice in the window, then refused', async () => {
    const s = await startSupportSession(
      { tenantId: SEED_TENANT_A, reason: 'Probe: extensions' },
      OP(),
    );

    await expectCode(extendSupportSession(s.id, OP()), ERROR_CODES.SUPPORT_NOT_PERMITTED);

    for (const n of [1, 2]) {
      await adminQuery`update sessions set expires_at = now() + interval '2 minutes' where id = ${s.id}`;
      const result = await extendSupportSession(s.id, OP());
      expect(result.extensions).toBe(n);
    }

    await adminQuery`update sessions set expires_at = now() + interval '2 minutes' where id = ${s.id}`;
    await expectCode(extendSupportSession(s.id, OP()), ERROR_CODES.SUPPORT_NOT_PERMITTED);

    const extended = (await tenantLog(s.id)).filter((l) => l.action === 'support.extended');
    expect(extended.length, 'each extension, and only each, is in the customer’s log').toBe(2);
    await endSupportSession(s.id, OP());
  });

  it('a lapsed visit cannot be extended back to life', async () => {
    const s = await startSupportSession(
      { tenantId: SEED_TENANT_A, reason: 'Probe: revival' },
      OP(),
    );
    await adminQuery`update sessions set expires_at = now() - interval '1 minute' where id = ${s.id}`;
    await expectCode(extendSupportSession(s.id, OP()), ERROR_CODES.SUPPORT_SESSION_EXPIRED);
  });

  it('the timer closes a lapsed visit at its expiry, in both logs', async () => {
    const [lapsed] = await adminQuery<Array<{ id: string; expires_at: Date }>>`
      select id, expires_at from sessions where kind = 'support' and user_id = ${operator}
        and revoked_at is null and expires_at <= now()`;
    expect(lapsed, 'the previous case should have left one lapsed').toBeDefined();

    const [closed] = await asOperator(
      operator,
      (tx) => tx<Array<{ n: number }>>`select app.close_lapsed_support_sessions() as n`,
    );
    expect(closed?.n).toBeGreaterThanOrEqual(1);

    const row = await session(lapsed?.id ?? '');
    expect(row?.end_reason).toBe('expired');
    const log = await tenantLog(lapsed?.id ?? '');
    const expired = log.find((l) => l.action === 'support.expired');
    expect(expired?.occurred_at.getTime()).toBe(lapsed?.expires_at.getTime());

    const [again] = await asOperator(
      operator,
      (tx) => tx<Array<{ n: number }>>`select app.close_lapsed_support_sessions() as n`,
    );
    expect(again?.n, 'closing is idempotent').toBe(0);
  });

  it('a colleague may end a visit; it says so; a second ending writes nothing · D5', async () => {
    const s = await startSupportSession(
      { tenantId: SEED_TENANT_A, reason: 'Probe: colleague end' },
      OP(),
    );
    const ended = await endSupportSession(s.id, COLLEAGUE());
    expect(ended?.endReason).toBe('colleague');
    const row = await session(s.id);
    expect(row?.ended_by).toBe(colleague);

    const before = (await tenantLog(s.id)).length;
    expect(await endSupportSession(s.id, OP())).toBeNull();
    expect((await tenantLog(s.id)).length, 'ending twice recorded twice').toBe(before);
  });

  it('a refused entry is recorded in the platform log only · S0.8', async () => {
    await expectCode(
      startSupportSession(
        { tenantId: SEED_TENANT_A, reason: 'Probe: without the capability' },
        actor(powerless, 'Powerless probe'),
      ),
      ERROR_CODES.PLATFORM_CAPABILITY_MISSING,
    );
    const [refused] = await adminQuery<Array<{ n: number }>>`
      select count(*)::int as n from platform_audit_log
      where actor_user_id = ${powerless} and action = 'support.entry_refused'`;
    expect(refused?.n).toBe(1);
    const [tenantSide] = await adminQuery<Array<{ n: number }>>`
      select count(*)::int as n from audit_log where actor_user_id = ${powerless}`;
    expect(tenantSide?.n).toBe(0);
  });
});

describe('the customer ends a visit · D6', () => {
  const owner = {
    tenantId: SEED_TENANT_A,
    role: 'owner' as const,
    actorId: SEED_USER_A,
    supportMode: false,
  };
  const asAgent = {
    tenantId: SEED_TENANT_A,
    role: 'agent' as const,
    actorId: agent,
    supportMode: false,
  };

  it('an agent cannot; an owner can; once', async () => {
    const s = await startSupportSession(
      { tenantId: SEED_TENANT_A, reason: 'Probe: customer ends it' },
      OP(),
    );

    await expect(
      asActor(asAgent, (tx) => tx`select app.end_support_visit(${s.id}::uuid, 'test')`),
    ).rejects.toThrow();

    const [first] = await asActor(
      owner,
      (tx) =>
        tx<Array<{ ended: boolean }>>`select app.end_support_visit(${s.id}::uuid, 'test') as ended`,
    );
    expect(first?.ended).toBe(true);
    const row = await session(s.id);
    expect(row?.end_reason).toBe('customer');
    expect(row?.ended_by).toBe(SEED_USER_A);
    const log = await tenantLog(s.id);
    expect(log.some((l) => l.action === 'support.ended_by_customer')).toBe(true);
    const [platform] = await adminQuery<Array<{ n: number }>>`
      select count(*)::int as n from platform_audit_log
      where entity_id = ${s.id} and action = 'support.ended_by_customer'`;
    expect(platform?.n, 'the register never learned the customer ended it').toBe(1);

    const [second] = await asActor(
      owner,
      (tx) =>
        tx<Array<{ ended: boolean }>>`select app.end_support_visit(${s.id}::uuid, 'test') as ended`,
    );
    expect(second?.ended).toBe(false);
  });

  it('a workspace cannot end another workspace’s visit', async () => {
    const s = await startSupportSession(
      { tenantId: SEED_TENANT_B, reason: 'Probe: wrong workspace' },
      OP(),
    );
    await expect(
      asActor(owner, (tx) => tx`select app.end_support_visit(${s.id}::uuid, 'test')`),
    ).rejects.toThrow();
    expect((await session(s.id))?.revoked_at).toBeNull();
    await endSupportSession(s.id, OP());
  });
});

describe('inside a workspace as support · Stage 3', () => {
  const support = (tenantId: string) => ({
    tenantId,
    role: 'support' as const,
    actorId: operator,
    supportMode: true,
  });

  it('reads the names on that workspace’s team, and no other’s', async () => {
    const own = await asActor(
      support(SEED_TENANT_A),
      (tx) => tx`select id from user_profiles where id = ${SEED_USER_A}`,
    );
    expect(own.length).toBe(1);
    const other = await asActor(
      support(SEED_TENANT_B),
      (tx) => tx`select id from user_profiles where id = ${SEED_USER_A}`,
    );
    expect(other.length).toBe(0);
  });

  it('what a visit did is readable by operators, and by nobody else', async () => {
    const s = await startSupportSession(
      { tenantId: SEED_TENANT_A, reason: 'Probe: footprint' },
      OP(),
    );
    const mine = await asOperator(
      operator,
      (tx) => tx`select * from app.support_visit_activity(ARRAY[${s.id}]::uuid[])`,
    );
    expect(mine.length).toBeGreaterThan(0);
    const customer = await asActor(
      { tenantId: SEED_TENANT_A, role: 'owner', actorId: SEED_USER_A, supportMode: false },
      (tx) => tx`select * from app.support_visit_activity(ARRAY[${s.id}]::uuid[])`,
    );
    expect(customer.length).toBe(0);
    await endSupportSession(s.id, OP());
  });
});
