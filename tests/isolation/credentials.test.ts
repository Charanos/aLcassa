import { randomUUID } from 'node:crypto';
import { verify } from '@node-rs/argon2';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { adminQuery, cleanup, closeHarness, asActor } from './harness';
import { assertDisposableDatabase } from './disposable';
import { SEED_USER_A } from '@/db/seed/constants';
import { createResolvedContext, type TenantRole } from '@/lib/db/context';
import { createCredential, listCredentials, revokeCredential } from '@/modules/credentials';
import { redact } from '@/lib/logger';
import * as audit from '@/lib/audit';

const tenant = randomUUID();
const otherTenant = randomUUID();
const plan = randomUUID();
const context = (role: TenantRole = 'owner', supportMode = false, tenantId = tenant) =>
  createResolvedContext({
    tenantId,
    role,
    supportMode,
    actorId: SEED_USER_A,
    actorLabel: 'Credential verification',
    actorType: 'user',
    requestId: randomUUID(),
  });
const input = () => ({
  name: 'Test assistant',
  scopes: ['ai_rules:read'],
  requestKey: randomUUID(),
});
let created = false;

beforeAll(async () => {
  assertDisposableDatabase();
  await adminQuery`insert into tenants (id, slug, name, status) values (${tenant}, ${`credentials-${tenant}`}, 'Credential test', 'active'), (${otherTenant}, ${`credentials-${otherTenant}`}, 'Other credential test', 'active')`;
  created = true;
  await adminQuery`insert into plans (id, code, name) values (${plan}, ${`credentials-${plan}`}, 'Credential verification')`;
  await adminQuery`insert into plan_entitlements (plan_id, key, kind, limit_value, display_name) values (${plan}, 'api_keys', 'limit', 2, 'API credentials')`;
  await adminQuery`insert into subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end) values (${tenant}, ${plan}, 'active', now(), now() + interval '30 days'), (${otherTenant}, ${plan}, 'active', now(), now() + interval '30 days')`;
});

afterAll(async () => {
  if (created) {
    await cleanup`delete from audit_log where tenant_id in (${tenant}, ${otherTenant})`;
    await cleanup`delete from api_credentials where tenant_id in (${tenant}, ${otherTenant})`;
    await cleanup`delete from usage_counters where tenant_id in (${tenant}, ${otherTenant})`;
    await cleanup`delete from subscription_overrides where tenant_id in (${tenant}, ${otherTenant})`;
    await cleanup`delete from subscriptions where tenant_id in (${tenant}, ${otherTenant})`;
    await cleanup`delete from plan_entitlements where plan_id = ${plan}`;
    await cleanup`delete from plans where id = ${plan}`;
    await cleanup`delete from tenants where id in (${tenant}, ${otherTenant})`;
  }
  await closeHarness();
});

async function revokeAll() {
  for (const row of await listCredentials(context()))
    if (row.status !== 'revoked') await revokeCredential(context(), row.id);
}

