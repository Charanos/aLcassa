import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SEED_PLATFORM_ADMIN } from '@/db/seed/constants';
import { publishMasterRules, rollbackMasterRules, type MasterRulesInput } from '@/modules/platform';
import { ERROR_CODES } from '@/lib/errors';
import { adminQuery, cleanup, closeHarness } from './harness';
import { assertDisposableDatabase } from './disposable';

const requests: string[] = [];
const created: string[] = [];
let original: { id: string; current_version_id: string | null; updated_at: Date };
let currentVersion = 0;
const fields: MasterRulesInput = {
  tone: 'Verification tone',
  responseGuidelines: 'Verification guidance',
  businessInformation: '',
  escalationInstructions: '',
  prohibitedTopics: '',
  customInstructions: '',
};
function actor() {
  const requestId = randomUUID();
  requests.push(requestId);
  return { userId: SEED_PLATFORM_ADMIN, label: 'Rule verification', requestId };
}
beforeAll(async () => {
  assertDisposableDatabase();
  const [root] = await adminQuery`select id,current_version_id,updated_at from master_ai_rules`;
  if (!root) throw Error('Master fixture is missing');
  original = root as typeof original;
  const [version] =
    await adminQuery`select version_number from master_ai_rule_versions where id=${original.current_version_id}`;
  currentVersion = Number(version?.version_number ?? 0);
});
afterAll(async () => {
  if (original)
    await cleanup`update master_ai_rules set current_version_id=${original.current_version_id},updated_at=${original.updated_at} where id=${original.id}`;
  if (requests.length)
    await cleanup`delete from platform_audit_log where request_id=any(${requests})`;
  if (created.length) await cleanup`delete from master_ai_rule_versions where id=any(${created})`;
  await closeHarness();
});
async function publish(expectedVersionNumber: number) {
  const result = await publishMasterRules(
    {
      fields,
      changeNote: 'Verified shared guidance publication',
      lockedFields: ['tone'],
      expectedVersionNumber,
    },
    actor(),
  );
  created.push(result.versionId);
  return result;
}
async function current() {
  const [root] =
    await adminQuery`select current_version_id from master_ai_rules where id=${original.id}`;
  return root?.current_version_id;
}
describe('shared-rule publication and restoration concurrency', () => {
  it('serializes competing publications and refuses the stale editor without a false audit', async () => {
    const results = await Promise.allSettled([publish(currentVersion), publish(currentVersion)]);
    const successful = results.find((result) => result.status === 'fulfilled');
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')).toMatchObject({
      reason: { code: ERROR_CODES.VALIDATION_FAILED },
    });
    if (successful?.status !== 'fulfilled') throw Error('Publication did not succeed');
    expect(await current()).toBe(successful.value.versionId);
    currentVersion = successful.value.versionNumber;
    expect(
      await adminQuery`select id from platform_audit_log where request_id=any(${requests})`,
    ).toHaveLength(1);
  });
  it('refuses a stale restoration and preserves the current pointer', async () => {
    const before = await current(),
      caller = actor();
    await expect(
      rollbackMasterRules(
        {
          versionId: created[0]!,
          reason: 'Review stale restoration behavior',
          expectedVersionNumber: currentVersion - 1,
        },
        caller,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
    expect(await current()).toBe(before);
    expect(
      await adminQuery`select id from platform_audit_log where request_id=${caller.requestId}`,
    ).toHaveLength(0);
  });
  it('restores a reviewed published version without modifying historical content', async () => {
    const first = created[0]!;
    const [before] =
      await adminQuery`select content,locked_fields from master_ai_rule_versions where id=${first}`;
    const next = await publish(currentVersion);
    currentVersion = next.versionNumber;
    const caller = actor();
    const result = await rollbackMasterRules(
      {
        versionId: first,
        reason: 'Restore the earlier verified guidance',
        expectedVersionNumber: currentVersion,
      },
      caller,
    );
    expect(await current()).toBe(first);
    expect(result.versionNumber).toBe(currentVersion - 1);
    expect(
      (
        await adminQuery`select content,locked_fields from master_ai_rule_versions where id=${first}`
      )[0],
    ).toEqual(before);
    expect(
      await adminQuery`select id from master_ai_rule_versions where id=any(${created})`,
    ).toHaveLength(2);
    expect(
      await adminQuery`select action from platform_audit_log where request_id=${caller.requestId}`,
    ).toEqual([{ action: 'rules.rolled_back' }]);
    currentVersion = result.versionNumber;
  });
  it('rejects draft restoration and rolls back its attempted audit', async () => {
    const versionId = randomUUID();
    created.push(versionId);
    await adminQuery`insert into master_ai_rule_versions(id,version_number,status,content,authored_by) select ${versionId},max(version_number)+1,'draft','{}'::jsonb,${SEED_PLATFORM_ADMIN} from master_ai_rule_versions`;
    const before = await current(),
      caller = actor();
    await expect(
      rollbackMasterRules(
        {
          versionId,
          reason: 'Draft restoration verification',
          expectedVersionNumber: currentVersion,
        },
        caller,
      ),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION_FAILED });
    expect(await current()).toBe(before);
    expect(
      await adminQuery`select id from platform_audit_log where request_id=${caller.requestId}`,
    ).toHaveLength(0);
  });
});
