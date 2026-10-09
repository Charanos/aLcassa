import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';
import { createResolvedContext } from '@/lib/db/context';
import { resolveSession } from '@/lib/auth/session';
import type * as AuditModule from '@/lib/audit';
const fault = vi.hoisted(() => ({ audit: false }));
vi.mock('@/lib/audit', async (importOriginal) => {
  const actual = await importOriginal<typeof AuditModule>();
  return {
    ...actual,
    writeAudit: (...args: Parameters<typeof actual.writeAudit>) => {
      if (fault.audit) throw Error('Injected audit outage');
      return actual.writeAudit(...args);
    },
  };
});
import { endOwnSessions } from '@/modules/identity';
const tenant = randomUUID(),
  actor = randomUUID(),
  foreign = randomUUID(),
  current = randomUUID();
const ids: string[] = [];
const ctx = createResolvedContext({
  tenantId: tenant,
  actorId: actor,
  role: 'owner',
  actorType: 'user',
  actorLabel: 'Device verification',
  supportMode: false,
  requestId: 'device-verification',
  sessionId: current,
});
beforeAll(async () => {
  assertDisposableDatabase();
  await adminQuery`insert into tenants(id,slug,name,status) values(${tenant},${`devices-${tenant}`},'Device verification','active')`;
  await adminQuery`insert into user_profiles(id,full_name,email) values(${actor},'Device verifier',${`devices-${actor}@example.invalid`}),(${foreign},'Other account',${`devices-${foreign}@example.invalid`})`;
  await adminQuery`insert into tenant_members(tenant_id,user_id,role,status) values(${tenant},${actor},'owner','active'),(${tenant},${foreign},'agent','active')`;
});
afterEach(async () => {
  fault.audit = false;
  await cleanup`delete from audit_log where tenant_id=${tenant}`;
  await cleanup`delete from sessions where user_id in (${actor},${foreign})`;
});
afterAll(async () => {
  await cleanup`delete from tenant_members where tenant_id=${tenant}`;
  await cleanup`delete from tenants where id=${tenant}`;
  await cleanup`delete from user_profiles where id in (${actor},${foreign})`;
  await closeHarness();
});
async function session(user = actor, kind = 'tenant', expired = false, id = randomUUID()) {
  ids.push(id);
  await adminQuery`insert into sessions(id,user_id,kind,tenant_id,last_activity_at,expires_at) values(${id},${user},${kind},${tenant},now(),${new Date(Date.now() + (expired ? -60000 : 3600000))})`;
  return id;
}
it('ends one owned session immediately and writes one audit', async () => {
  const id = await session();
  expect(await endOwnSessions(ctx, id)).toEqual({ count: 1, wasCurrent: false });
  expect(await resolveSession(id, actor, 'device-readback')).toBeNull();
  expect(
    await adminQuery`select entity_id,action from audit_log where tenant_id=${tenant}`,
  ).toEqual([{ entity_id: id, action: 'session.revoked' }]);
});
it('bulk preserves current, foreign, expired and recovery sessions', async () => {
  await session(actor, 'tenant', false, current);
  await session();
  await session();
  const other = await session(foreign),
    expired = await session(actor, 'tenant', true),
    recovery = await session(actor, 'recovery');
  expect(await endOwnSessions(ctx, 'all')).toEqual({ count: 2, wasCurrent: false });
  const remaining =
    await adminQuery`select id from sessions where user_id in (${actor},${foreign}) and revoked_at is null`;
  expect(remaining.map((row) => row.id).sort()).toEqual([current, other, expired, recovery].sort());
  expect(await adminQuery`select action from audit_log where tenant_id=${tenant}`).toHaveLength(1);
});
it('refuses unavailable and foreign sessions without disclosing their ownership', async () => {
  const id = await session(foreign);
  for (const candidate of [id, randomUUID(), 'invalid'])
    await expect(endOwnSessions(ctx, candidate)).rejects.toMatchObject({
      code: 'not_found',
    });
  expect(await adminQuery`select id from audit_log where tenant_id=${tenant}`).toHaveLength(0);
  expect(
    await adminQuery`select id from sessions where id=${id} and revoked_at is null`,
  ).toHaveLength(1);
});
it('requires a current session for bulk and produces no audit for a no-op', async () => {
  await expect(endOwnSessions({ ...ctx, sessionId: null }, 'all')).rejects.toMatchObject({
    status: 404,
  });
  expect(await endOwnSessions(ctx, 'all')).toEqual({ count: 0, wasCurrent: false });
  expect(await adminQuery`select id from audit_log where tenant_id=${tenant}`).toHaveLength(0);
});
it('rolls revocation back when its audit cannot be written', async () => {
  const id = await session();
  fault.audit = true;
  await expect(endOwnSessions(ctx, id)).rejects.toThrow('Injected audit outage');
  expect(
    await adminQuery`select id from sessions where id=${id} and revoked_at is null`,
  ).toHaveLength(1);
});
it('concurrent duplicate revocation has one committed outcome and one audit', async () => {
  const id = await session();
  const results = await Promise.allSettled([endOwnSessions(ctx, id), endOwnSessions(ctx, id)]);
  expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
  expect(await adminQuery`select id from audit_log where tenant_id=${tenant}`).toHaveLength(1);
});
