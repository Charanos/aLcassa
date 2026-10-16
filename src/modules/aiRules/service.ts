import 'server-only';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import type { z } from 'zod';
import {
  masterAiRules,
  masterAiRuleVersions,
  tenantAiRules,
  tenantAiRuleVersions,
  tenants,
  subscriptions,
  planEntitlements,
  subscriptionOverrides,
  usageCounters,
  userProfiles,
  type RulesDocument,
} from '@/db/schema';
import { withTenantContext, type ResolvedContext, type Transaction } from '@/lib/db';
import { AUDIT_ACTIONS, writeAudit } from '@/lib/audit';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { invalidateEntitlements } from '@/modules/entitlements';
import { publication, restoration } from './contracts';
import type { fields, revision } from './contracts';

export type RulesFields = z.infer<typeof fields>;
export type RulesRevision = z.infer<typeof revision>;
export type TenantRulesState = Awaited<ReturnType<typeof readTenantRules>>;

function writer(ctx: ResolvedContext) {
  if (!['owner', 'admin', 'support'].includes(ctx.role) || ctx.actorType === 'service')
    throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);
}
function document(value: RulesFields): RulesDocument {
  const result: RulesDocument = {};
  for (const key of Object.keys(value) as (keyof RulesFields)[]) {
    if (key === 'prohibitedTopics') {
      const topics = [
        ...new Set(
          value[key]
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
        ),
      ];
      if (topics.length) result[key] = topics;
    } else if (value[key].trim()) result[key] = value[key].trim();
  }
  return result;
}
async function master(tx: Transaction) {
  const query = tx
    .select({
      id: masterAiRules.id,
      updatedAt: masterAiRules.updatedAt,
      versionId: masterAiRuleVersions.id,
      content: masterAiRuleVersions.content,
      lockedFields: masterAiRuleVersions.lockedFields,
      versionNumber: masterAiRuleVersions.versionNumber,
    })
    .from(masterAiRules)
    .innerJoin(masterAiRuleVersions, eq(masterAiRules.currentVersionId, masterAiRuleVersions.id))
    .where(eq(masterAiRuleVersions.status, 'published'))
    .limit(1);
  const [value] = await query;
  if (!value)
    throw new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE, {
      message:
        'Published platform instructions are unavailable. Try again once they have been restored.',
    });
  return value;
}
async function allowance(tx: Transaction) {
  const [subscription] = await tx.select().from(subscriptions).limit(1);
  if (!subscription || !['active', 'trialing'].includes(subscription.status))
    throw new AppError(ERROR_CODES.SUBSCRIPTION_NOT_ACTIVE);
  const [plan] = await tx
    .select()
    .from(planEntitlements)
    .where(
      and(
        eq(planEntitlements.planId, subscription.planId),
        eq(planEntitlements.key, 'ai_rules_versions'),
      ),
    );
  const [override] = await tx
    .select()
    .from(subscriptionOverrides)
    .where(
      and(
        eq(subscriptionOverrides.key, 'ai_rules_versions'),
        sql`(${subscriptionOverrides.expiresAt} is null or ${subscriptionOverrides.expiresAt} > now())`,
      ),
    );
  if (!override && (!plan || plan.kind !== 'limit'))
    throw new AppError(ERROR_CODES.ENTITLEMENT_FEATURE_UNAVAILABLE);
  const limit = override ? override.limitValue : plan!.limitValue;
  if (limit !== null && limit < 1) throw new AppError(ERROR_CODES.ENTITLEMENT_FEATURE_UNAVAILABLE);
  return limit;
}
async function startWrite(tx: Transaction, ctx: ResolvedContext, expected: RulesRevision) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`rules:${ctx.tenantId}`},0))`,
  );
  const [tenant] = await tx
    .select({ status: tenants.status })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId));
  if (!tenant) throw new AppError(ERROR_CODES.TENANT_NOT_FOUND);
  if (!['active', 'trial'].includes(tenant.status))
    throw new AppError(ERROR_CODES.TENANT_SUSPENDED);
  // Shared transaction lock coordinates with platform writes without master UPDATE access.
  await tx.execute(sql`select pg_advisory_xact_lock_shared(hashtextextended('master-rules',0))`);
  const platform = await master(tx);
  const [root] = await tx.select().from(tenantAiRules).limit(1).for('update');
  if (
    (root?.currentVersionId ?? null) !== expected.currentVersionId ||
    (root?.updatedAt.toISOString() ?? null) !== expected.updatedAt ||
    platform.versionId !== expected.masterVersionId ||
    platform.updatedAt.toISOString() !== expected.masterUpdatedAt
  )
    throw new AppError(ERROR_CODES.RULES_VERSION_CONFLICT);
  return { root, platform, limit: await allowance(tx) };
}
async function retain(
  tx: Transaction,
  ctx: ResolvedContext,
  currentId: string,
  limit: number | null,
) {
  const published = await tx
    .select({ id: tenantAiRuleVersions.id })
    .from(tenantAiRuleVersions)
    .where(
      and(eq(tenantAiRuleVersions.status, 'published'), ne(tenantAiRuleVersions.id, currentId)),
    )
    .orderBy(desc(tenantAiRuleVersions.versionNumber));
  const expired = limit === null ? [] : published.slice(limit - 1).map((row) => row.id);
  if (expired.length)
    await tx
      .update(tenantAiRuleVersions)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(inArray(tenantAiRuleVersions.id, expired));
  const retained = published.length + 1 - expired.length;
  await tx
    .insert(usageCounters)
    .values({
      tenantId: ctx.tenantId,
      key: 'ai_rules_versions',
      currentValue: retained,
      peakValue: retained,
    })
    .onConflictDoUpdate({
      target: [usageCounters.tenantId, usageCounters.key],
      set: {
        currentValue: retained,
        peakValue: sql`greatest(${usageCounters.peakValue},${retained})`,
        updatedAt: new Date(),
      },
    });
  return retained;
}
export async function readTenantRules(ctx: ResolvedContext) {
  return withTenantContext(
    ctx,
    async (tx) => {
      const [tenant] = await tx
        .select({ status: tenants.status })
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId));
      if (!tenant) throw new AppError(ERROR_CODES.TENANT_NOT_FOUND);
      const platform = await master(tx);
      const [root] = await tx.select().from(tenantAiRules).limit(1);
      const versions = await tx
        .select()
        .from(tenantAiRuleVersions)
        .where(inArray(tenantAiRuleVersions.status, ['published', 'archived']))
        .orderBy(desc(tenantAiRuleVersions.versionNumber));
      const current = versions.find(
        (row) => row.id === root?.currentVersionId && row.status === 'published',
      );
      if (root?.currentVersionId && !current) throw new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE);
      const ids = [...new Set(versions.map((version) => version.authoredBy))];
      const authors = ids.length
        ? await tx
            .select({ id: userProfiles.id, name: userProfiles.fullName })
            .from(userProfiles)
            .where(inArray(userProfiles.id, ids))
        : [];
      return {
        master: platform,
        tenantStatus: tenant.status,
        current: current ?? null,
        versions,
        authors: Object.fromEntries(authors.map((author) => [author.id, author.name])),
        revision: {
          currentVersionId: root?.currentVersionId ?? null,
          updatedAt: root?.updatedAt.toISOString() ?? null,
          masterVersionId: platform.versionId,
          masterUpdatedAt: platform.updatedAt.toISOString(),
        } satisfies RulesRevision,
      };
    },
    { isolationLevel: 'repeatable read', readOnly: true },
  );
}
export async function publishTenantRules(ctx: ResolvedContext, input: unknown) {
  writer(ctx);
  const parsed = publication.safeParse(input);
  if (!parsed.success)
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Complete all instruction fields and add a change note of 8–500 characters.',
    });
  const value = parsed.data;
  const result = await withTenantContext(ctx, async (tx) => {
    const { root, platform, limit } = await startWrite(tx, ctx, value.revision);
    const [prior] = root?.currentVersionId
      ? await tx
          .select()
          .from(tenantAiRuleVersions)
          .where(eq(tenantAiRuleVersions.id, root.currentVersionId))
      : [];
    const content = document(value.fields);
    for (const key of platform.lockedFields as (keyof RulesDocument)[])
      if (JSON.stringify(content[key] ?? null) !== JSON.stringify(prior?.content[key] ?? null))
        throw new AppError(ERROR_CODES.RULES_FIELD_LOCKED);
    if (
      (Object.keys(value.fields) as (keyof RulesDocument)[]).every(
        (key) =>
          JSON.stringify(content[key] ?? null) === JSON.stringify(prior?.content[key] ?? null),
      )
    )
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        message: 'Change at least one instruction before publishing.',
      });
    const [latest] = await tx
      .select({ number: sql<number>`coalesce(max(${tenantAiRuleVersions.versionNumber}),0)::int` })
      .from(tenantAiRuleVersions);
    const [version] = await tx
      .insert(tenantAiRuleVersions)
      .values({
        tenantId: ctx.tenantId,
        versionNumber: (latest?.number ?? 0) + 1,
        status: 'published',
        content,
        changeNote: value.changeNote,
        authoredBy: ctx.actorId,
        publishedAt: new Date(),
      })
      .returning();
    if (!version) throw new AppError(ERROR_CODES.INTERNAL);
    if (root)
      await tx
        .update(tenantAiRules)
        .set({
          currentVersionId: version.id,
          updatedAt: sql`greatest(now(),${tenantAiRules.updatedAt} + interval '1 millisecond')`,
        })
        .where(eq(tenantAiRules.id, root.id));
    else
      await tx
        .insert(tenantAiRules)
        .values({ tenantId: ctx.tenantId, currentVersionId: version.id });
    const retained = await retain(tx, ctx, version.id, limit);
    await writeAudit(tx, ctx, {
      action: AUDIT_ACTIONS.RULES_PUBLISHED,
      entityType: 'tenant_ai_rules',
      entityId: version.id,
      before: { versionId: prior?.id ?? null, versionNumber: prior?.versionNumber ?? 0 },
      after: {
        versionId: version.id,
        versionNumber: version.versionNumber,
        changeNote: value.changeNote,
        retained,
      },
    });
    return { versionId: version.id, versionNumber: version.versionNumber };
  });
  await invalidateEntitlements(ctx.tenantId);
  return result;
}
export async function restoreTenantRules(ctx: ResolvedContext, input: unknown) {
  writer(ctx);
  const parsed = restoration.safeParse(input);
  if (!parsed.success) throw new AppError(ERROR_CODES.VALIDATION_FAILED);
  const value = parsed.data;
  const result = await withTenantContext(ctx, async (tx) => {
    const { root, limit } = await startWrite(tx, ctx, value.revision);
    const [target] = await tx
      .select()
      .from(tenantAiRuleVersions)
      .where(eq(tenantAiRuleVersions.id, value.versionId));
    if (!root || !target) throw new AppError(ERROR_CODES.NOT_FOUND);
    const [prior] = root.currentVersionId
      ? await tx
          .select({ number: tenantAiRuleVersions.versionNumber })
          .from(tenantAiRuleVersions)
          .where(eq(tenantAiRuleVersions.id, root.currentVersionId))
      : [];
    if (root.currentVersionId && !prior) throw new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE);
    if (target.status === 'draft' || target.id === root.currentVersionId)
      throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
        message: 'Choose a different previously published version.',
      });
    if (target.status === 'archived')
      await tx
        .update(tenantAiRuleVersions)
        .set({ status: 'published', updatedAt: new Date() })
        .where(eq(tenantAiRuleVersions.id, target.id));
    await tx
      .update(tenantAiRules)
      .set({
        currentVersionId: target.id,
        updatedAt: sql`greatest(now(),${tenantAiRules.updatedAt} + interval '1 millisecond')`,
      })
      .where(eq(tenantAiRules.id, root.id));
    const retained = await retain(tx, ctx, target.id, limit);
    await writeAudit(tx, ctx, {
      action: AUDIT_ACTIONS.RULES_ROLLED_BACK,
      entityType: 'tenant_ai_rules',
      entityId: target.id,
      before: { versionId: root.currentVersionId, versionNumber: prior?.number ?? 0 },
      after: {
        versionId: target.id,
        versionNumber: target.versionNumber,
        changeNote: value.changeNote,
        retained,
      },
    });
    return { versionId: target.id, versionNumber: target.versionNumber };
  });
  await invalidateEntitlements(ctx.tenantId);
  return result;
}