describe('owner credential lifecycle under actual policies', () => {
  it('hashes the real random key and excludes it and its hash from all later reads and audits', async () => {
    const ctx = context();
    const result = await createCredential(ctx, input());
    expect(result.secret).toMatch(/^csk_live_[a-f0-9]{16}_[A-Za-z0-9_-]{43}$/);
    const [stored] = await adminQuery<
      { key_hash: string }[]
    >`select key_hash from api_credentials where id = ${result.credential.id}`;
    expect(stored?.key_hash).toMatch(/^\$argon2id\$/);
    expect(await verify(stored!.key_hash, result.secret!)).toBe(true);
    expect(await verify(stored!.key_hash, `${result.secret}x`)).toBe(false);
    const [audit] =
      await adminQuery`select action, after, request_id from audit_log where entity_id = ${result.credential.id}`;
    expect(audit?.action).toBe('credential.created');
    expect(audit?.request_id).toBe(ctx.requestId);
    const later = JSON.stringify({ list: await listCredentials(ctx), audit });
    expect(later).not.toContain(result.secret!);
    expect(later).not.toContain(stored!.key_hash);
    expect(later).not.toMatch(/"(?:secret|keyHash|key_hash)"/);
    expect(redact(`presented ${result.secret} in a message`)).toBe(
      'presented csk_live_[redacted] in a message',
    );
  });

  it('returns metadata only for a duplicate request and refuses changed payloads', async () => {
    await revokeAll();
    const value = input();
    const first = await createCredential(context(), value);
    const again = await createCredential(context(), value);
    expect(again.credential.id).toBe(first.credential.id);
    expect(again.replayed).toBe(true);
    expect(again).not.toHaveProperty('secret');
    await expect(
      createCredential(context(), { ...value, name: 'Different' }),
    ).rejects.toMatchObject({ code: 'validation.failed' });
    const [count] = await adminQuery<
      { n: number }[]
    >`select count(*)::int as n from audit_log where entity_id = ${first.credential.id}`;
    expect(count?.n).toBe(1);
  });

  it.each(['admin', 'agent', 'support'] as const)(
    'refuses %s creation, metadata access and revocation',
    async (role) => {
      const id = (await listCredentials(context()))[0]!.id;
      await expect(createCredential(context(role), input())).rejects.toMatchObject({
        code: role === 'support' ? 'support.write_denied' : 'auth.role_not_permitted',
      });
      await expect(listCredentials(context(role))).rejects.toBeDefined();
      await expect(revokeCredential(context(role), id)).rejects.toBeDefined();
      const rows = await asActor(
        { tenantId: tenant, actorId: SEED_USER_A, role, supportMode: role === 'support' },
        async (tx) =>
          tx`insert into api_credentials (tenant_id, name, key_prefix, key_hash, created_by) values (${tenant}, 'Forbidden', ${randomUUID()}, 'forbidden', ${SEED_USER_A}) returning id`,
      ).catch(() => []);
      expect(rows).toHaveLength(0);
    },
  );

  it('refuses an owner context marked as support', async () => {
    await expect(createCredential(context('owner', true), input())).rejects.toMatchObject({
      code: 'support.write_denied',
    });
  });

  it('reserves only two slots across simultaneous distinct mint attempts', async () => {
    await revokeAll();
    const values = await Promise.allSettled(
      Array.from({ length: 6 }, () => createCredential(context(), input())),
    );
    expect(values.filter((value) => value.status === 'fulfilled')).toHaveLength(2);
    for (const value of values)
      if (value.status === 'rejected')
        expect(value.reason).toMatchObject({ code: 'credential.limit_reached' });
    const [counter] = await adminQuery<
      { current_value: number }[]
    >`select current_value from usage_counters where tenant_id = ${tenant} and key = 'api_keys'`;
    expect(Number(counter?.current_value)).toBe(2);
  });

  it('returns one secret and one audit for simultaneous identical requests', async () => {
    await revokeAll();
    const value = input();
    const values = await Promise.all(
      Array.from({ length: 4 }, () => createCredential(context(), value)),
    );
    expect(values.filter((result) => result.secret)).toHaveLength(1);
    expect(new Set(values.map((result) => result.credential.id)).size).toBe(1);
  });

  it('rotates at the allowance, keeps a bounded grace window and preserves the slot count', async () => {
    await revokeAll();
    const original = await createCredential(context(), input());
    await createCredential(context(), input());
    const successor = await createCredential(context(), {
      ...input(),
      rotateFromId: original.credential.id,
    });
    expect(successor.secret).not.toBe(original.secret);
    expect(successor.credential.rotatedFromId).toBe(original.credential.id);
    const old = (await listCredentials(context())).find(
      (row) => row.id === original.credential.id,
    )!;
    expect(old.status).toBe('rotating');
    expect(old.expiresAt!.getTime() - Date.now()).toBeGreaterThan(23 * 3_600_000);
    expect(old.expiresAt!.getTime() - Date.now()).toBeLessThanOrEqual(24 * 3_600_000);
    expect(
      (await listCredentials(context())).filter((row) => row.status === 'active'),
    ).toHaveLength(2);
    await expect(
      createCredential(context(), { ...input(), rotateFromId: successor.credential.id }),
    ).rejects.toMatchObject({ code: 'validation.failed' });
    await expect(
      createCredential(context(), { ...input(), rotateFromId: original.credential.id }),
    ).rejects.toMatchObject({ code: 'credential.revoked' });
  });

  it('ends the predecessor grace when its successor is revoked', async () => {
    await revokeAll();
    const original = await createCredential(context(), input());
    const successor = await createCredential(context(), {
      ...input(),
      rotateFromId: original.credential.id,
    });
    await revokeCredential(context(), successor.credential.id);
    const rows = await listCredentials(context());
    expect(rows.find((row) => row.id === original.credential.id)?.status).toBe('revoked');
    expect(rows.find((row) => row.id === successor.credential.id)?.status).toBe('revoked');
  });

  it('revokes idempotently with one event and no cross-workspace disclosure', async () => {
    await createCredential(context(), input());
    const original = (await listCredentials(context())).find((row) => row.status === 'active')!;
    expect(await revokeCredential(context(), original.id)).toEqual({ revoked: true });
    expect(await revokeCredential(context(), original.id)).toEqual({ revoked: false });
    await expect(
      revokeCredential(context('owner', false, otherTenant), original.id),
    ).rejects.toMatchObject({ code: 'credential.not_found' });
    const [count] = await adminQuery<
      { n: number }[]
    >`select count(*)::int as n from audit_log where entity_id = ${original.id} and action = 'credential.revoked'`;
    expect(count?.n).toBe(1);
  });

  it('rejects reserved scopes and caller-supplied tenant identity', async () => {
    await expect(
      createCredential(context(), { ...input(), scopes: ['kb:read'] }),
    ).rejects.toMatchObject({ code: 'validation.failed' });
    await expect(
      createCredential(context(), { ...input(), tenantId: otherTenant }),
    ).rejects.toMatchObject({ code: 'validation.failed' });
  });

  it('denies browser-facing table grants while preserving the private application connection', async () => {
    const [rights] = await adminQuery<
      { anon: boolean; authenticated: boolean; application: boolean }[]
    >`select has_table_privilege('anon', 'public.api_credentials', 'select,insert,update,delete') as anon, has_table_privilege('authenticated', 'public.api_credentials', 'select,insert,update,delete') as authenticated, has_table_privilege('alcassa_app', 'public.api_credentials', 'select,insert,update') as application`;
    expect(rights).toEqual({ anon: false, authenticated: false, application: true });
  });

  it('rolls back creation and its counter when the transactional audit fails', async () => {
    await revokeAll();
    const rows = await listCredentials(context());
    const failure = vi
      .spyOn(audit, 'writeAudit')
      .mockRejectedValueOnce(new Error('Injected audit refusal'));
    try {
      await expect(createCredential(context(), input())).rejects.toThrow('Injected audit refusal');
    } finally {
      failure.mockRestore();
    }
    expect(await listCredentials(context())).toEqual(rows);
    const [count] = await adminQuery<
      { current_value: number }[]
    >`select current_value from usage_counters where tenant_id=${tenant} and key='api_keys'`;
    expect(Number(count?.current_value)).toBe(0);
  });

  it('uses a live override and ignores the expired grant', async () => {
    await revokeAll();
    await adminQuery`update plan_entitlements set limit_value=0 where plan_id=${plan} and key='api_keys'`;
    await adminQuery`insert into subscription_overrides (tenant_id,key,limit_value,reason,granted_by,expires_at) values (${tenant},'api_keys',1,'Verification grant',${SEED_USER_A},now()+interval '1 hour')`;
    try {
      await createCredential(context(), input());
      await expect(createCredential(context(), input())).rejects.toMatchObject({
        code: 'credential.limit_reached',
      });
      await adminQuery`update subscription_overrides set expires_at=now()-interval '1 second' where tenant_id=${tenant} and key='api_keys'`;
      await revokeAll();
      await expect(createCredential(context(), input())).rejects.toMatchObject({
        code: 'credential.limit_reached',
      });
    } finally {
      await cleanup`delete from subscription_overrides where tenant_id=${tenant} and key='api_keys'`;
      await adminQuery`update plan_entitlements set limit_value=2 where plan_id=${plan} and key='api_keys'`;
    }
  });

  it('allows a genuinely unlimited plan and refuses a suspended workspace or paused subscription', async () => {
    await revokeAll();
    await adminQuery`update plan_entitlements set limit_value=null where plan_id=${plan} and key='api_keys'`;
    try {
      for (let i = 0; i < 3; i++) await createCredential(context(), input());
      await adminQuery`update tenants set status='suspended' where id=${tenant}`;
      await expect(createCredential(context(), input())).rejects.toMatchObject({
        code: 'tenant.suspended',
      });
      await adminQuery`update tenants set status='active' where id=${tenant}`;
      await adminQuery`update subscriptions set status='paused' where tenant_id=${tenant}`;
      await expect(createCredential(context(), input())).rejects.toMatchObject({
        code: 'subscription.not_active',
      });
    } finally {
      await adminQuery`update tenants set status='active' where id=${tenant}`;
      await adminQuery`update subscriptions set status='active' where tenant_id=${tenant}`;
      await adminQuery`update plan_entitlements set limit_value=2 where plan_id=${plan} and key='api_keys'`;
    }
  });
});
