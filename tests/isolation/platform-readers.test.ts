import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { adminQuery, cleanup, closeHarness } from './harness';
import { SEED_PLATFORM_ADMIN } from '@/db/seed/constants';
import {
  getLiveAuditEntries,
  getLiveWorkspaceDetail,
  getLiveWorkspaces,
} from '@/lib/console/liveWorkspaces';
import { getLiveOverviewInsights } from '@/lib/console/liveOverview';
import { getLiveRevenue } from '@/lib/console/liveRevenue';
import { getLivePlans, getLiveMasterRules } from '@/lib/console/live';

vi.mock('@/lib/auth/resolve', () => ({
  currentPlatformSessionOrNull: vi.fn(() =>
    Promise.resolve({
      actorId: '00000000-0000-4000-8000-00000000ad01',
      actorLabel: 'Platform reader verification',
      requestId: 'platform-reader-verification',
    }),
  ),
}));

const tenantId = randomUUID();
const otherId = randomUUID();
const planId = randomUUID();
const slug = `reader-${tenantId}`;
let created = false;
let originalRuleVersion: string | null = null;
const ruleVersionId = randomUUID();
const ruleFixtureNote = `reader-${randomUUID()}`;

beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL_ADMIN!);
  if (url.hostname !== '127.0.0.1' || url.port !== '55422' || process.env.CACHE_DISABLED !== 'true')
    throw new Error('Platform reader verification requires the disposable local stack.');
  await adminQuery`insert into tenants (id, slug, name, status) values
    (${tenantId}, ${slug}, 'Reader workspace', 'active'),
    (${otherId}, ${`reader-${otherId}`}, 'Unrelated workspace', 'active')`;
  created = true;
  const [ruleRoot] = await adminQuery<
    { current_version_id: string | null }[]
  >`select current_version_id from master_ai_rules where singleton = true`;
  originalRuleVersion = ruleRoot?.current_version_id ?? null;
  const [ruleNumber] = await adminQuery<
    { next: number }[]
  >`select coalesce(max(version_number), 0) + 1 as next from master_ai_rule_versions`;
  await adminQuery`insert into master_ai_rule_versions (id, version_number, status, content, locked_fields, authored_by, change_note, published_at)
    values (${ruleVersionId}, ${ruleNumber!.next}, 'published', ${JSON.stringify({ tone: 'Historical verification guidance' })}::jsonb, '["tone"]'::jsonb, ${SEED_PLATFORM_ADMIN}, ${ruleFixtureNote}, now())`;
  await adminQuery`insert into master_ai_rule_versions (version_number, status, content, authored_by, change_note)
    select ${ruleNumber!.next} + n, 'draft', '{}'::jsonb, ${SEED_PLATFORM_ADMIN}, ${ruleFixtureNote} from generate_series(1, 21) n`;
  await adminQuery`update master_ai_rules set current_version_id = ${ruleVersionId} where singleton = true`;
  await adminQuery`insert into plans (id, code, name, price_amount) values (${planId}, ${`reader-${planId}`}, 'Reader plan', 1700)`;
  await adminQuery`insert into plan_entitlements (plan_id, key, kind, limit_value, display_name) values
    (${planId}, 'seats', 'limit', null, 'Staff seats'),
    (${planId}, 'api_keys', 'limit', 0, 'API credentials')`;
  await adminQuery`insert into subscriptions (tenant_id, plan_id, status, current_period_start, current_period_end)
    values (${tenantId}, ${planId}, 'active', now(), now() + interval '30 days')`;
  // Newer events in another workspace must not consume this workspace's page cap.
  await adminQuery`insert into platform_audit_log (actor_user_id, actor_label, action, target_tenant_id, request_id, occurred_at)
    values (${SEED_PLATFORM_ADMIN}, 'Verifier', 'tenant.provisioned', ${tenantId}, ${`target-${tenantId}`}, now() - interval '2 hours')`;
  await adminQuery`insert into platform_audit_log (actor_user_id, actor_label, action, target_tenant_id, request_id)
    select ${SEED_PLATFORM_ADMIN}, 'Verifier', 'tenant.provisioned', ${otherId}, 'other-reader-' || n from generate_series(1, 2005) n`;
});

