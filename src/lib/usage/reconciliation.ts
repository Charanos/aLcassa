import { randomUUID } from 'node:crypto';
import type { Sql, TransactionSql } from 'postgres';

/** Phase One counts retained resources, not requests or Phase Two conversations. */
export const RECONCILED_COUNTERS = ['seats', 'api_keys', 'ai_rules_versions'] as const;
export type UsageRow = {
  tenantId: string;
  tenant: string;
  key: (typeof RECONCILED_COUNTERS)[number];
  stored: number;
  actual: number;
};
export type UsageReport = { checked: number; drift: UsageRow[] };

/** One statement gives all counters and sources the same database snapshot. */
async function inspect(tx: TransactionSql, tenantId: string | null): Promise<UsageReport> {
  const rows = await tx<UsageRow[]>`
    select t.id as "tenantId", t.slug as tenant, source.key,
      coalesce(u.current_value, 0)::int as stored, source.actual::int
    from public.tenants t
    cross join lateral (values
      ('seats',
        (select count(*) from public.tenant_members m where m.tenant_id=t.id
          and m.status='active' and m.deleted_at is null)
        + (select count(*) from public.invitations i where i.tenant_id=t.id
          and i.accepted_at is null and i.revoked_at is null)),
      ('api_keys', (select count(*) from public.api_credentials c where c.tenant_id=t.id
        and c.status='active' and c.revoked_at is null and c.deleted_at is null)),
      ('ai_rules_versions', (select count(*) from public.tenant_ai_rule_versions v
        where v.tenant_id=t.id and v.status='published'))
    ) source(key,actual)
    left join public.usage_counters u on u.tenant_id=t.id and u.key=source.key
    where t.deleted_at is null and (${tenantId}::uuid is null or t.id=${tenantId}::uuid)
    order by t.id,source.key`;
  return { checked: rows.length, drift: rows.filter((row) => row.stored !== row.actual) };
}

export async function inspectUsage(sql: Sql, tenantId: string | null = null): Promise<UsageReport> {
  await assertMaintenanceConnection(sql);
  return sql.begin('isolation level repeatable read read only', (tx) => inspect(tx, tenantId));
}

/** Empty policy-filtered reads must never masquerade as a successful maintenance report. */
export async function assertMaintenanceConnection(sql: Sql): Promise<void> {
  const [role] = await sql<{ permitted: boolean }[]>`
    select rolsuper or rolbypassrls as permitted from pg_roles where rolname=current_user`;
  if (!role?.permitted)
    throw new Error('Usage maintenance requires the administrative connection.');
}

/** Recount under the writers' locks; never apply values from an earlier report. */
export async function repairUsage(
  sql: Sql,
  input: { actorId: string; reason: string; tenantId?: string },
): Promise<UsageReport & { repaired: number; requestId: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(input.actorId) || !input.reason.trim() || input.reason.length > 500)
    throw new Error('Repair requires a platform administrator and a concise reason.');
  await assertMaintenanceConnection(sql);
  return sql.begin(async (tx) => {
    const [admin] = await tx<{ display_name: string }[]>`
      select display_name from public.platform_admins
      where user_id=${input.actorId}::uuid and deleted_at is null for share`;
    if (!admin) throw new Error('Repair requires an active platform administrator.');
    const tenants = await tx<{ id: string }[]>`
      select id from public.tenants where deleted_at is null
      and (${input.tenantId ?? null}::uuid is null or id=${input.tenantId ?? null}::uuid)
      order by id`;
    for (const tenant of tenants) {
      for (const domain of ['membership', 'credentials', 'rules'])
        await tx`select pg_advisory_xact_lock(hashtextextended(${`${domain}:${tenant.id}`},0))`;
      await tx`select id from public.usage_counters where tenant_id=${tenant.id} for update`;
    }
    const report: UsageReport = { checked: 0, drift: [] };
    for (const tenant of tenants) {
      const current = await inspect(tx, tenant.id);
      report.checked += current.checked;
      report.drift.push(...current.drift);
    }
    const requestId = `reconcile-${randomUUID()}`;
    for (const row of report.drift) {
      await tx`insert into public.platform_audit_log
        (actor_user_id,actor_label,action,target_tenant_id,entity_type,
         used_service_role,reason,request_id,before,after)
        values (${input.actorId},${`${admin.display_name} · usage reconciliation`},
          'usage.reconciled',${row.tenantId},${`usage_counter:${row.key}`},true,
          ${input.reason.trim()},${requestId},
          ${tx.json({ key: row.key, currentValue: row.stored })},
          ${tx.json({ key: row.key, currentValue: row.actual })})`;
      await tx`insert into public.usage_counters
        (tenant_id,key,current_value,peak_value,last_recalculated_at)
        values (${row.tenantId},${row.key},${row.actual},${row.actual},now())
        on conflict (tenant_id,key) do update set current_value=excluded.current_value,
          peak_value=greatest(usage_counters.peak_value,excluded.current_value),
          last_recalculated_at=now(),updated_at=now()`;
    }
    return { ...report, repaired: report.drift.length, requestId };
  });
}
