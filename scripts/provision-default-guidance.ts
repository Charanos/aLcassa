/** Explicit, audited publication of the platform's default conversation guidance. */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import postgres from 'postgres';
import { DEFAULT_MASTER_LOCKS, DEFAULT_MASTER_RULES } from '../src/modules/aiRules/defaults';

async function main() {
  const connection = process.env.DATABASE_URL_ADMIN;
  assert(connection, 'An administrator database connection is required.');
  const local = ['localhost', '127.0.0.1'].includes(new URL(connection).hostname);
  assert(
    local || process.argv.includes('--hosted-sandbox'),
    'Hosted sandbox publication must be explicit.',
  );
  const sql = postgres(connection, { prepare: false, max: 1 });
  const expected = {
    ...DEFAULT_MASTER_RULES,
    prohibitedTopics: DEFAULT_MASTER_RULES.prohibitedTopics.split('\n'),
  };
  try {
    const [actor] = await sql<{ user_id: string; display_name: string }[]>`
      select user_id,display_name from platform_admins where deleted_at is null and can_edit_master_rules=true order by created_at limit 1`;
    assert(actor, 'A current platform administrator with rule editing permission is required.');
    const [current] = await sql<
      {
        version_number: number | null;
        content: Record<string, unknown> | null;
        locked_fields: string[] | null;
      }[]
    >`
      select v.version_number,v.content,v.locked_fields from master_ai_rules r left join master_ai_rule_versions v on v.id=r.current_version_id where r.singleton=true`;
    assert(current, 'Initialize the master rules singleton before provisioning guidance.');
    const matches =
      Object.entries(expected).every(
        ([key, value]) => JSON.stringify(current.content?.[key]) === JSON.stringify(value),
      ) &&
      JSON.stringify([...(current.locked_fields ?? [])].sort()) ===
        JSON.stringify([...DEFAULT_MASTER_LOCKS].sort());
    if (!process.argv.includes('--apply')) {
      console.log(
        JSON.stringify({
          localOnly: local,
          hasPublishedGuidance: current.version_number !== null,
          recommendedDefaultsCurrent: matches,
        }),
      );
      return;
    }
    assert(
      !current.version_number || matches || process.argv.includes('--replace'),
      'Existing guidance is preserved unless --replace explicitly publishes a new version.',
    );
    const requestId = randomUUID();
    let versionNumber = current.version_number ?? 0;
    if (!matches) {
      const { publishMasterRules } = await import('../src/modules/platform');
      const result = await publishMasterRules(
        {
          fields: DEFAULT_MASTER_RULES,
          lockedFields: [...DEFAULT_MASTER_LOCKS],
          expectedVersionNumber: versionNumber,
          changeNote:
            'Establish reviewed default conversation guidance, verified business facts, privacy safeguards and clear human escalation.',
        },
        { userId: actor.user_id, label: actor.display_name, requestId },
      );
      versionNumber = result.versionNumber;
    }
    const [confirmed] = await sql<
      {
        version_number: number;
        status: string;
        content: Record<string, unknown>;
        locked_fields: string[];
      }[]
    >`
      select v.version_number,v.status,v.content,v.locked_fields from master_ai_rules r join master_ai_rule_versions v on v.id=r.current_version_id`;
    assert(confirmed);
    assert.equal(confirmed.version_number, versionNumber);
    assert.equal(confirmed.status, 'published');
    for (const [key, value] of Object.entries(expected))
      assert.deepEqual(confirmed.content[key], value);
    assert.deepEqual([...confirmed.locked_fields].sort(), [...DEFAULT_MASTER_LOCKS].sort());
    if (!matches) {
      const [audit] = await sql<
        { n: number }[]
      >`select count(*)::int as n from platform_audit_log where request_id=${requestId} and action='rules.published' and used_service_role=true`;
      assert.equal(audit?.n, 1);
    }
    const receipt = {
      checkedAt: new Date().toISOString(),
      target: local ? 'local' : 'hosted-sandbox',
      passed: true,
      versionNumber,
      outcome: matches ? 'unchanged' : 'published',
      fields: Object.keys(expected),
      lockedFields: [...DEFAULT_MASTER_LOCKS],
      independentDatabaseReadback: true,
      auditedPublication: !matches,
      boundary:
        'Published instructions are consumed by the tenant and service rule compilation path. Phase Two owns conversation generation and channel delivery.',
    };
    await mkdir('.test-report/phase-one', { recursive: true });
    await writeFile(
      `.test-report/phase-one/default-guidance-${receipt.target}.json`,
      JSON.stringify(receipt, null, 2) + '\n',
    );
    console.log(JSON.stringify(receipt));
  } finally {
    await sql.end();
  }
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Default guidance provision failed.');
  process.exitCode = 1;
});
