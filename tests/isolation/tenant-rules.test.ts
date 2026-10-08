import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { adminQuery, cleanup, closeHarness, asActor } from './harness';
import { assertDisposableDatabase } from './disposable';
import { SEED_USER_A, SEED_PLATFORM_ADMIN } from '@/db/seed/constants';
import { createResolvedContext, type TenantRole } from '@/lib/db/context';
import {
  readTenantRules,
  publishTenantRules,
  restoreTenantRules,
  type RulesFields,
} from '@/modules/aiRules';
import * as audit from '@/lib/audit';

const tenant = randomUUID(),
  other = randomUUID(),
  plan = randomUUID(),
  platformVersion = randomUUID();
let original: { id: string; current_version_id: string | null; updated_at: Date };
const ctx = (role: TenantRole = 'owner', tenantId = tenant) =>
  createResolvedContext({
    tenantId,
    role,
    actorId: SEED_USER_A,
    actorType: 'user',
    actorLabel: 'Instructions verification',
    supportMode: false,
    requestId: randomUUID(),
  });
const fields = (businessInformation: string): RulesFields => ({
  tone: '',
  responseGuidelines: '',
  businessInformation,
  escalationInstructions: '',
  prohibitedTopics: '',
  customInstructions: '',
});
async function input(text: string) {
  return {
    fields: fields(text),
    revision: (await readTenantRules(ctx())).revision,
    changeNote: `Record ${text} for verification`,
  };
}
async function publish(text: string) {
  return publishTenantRules(ctx(), await input(text));
}
beforeAll(async () => {
  assertDisposableDatabase();
  const [root] = await adminQuery`select id,current_version_id,updated_at from master_ai_rules`;
  if (!root) throw Error('Disposable platform fixture is missing');
  original = root as typeof original;
  await adminQuery`insert into master_ai_rule_versions (id,version_number,status,content,locked_fields,authored_by,published_at) select ${platformVersion},coalesce(max(version_number),0)+1,'published','{"tone":"Platform safeguard","responseGuidelines":"Platform guidance"}'::jsonb,'["tone"]'::jsonb,${SEED_PLATFORM_ADMIN},now() from master_ai_rule_versions`;
  await adminQuery`update master_ai_rules set current_version_id=${platformVersion},updated_at=now() where id=${original.id}`;
  await adminQuery`insert into tenants (id,slug,name,status) values (${tenant},${`rules-${tenant}`},'Rules verification','active'),(${other},${`rules-${other}`},'Other rules verification','active')`;
  await adminQuery`insert into plans (id,code,name) values (${plan},${`rules-${plan}`},'Rules verification')`;
  await adminQuery`insert into plan_entitlements (plan_id,key,kind,limit_value,display_name) values (${plan},'ai_rules_versions','limit',2,'Instruction versions')`;
  await adminQuery`insert into subscriptions (tenant_id,plan_id,status,current_period_start,current_period_end) values (${tenant},${plan},'active',now(),now()+interval '30 days'),(${other},${plan},'active',now(),now()+interval '30 days')`;
});
afterAll(async () => {
  if (original) {
    await cleanup`update master_ai_rules set current_version_id=${original.current_version_id},updated_at=${original.updated_at} where id=${original.id}`;
    await cleanup`delete from master_ai_rule_versions where id=${platformVersion}`;
    await cleanup`delete from audit_log where tenant_id in (${tenant},${other})`;
    await cleanup`delete from tenant_ai_rules where tenant_id in (${tenant},${other})`;
    await cleanup`delete from tenant_ai_rule_versions where tenant_id in (${tenant},${other})`;
    await cleanup`delete from usage_counters where tenant_id in (${tenant},${other})`;
    await cleanup`delete from subscription_overrides where tenant_id in (${tenant},${other})`;
    await cleanup`delete from subscriptions where tenant_id in (${tenant},${other})`;
    await cleanup`delete from plan_entitlements where plan_id=${plan}`;
    await cleanup`delete from plans where id=${plan}`;
    await cleanup`delete from tenants where id in (${tenant},${other})`;
  }
  await closeHarness();
});
describe('recorded tenant instruction lifecycle under real policies', () => {
  it('publishes immutable content, a live pointer, allowance usage and attributed audit atomically', async () => {
    const actor = ctx();
    const result = await publishTenantRules(actor, await input('First business information'));
    const state = await readTenantRules(ctx('agent'));
    expect(state.current?.id).toBe(result.versionId);
    expect(state.current?.content.businessInformation).toBe('First business information');
    const [entry] =
      await adminQuery`select action,request_id,actor_user_id from audit_log where entity_id=${result.versionId}`;
    expect(entry).toMatchObject({
      action: 'rules.published',
      request_id: actor.requestId,
      actor_user_id: SEED_USER_A,
    });
    const [usage] =
      await adminQuery`select current_value from usage_counters where tenant_id=${tenant} and key='ai_rules_versions'`;
    expect(Number(usage?.current_value)).toBe(1);
  });
  it('refuses locked-field changes and no-op publication without false versions', async () => {
    const before = await readTenantRules(ctx());
    await expect(
      publishTenantRules(ctx(), {
        ...(await input('Unchanged locked floor')),
        fields: { ...fields('Unchanged locked floor'), tone: 'Override platform' },
      }),
    ).rejects.toMatchObject({ code: 'rules.field_locked' });
    await expect(
      publishTenantRules(ctx(), await input(before.current!.content.businessInformation!)),
    ).rejects.toMatchObject({ code: 'validation.failed' });
    expect((await readTenantRules(ctx())).versions.length).toBe(before.versions.length);
  });
  it('serializes competing editors and refuses the stale publication without an audit', async () => {
    const same = await input('Concurrent editor');
    const before = (await readTenantRules(ctx())).versions.length;
    const results = await Promise.allSettled([
      publishTenantRules(ctx(), same),
      publishTenantRules(ctx(), { ...same, fields: fields('Other concurrent editor') }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: 'rules.version_conflict' },
    });
    expect((await readTenantRules(ctx())).versions.length).toBe(before + 1);
  });
  it('archives beyond the allowance while preserving history and rejecting content mutation in SQL', async () => {
    await publish('Third version');
    const state = await readTenantRules(ctx());
    expect(state.versions.filter((version) => version.status === 'published')).toHaveLength(2);
    const archived = state.versions.find((version) => version.status === 'archived');
    expect(archived).toBeDefined();
    await expect(
      asActor(
        { tenantId: tenant, role: 'owner', actorId: SEED_USER_A, supportMode: false },
        (tx) =>
          tx`update tenant_ai_rule_versions set content='{"businessInformation":"Tampered"}'::jsonb where id=${archived!.id}`,
      ),
    ).rejects.toMatchObject({ code: '42501' });
    expect(
      (await readTenantRules(ctx())).versions.find((version) => version.id === archived!.id)
        ?.content,
    ).toEqual(archived!.content);
  });
  it('restores archived content without renumbering or losing later versions and catches an ABA edit', async () => {
    const before = await readTenantRules(ctx());
    const stale = await input('Stale after A to B to A');
    const target = before.versions.find((version) => version.status === 'archived')!;
    const actor = ctx();
    const restored = await restoreTenantRules(actor, {
      versionId: target.id,
      revision: before.revision,
      changeNote: 'Restore original instructions for verification',
    });
    expect(restored.versionId).toBe(target.id);
    const [event] =
      await adminQuery`select before,after from audit_log where tenant_id=${tenant} and request_id=${actor.requestId} and action='rules.rolled_back'`;
    expect(event?.before).toMatchObject({ versionNumber: before.current!.versionNumber });
    expect(event?.after).toMatchObject({ versionNumber: target.versionNumber });
    const middle = await readTenantRules(ctx());
    await restoreTenantRules(ctx(), {
      versionId: before.current!.id,
      revision: middle.revision,
      changeNote: 'Return to the reviewed live instructions',
    });
    expect((await readTenantRules(ctx())).versions).toHaveLength(before.versions.length);
    await expect(publishTenantRules(ctx(), stale)).rejects.toMatchObject({
      code: 'rules.version_conflict',
    });
  });
  it('rejects a stale platform revision before writing workspace content', async () => {
    const stale = await input('Stale platform');
    try {
      await adminQuery`update master_ai_rules set updated_at=updated_at+interval '1 second' where id=${original.id}`;
      await expect(publishTenantRules(ctx(), stale)).rejects.toMatchObject({
        code: 'rules.version_conflict',
      });
    } finally {
      await adminQuery`update master_ai_rules set updated_at=${stale.revision.masterUpdatedAt} where id=${original.id}`;
    }
  });
  it('denies agent and service publication, including direct agent root insertion', async () => {
    await expect(
      publishTenantRules(ctx('agent'), await input('Agent write')),
    ).rejects.toMatchObject({ code: 'auth.role_not_permitted' });
    await expect(
      asActor(
        { tenantId: other, role: 'agent', actorId: SEED_USER_A, supportMode: false },
        (tx) => tx`insert into tenant_ai_rules (tenant_id) values (${other})`,
      ),
    ).rejects.toMatchObject({ code: '42501' });
    const service = createResolvedContext({ ...ctx(), actorType: 'service' });
    await expect(publishTenantRules(service, await input('Service write'))).rejects.toMatchObject({
      code: 'auth.role_not_permitted',
    });
  });
  it('does not expose or restore another workspace version', async () => {
    const state = await readTenantRules(ctx());
    const foreign = await readTenantRules(ctx('owner', other));
    expect(foreign.versions).toEqual([]);
    await expect(
      restoreTenantRules(ctx('owner', other), {
        versionId: state.current!.id,
        revision: foreign.revision,
        changeNote: 'Attempt cross-workspace restoration',
      }),
    ).rejects.toMatchObject({ code: 'not_found' });
  });
  it('uses live overrides and archives again after the override expires', async () => {
    await adminQuery`insert into subscription_overrides (tenant_id,key,limit_value,reason,granted_by) values (${tenant},'ai_rules_versions',null,'Unlimited verification',${SEED_PLATFORM_ADMIN})`;
    await publish('Unlimited version one');
    await publish('Unlimited version two');
    expect(
      (await readTenantRules(ctx())).versions.filter((version) => version.status === 'published')
        .length,
    ).toBeGreaterThan(2);
    await adminQuery`update subscription_overrides set expires_at=now()-interval '1 second' where tenant_id=${tenant} and key='ai_rules_versions'`;
    await publish('After override expiry');
    expect(
      (await readTenantRules(ctx())).versions.filter((version) => version.status === 'published'),
    ).toHaveLength(2);
    await cleanup`delete from subscription_overrides where tenant_id=${tenant}`;
  });
  it('refuses missing/zero allowances and suspended workspaces without writes', async () => {
    const before = (await readTenantRules(ctx())).versions.length;
    try {
      await adminQuery`update plan_entitlements set limit_value=0 where plan_id=${plan}`;
      await expect(publish('Zero allowance')).rejects.toMatchObject({
        code: 'entitlement.feature_unavailable',
      });
      await adminQuery`update plan_entitlements set key='unavailable_rules' where plan_id=${plan}`;
      await expect(publish('Missing allowance')).rejects.toMatchObject({
        code: 'entitlement.feature_unavailable',
      });
      await adminQuery`update tenants set status='suspended' where id=${tenant}`;
      await expect(publish('Suspended workspace')).rejects.toMatchObject({
        code: 'tenant.suspended',
      });
    } finally {
      await adminQuery`update plan_entitlements set key='ai_rules_versions',limit_value=2 where plan_id=${plan}`;
      await adminQuery`update tenants set status='active' where id=${tenant}`;
    }
    expect((await readTenantRules(ctx())).versions.length).toBe(before);
  });
  it('rolls back pointer, version, archival and usage if the audit is refused', async () => {
    const before = await readTenantRules(ctx());
    const spy = vi
      .spyOn(audit, 'writeAudit')
      .mockRejectedValueOnce(new Error('Deliberately refused audit'));
    try {
      await expect(publish('Rejected audit publication')).rejects.toThrow(
        'Deliberately refused audit',
      );
    } finally {
      spy.mockRestore();
    }
    const after = await readTenantRules(ctx());
    expect(after.current?.id).toBe(before.current?.id);
    expect(after.versions).toEqual(before.versions);
  });
  it('returns an explicit unavailable state when the published platform floor is missing', async () => {
    try {
      await adminQuery`update master_ai_rules set current_version_id=null where id=${original.id}`;
      await expect(readTenantRules(ctx())).rejects.toMatchObject({ code: 'upstream.unavailable' });
    } finally {
      await adminQuery`update master_ai_rules set current_version_id=${platformVersion} where id=${original.id}`;
    }
  });
});
