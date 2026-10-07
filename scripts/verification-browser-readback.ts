import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import dotenv from 'dotenv';
import postgres from 'postgres';

type SubscriptionRecord = {
  tenant_id: string;
  code: string;
  price_amount: string;
  contract_amount: string | null;
};
type ContractSnapshot = { plan: string; monthly: number | null };
type ChangeRecord = {
  platform_audit_id: string;
  customer_audit_id: string | null;
  before: ContractSnapshot | null;
  after: ContractSnapshot | null;
  reason: string;
  request_id: string;
  actor_type: string | null;
  action: string | null;
  customer_after: Record<string, unknown> | null;
};

async function main() {
  const env = dotenv.parse(await readFile('.env.verification.local', 'utf8'));
  const endpoint = new URL(env.DATABASE_URL_ADMIN!);
  assert.equal(endpoint.hostname, '127.0.0.1');
  assert.equal(endpoint.port, '55422');
  const sql = postgres(env.DATABASE_URL_ADMIN!, { prepare: false, max: 1 });
  try {
    const [subscription] = await sql<
      SubscriptionRecord[]
    >`select t.id as tenant_id, p.code, p.price_amount, s.contract_amount
    from tenants t join subscriptions s on s.tenant_id=t.id join plans p on p.id=s.plan_id
    where t.slug='acme-industrial'`;
    assert.ok(subscription);
    assert.equal(subscription.code, 'pro');
    assert.equal(Number(subscription?.price_amount), 3400);
    const changes = await sql<
      ChangeRecord[]
    >`select p.id as platform_audit_id, p.before, p.after, p.reason, p.request_id,
    a.id as customer_audit_id, a.actor_type, a.action, a.after as customer_after
    from platform_audit_log p left join audit_log a on a.request_id=p.request_id
      and a.tenant_id=p.target_tenant_id and a.action=p.action
    where p.target_tenant_id=${subscription.tenant_id} and p.action='subscription.plan_assigned'
      and p.reason like 'Disposable verification%' order by p.occurred_at desc limit 2`;
    assert.equal(changes.length, 2);
    assert.equal(changes[0]?.after?.plan, 'pro');
    assert.equal(changes[0]?.after?.monthly, 3400);
    assert.equal(changes[0]?.before?.plan, 'business');
    assert.equal(changes[0]?.before?.monthly, 17000);
    assert.equal(changes[1]?.after?.plan, 'business');
    assert.equal(changes[1]?.after?.monthly, 17000);
    assert.equal(changes[1]?.before?.plan, 'pro');
    for (const change of changes) {
      assert.ok(change.customer_audit_id);
      assert.equal(change.actor_type, 'platform_admin');
      assert.equal(change.action, 'subscription.plan_assigned');
    }
    const report = {
      checkedAt: new Date().toISOString(),
      environment: 'local disposable',
      checks: 16,
      subscription,
      changes,
    };
    await mkdir('.test-report/phase-one', { recursive: true });
    await writeFile(
      '.test-report/phase-one/subscription-browser-readback.json',
      JSON.stringify(report, null, 2) + '\n',
    );
    console.log(
      'Subscription browser readback: 16 assertions passed; original Pro restored, both changes correlated to customer audit.',
    );
  } finally {
    await sql.end();
  }
}
void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
