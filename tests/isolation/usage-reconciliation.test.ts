import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';
import { SEED_PLATFORM_ADMIN, SEED_USER_A } from '@/db/seed/constants';
import { inspectUsage, repairUsage } from '@/lib/usage/reconciliation';
import { GET } from '@/app/api/cron/reconcile/route';

const tenantId = randomUUID();
const admin = postgres(process.env.DATABASE_URL_ADMIN!, { prepare: false, max: 2 });
const restricted = postgres(process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL!, {
  prepare: false,
  max: 1,
});
const originalSecret = process.env.CRON_SECRET;
beforeAll(async () => {
  assertDisposableDatabase();
  await adminQuery`insert into tenants(id,slug,name,status) values
    (${tenantId},${`reconcile-${tenantId}`},'Reconciliation fixture','active')`;
  await adminQuery`insert into tenant_members(tenant_id,user_id,role,status)
    values(${tenantId},${SEED_USER_A},'owner','active')`;
  await adminQuery`insert into invitations(tenant_id,email,role,token_hash,invited_by,expires_at)
    values(${tenantId},'reconcile@example.invalid','agent',${randomUUID()},${SEED_USER_A},now()-interval '1 day')`;
  await adminQuery`insert into tenant_ai_rule_versions(tenant_id,version_number,status,content,authored_by)
    values(${tenantId},1,'published','{}',${SEED_USER_A}),
    (${tenantId},2,'archived','{}',${SEED_USER_A}),(${tenantId},3,'draft','{}',${SEED_USER_A})`;
});
afterAll(async () => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
  await cleanup`delete from platform_audit_log where target_tenant_id=${tenantId}`;
  await cleanup`delete from tenant_ai_rule_versions where tenant_id=${tenantId}`;
  await cleanup`delete from usage_counters where tenant_id=${tenantId}`;
  await cleanup`delete from invitations where tenant_id=${tenantId}`;
  await cleanup`delete from tenant_members where tenant_id=${tenantId}`;
  await cleanup`delete from tenants where id=${tenantId}`;
  await Promise.all([admin.end(), restricted.end(), closeHarness()]);
});
describe('durable resource reconciliation', () => {
  it('counts reserved seats and published retained versions, excluding drafts and archives', async () => {
    const report = await inspectUsage(admin, tenantId);
    expect(report.checked).toBe(3);
    expect(report.drift.map(({ key, actual }) => ({ key, actual }))).toEqual([
      { key: 'ai_rules_versions', actual: 1 },
      { key: 'seats', actual: 2 },
    ]);
    expect(
      (await adminQuery`select id from usage_counters where tenant_id=${tenantId}`).length,
    ).toBe(0);
  });
  it('refuses RLS-filtered maintenance and non-administrator or unexplained repairs', async () => {
    await expect(inspectUsage(restricted, tenantId)).rejects.toThrow('administrative connection');
    await expect(
      repairUsage(admin, { actorId: SEED_USER_A, reason: 'Owned fixture', tenantId }),
    ).rejects.toThrow('active platform administrator');
    await expect(
      repairUsage(admin, { actorId: SEED_PLATFORM_ADMIN, reason: ' ', tenantId }),
    ).rejects.toThrow('concise reason');
  });
  it('recounts, preserves peaks and audits each repair once; repeated repair writes nothing', async () => {
    await adminQuery`insert into usage_counters(tenant_id,key,current_value,peak_value)
      values(${tenantId},'seats',9,12),(${tenantId},'api_keys',7,8)`;
    const repaired = await repairUsage(admin, {
      actorId: SEED_PLATFORM_ADMIN,
      reason: 'Remove intentionally injected acceptance drift',
      tenantId,
    });
    expect(repaired.repaired).toBe(3);
    expect(await inspectUsage(admin, tenantId)).toEqual({ checked: 3, drift: [] });
    const [counter] = await adminQuery`select current_value,peak_value,last_recalculated_at
      from usage_counters where tenant_id=${tenantId} and key='seats'`;
    expect(counter?.current_value).toBe(2);
    expect(counter?.peak_value).toBe(12);
    expect(counter?.last_recalculated_at).toBeTruthy();
    const rows = await adminQuery`select action,before,after,reason from platform_audit_log
      where target_tenant_id=${tenantId} and request_id=${repaired.requestId}`;
    expect(rows.length).toBe(3);
    expect(
      rows.every(
        (row) =>
          row.action === 'usage.reconciled' &&
          typeof row.before === 'object' &&
          typeof row.after === 'object',
      ),
    ).toBe(true);
    expect(
      (
        await repairUsage(admin, {
          actorId: SEED_PLATFORM_ADMIN,
          reason: 'Repeat verification',
          tenantId,
        })
      ).repaired,
    ).toBe(0);
    expect(
      (await adminQuery`select id from platform_audit_log where target_tenant_id=${tenantId}`)
        .length,
    ).toBe(3);
  });
  it('scheduled reports require the secret, cover all counters and leave detected drift untouched', async () => {
    delete process.env.CRON_SECRET;
    const request = (secret?: string) =>
      new NextRequest('http://localhost/api/cron/reconcile', {
        headers: secret ? { authorization: `Bearer ${secret}` } : {},
      });
    expect((await GET(request())).status).toBe(404);
    process.env.CRON_SECRET = randomUUID();
    expect((await GET(request('incorrect'))).status).toBe(404);
    await adminQuery`update usage_counters set current_value=4 where tenant_id=${tenantId} and key='api_keys'`;
    for (let index = 0; index < 2; index++) {
      const response = await GET(request(process.env.CRON_SECRET));
      expect(response.status).toBe(200);
      const body = (await response.json()) as {
        checked: number;
        drift: { tenantId: string; key: string; stored: number; actual: number }[];
      };
      expect(body.checked).toBeGreaterThanOrEqual(3);
      expect(body.drift).toContainEqual(
        expect.objectContaining({ tenantId, key: 'api_keys', stored: 4, actual: 0 }),
      );
    }
    expect((await inspectUsage(admin, tenantId)).drift[0]?.stored).toBe(4);
  });
  it('waits for an in-flight membership writer and recounts committed source rows', async () => {
    let release!: () => void;
    let locked!: () => void;
    const ready = new Promise<void>((done) => {
      locked = done;
    });
    const held = new Promise<void>((done) => {
      release = done;
    });
    const writer = admin.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(hashtextextended(${`membership:${tenantId}`},0))`;
      locked();
      await held;
      await tx`update tenant_members set status='suspended' where tenant_id=${tenantId}`;
    });
    await ready;
    const repair = repairUsage(admin, {
      actorId: SEED_PLATFORM_ADMIN,
      reason: 'Verify concurrent source changes',
      tenantId,
    });
    release();
    await writer;
    await repair;
    expect(await inspectUsage(admin, tenantId)).toEqual({ checked: 3, drift: [] });
    expect(
      await adminQuery`select current_value from usage_counters where tenant_id=${tenantId} and key='seats'`,
    ).toEqual([{ current_value: 1 }]);
  });
});
