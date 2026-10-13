import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { adminQuery, cleanup, closeHarness } from './harness';
import { createResolvedContext } from '@/lib/db/context';
import { withTenantContext } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { ERROR_CODES } from '@/lib/errors';
import { readSupportSession } from '@/modules/platform';

const operator = randomUUID(),
  tenant = randomUUID(),
  session = randomUUID();
const context = createResolvedContext({
  tenantId: tenant,
  role: 'support',
  actorId: operator,
  actorLabel: 'Support authority verifier',
  actorType: 'platform_admin',
  supportMode: true,
  requestId: randomUUID(),
  sessionId: session,
});
beforeAll(async () => {
  await adminQuery`insert into user_profiles(id,email,full_name) values(${operator},${`authority-${operator}@example.invalid`},'Support authority verifier')`;
  await adminQuery`insert into platform_admins(user_id,display_name) values(${operator},'Support authority verifier')`;
  await adminQuery`insert into tenants(id,slug,name,status) values(${tenant},${`authority-${tenant}`},'Support authority verification','active')`;
  await adminQuery`insert into sessions(id,user_id,kind,tenant_id,effective_role,last_activity_at,expires_at) values(${session},${operator},'support',${tenant},'support',now(),now()+interval '30 minutes')`;
});
afterAll(async () => {
  await cleanup`delete from sessions where id=${session}`;
  await cleanup`delete from tenants where id=${tenant}`;
  await cleanup`delete from platform_admins where user_id=${operator}`;
  await cleanup`delete from user_profiles where id=${operator}`;
  await closeHarness();
});
it('refuses an already-resolved support context after capability removal, expiry, revocation or a mismatched workspace', async () => {
  const read = () =>
    withTenantContext(context, (tx) =>
      tx.execute(sql`select id from tenants where id=${tenant}::uuid`),
    );
  expect(await read()).toHaveLength(1);
  await adminQuery`update platform_admins set can_enter_support_mode=false where user_id=${operator}`;
  expect(
    await readSupportSession(session, {
      userId: operator,
      label: 'Support verifier',
      requestId: randomUUID(),
    }),
  ).toBeNull();
  await expect(read()).rejects.toMatchObject({ code: ERROR_CODES.SUPPORT_SESSION_EXPIRED });
  await adminQuery`update platform_admins set can_enter_support_mode=true where user_id=${operator}`;
  await adminQuery`update sessions set expires_at=now()-interval '1 second' where id=${session}`;
  await expect(read()).rejects.toMatchObject({ code: ERROR_CODES.SUPPORT_SESSION_EXPIRED });
  await adminQuery`update sessions set expires_at=now()+interval '30 minutes',revoked_at=now() where id=${session}`;
  await expect(read()).rejects.toMatchObject({ code: ERROR_CODES.SUPPORT_SESSION_EXPIRED });
  await adminQuery`update sessions set revoked_at=null where id=${session}`;
  await expect(
    withTenantContext({ ...context, tenantId: randomUUID() }, (tx) => tx.execute(sql`select 1`)),
  ).rejects.toMatchObject({ code: ERROR_CODES.SUPPORT_SESSION_EXPIRED });
  await adminQuery`update platform_admins set deleted_at=now() where user_id=${operator}`;
  await expect(read()).rejects.toMatchObject({ code: ERROR_CODES.SUPPORT_SESSION_EXPIRED });
});