afterAll(async () => {
  if (created) {
    await cleanup`update master_ai_rules set current_version_id = ${originalRuleVersion} where singleton = true and (current_version_id = ${ruleVersionId} or current_version_id is null)`;
    await cleanup`delete from master_ai_rule_versions where change_note = ${ruleFixtureNote}`;
    await cleanup`delete from platform_audit_log where target_tenant_id in (${tenantId}, ${otherId})`;
    await cleanup`delete from subscriptions where tenant_id = ${tenantId}`;
    await cleanup`delete from plan_entitlements where plan_id = ${planId}`;
    await cleanup`delete from plans where id = ${planId}`;
    await cleanup`delete from tenants where id in (${tenantId}, ${otherId})`;
  }
  await closeHarness();
});

describe('live platform page readers', () => {
  it('reads the selected historical master version beyond the recent history cap and its actual locks', async () => {
    const doc = await getLiveMasterRules();
    expect(doc?.fields.find((field) => field.key === 'tone')).toMatchObject({
      value: 'Historical verification guidance',
      locked: true,
    });
    expect(doc?.fields.find((field) => field.key === 'prohibitedTopics')?.locked).toBe(false);
    expect(doc?.versions.find((version) => version.current)?.id).toBe(ruleVersionId);
  });
  it('does not substitute a draft when no master version is selected', async () => {
    await adminQuery`update master_ai_rules set current_version_id = null where singleton = true`;
    try {
      expect(await getLiveMasterRules()).toBeNull();
    } finally {
      await adminQuery`update master_ai_rules set current_version_id = ${ruleVersionId} where singleton = true`;
    }
  });
  it('reads the plan catalogue with the operator identity required by its policies', async () => {
    const catalogue = await getLivePlans();
    expect(catalogue?.plans.find((plan) => plan.key === `reader-${planId}`)?.name).toBe(
      'Reader plan',
    );
    expect(catalogue?.plans.find((plan) => plan.key === `reader-${planId}`)?.count).toBe(1);
    const planIndex = catalogue!.plans.findIndex((plan) => plan.key === `reader-${planId}`);
    expect(catalogue?.rows.find((row) => row.icon === 'key')?.values[planIndex]).toBe('0');
    expect(catalogue?.rows.find((row) => row.icon === 'seat')?.values[planIndex]).toBe('∞');
  });
  it('reads the actual workspace and distinguishes unlimited from a zero allowance', async () => {
    const workspace = await getLiveWorkspaceDetail(slug);
    expect(workspace?.id).toBe(tenantId);
    expect(workspace?.name).toBe('Reader workspace');
    expect(workspace?.plan).toBe('Reader plan');
    expect(workspace?.meters.find((meter) => meter.icon === 'seat')?.limit).toBeNull();
    expect(workspace?.meters.find((meter) => meter.icon === 'key')?.limit).toBe(0);
    expect(workspace?.invoices).toEqual([]);
  });

  it('returns no workspace for a missing slug instead of substituting an example', async () => {
    expect(await getLiveWorkspaceDetail(`missing-${tenantId}`)).toBeNull();
  });

  it('filters workspace activity before applying the global reader cap', async () => {
    const entries = await getLiveAuditEntries(tenantId);
    expect(entries).toHaveLength(1);
    expect(entries?.[0]?.requestId).toBe(`target-${tenantId}`);
    expect(entries?.[0]?.tenantId).toBe(tenantId);
  });

  it('reconciles overview totals with the live directory and subscription-value reader', async () => {
    const [insights, rows, revenue] = await Promise.all([
      getLiveOverviewInsights(),
      getLiveWorkspaces(),
      getLiveRevenue(),
    ]);
    expect(insights?.source).toBe('live');
    expect(insights?.portfolio.statusMix.reduce((sum, status) => sum + status.count, 0)).toBe(
      rows?.length,
    );
    expect(insights?.revenue).toEqual(revenue);
    expect(insights?.portfolio.events).toBeNull();
    expect(insights?.operations.latency).toEqual([]);
    expect(insights?.operations.queues).toEqual([]);
  });
});
