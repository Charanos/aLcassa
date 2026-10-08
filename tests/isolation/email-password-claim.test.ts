import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  claimEmailPasswordChange,
  markEmailPasswordSaved,
  releaseEmailPasswordChange,
} from '@/lib/auth/emailSession';
import { ERROR_CODES } from '@/lib/errors';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';

const userId = randomUUID();
const strangerId = randomUUID();
const flowId = randomUUID();
const otherFlowId = randomUUID();
let prepared = false;
beforeAll(async () => {
  assertDisposableDatabase();
  prepared = true;
  await adminQuery`insert into user_profiles(id,full_name) values(${userId},'Password verification'),(${strangerId},'Other account')`;
  await adminQuery`insert into sessions(id,user_id,kind,effective_role,last_activity_at,expires_at) values
    (${flowId},${userId},'recovery','recovery',now(),now()+interval '15 minutes'),
    (${otherFlowId},${userId},'recovery','invite',now(),now()+interval '15 minutes')`;
});
beforeEach(async () => {
  await adminQuery`update sessions set effective_role=case when id=${flowId} then 'recovery' else 'invite' end,
    revoked_at=null,expires_at=now()+interval '15 minutes' where user_id=${userId}`;
});
afterAll(async () => {
  if (!prepared) return;
  await cleanup`delete from sessions where user_id=${userId}`;
  await cleanup`delete from user_profiles where id in (${userId},${strangerId})`;
  await closeHarness();
});
describe('Password write claims under actual session policies', () => {
  it('keeps session rows private to the application connection', async () => {
    const publicGrants =
      await adminQuery`select role,has_table_privilege(role,'public.sessions','SELECT') as can_read,
      has_table_privilege(role,'public.sessions','INSERT') as can_insert,
      has_table_privilege(role,'public.sessions','UPDATE') as can_update,
      has_table_privilege(role,'public.sessions','DELETE') as can_delete
      from unnest(array['anon','authenticated']) as role`;
    expect(publicGrants).toEqual([
      { role: 'anon', can_read: false, can_insert: false, can_update: false, can_delete: false },
      {
        role: 'authenticated',
        can_read: false,
        can_insert: false,
        can_update: false,
        can_delete: false,
      },
    ]);
    const [application] =
      await adminQuery`select has_table_privilege('alcassa_app','public.sessions','INSERT') as can_issue,
      has_table_privilege('alcassa_app','public.sessions','UPDATE') as can_revoke`;
    expect(application).toEqual({ can_issue: true, can_revoke: true });
  });
  it('admits one concurrent write across two email flows for the same account', async () => {
    const results = await Promise.allSettled([
      claimEmailPasswordChange(flowId, userId, 'recovery', randomUUID()),
      claimEmailPasswordChange(otherFlowId, userId, 'invite', randomUUID()),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    const failed = results.find((result) => result.status === 'rejected');
    expect(failed?.status === 'rejected' && failed.reason).toMatchObject({
      code: ERROR_CODES.AUTH_FLOW_IN_PROGRESS,
    });
  });
  it('refuses another identity without changing the flow', async () => {
    await expect(
      claimEmailPasswordChange(flowId, strangerId, 'recovery', randomUUID()),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_SESSION_EXPIRED });
    const [row] = await adminQuery`select effective_role from sessions where id=${flowId}`;
    expect(row?.effective_role).toBe('recovery');
  });
  it('refuses expired, revoked and purpose-mismatched proof', async () => {
    await adminQuery`update sessions set expires_at=now()-interval '1 second' where id=${flowId}`;
    await expect(
      claimEmailPasswordChange(flowId, userId, 'recovery', randomUUID()),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_SESSION_EXPIRED });
    await adminQuery`update sessions set expires_at=now()+interval '15 minutes',revoked_at=now() where id=${flowId}`;
    await expect(
      claimEmailPasswordChange(flowId, userId, 'recovery', randomUUID()),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_SESSION_EXPIRED });
    await adminQuery`update sessions set revoked_at=null where id=${flowId}`;
    await expect(
      claimEmailPasswordChange(flowId, userId, 'invite', randomUUID()),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_SESSION_EXPIRED });
  });
  it('permits retry after a definite refusal and prevents rewriting a saved password', async () => {
    await claimEmailPasswordChange(flowId, userId, 'recovery', randomUUID());
    await releaseEmailPasswordChange(flowId, userId, 'recovery', randomUUID());
    await claimEmailPasswordChange(flowId, userId, 'recovery', randomUUID());
    await markEmailPasswordSaved(flowId, userId, 'recovery', randomUUID());
    await expect(
      claimEmailPasswordChange(flowId, userId, 'recovery', randomUUID()),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_SESSION_EXPIRED });
    await expect(
      markEmailPasswordSaved(flowId, userId, 'recovery', randomUUID()),
    ).rejects.toMatchObject({ code: ERROR_CODES.AUTH_SESSION_EXPIRED });
  });
});
