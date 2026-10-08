import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { hash } from '@node-rs/argon2';
import { and, desc, eq, getTableColumns, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  apiCredentials,
  PHASE_1_SCOPES,
  planEntitlements,
  subscriptions,
  subscriptionOverrides,
  tenants,
  usageCounters,
} from '@/db/schema';
import { AUDIT_ACTIONS, writeAudit } from '@/lib/audit';
import { withTenantContext, type ResolvedContext, type Transaction } from '@/lib/db';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { invalidateEntitlements } from '@/modules/entitlements';

const { keyHash: privateHash, ...metadata } = getTableColumns(apiCredentials);
void privateHash;
type StoredMetadata = Omit<typeof apiCredentials.$inferSelect, 'keyHash'>;
export type CredentialMetadata = Omit<StoredMetadata, 'deletedAt' | 'lastUsedIp'>;
export type CredentialCreated = {
  credential: CredentialMetadata;
  secret?: string;
  replayed: boolean;
};

const creation = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Give this credential a name.')
      .max(100)
      .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'Use a single-line name.'),
    scopes: z
      .array(z.enum(['ai_rules:read', 'tenant:read']))
      .min(1)
      .max(PHASE_1_SCOPES.length)
      .transform((values) => [...new Set(values)].sort()),
    environment: z.enum(['live', 'test']).default('live'),
    requestKey: z.string().uuid('Use a new request reference for this credential.'),
    rotateFromId: z.string().uuid().optional(),
  })
  .strict();

function owner(ctx: ResolvedContext) {
  if (ctx.supportMode || ctx.role === 'support')
    throw new AppError(ERROR_CODES.SUPPORT_WRITE_DENIED);
  if (ctx.role !== 'owner' || ctx.actorType !== 'user')
    throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);
}

function publicMetadata(row: StoredMetadata): CredentialMetadata {
  const { deletedAt, lastUsedIp, ...view } = row;
  void deletedAt;
  void lastUsedIp;
  return view;
}

/** A retry identifies the same operation without retaining a recoverable secret. */
function operationId(ctx: ResolvedContext, requestKey: string) {
  const hex = createHash('sha256')
    .update(JSON.stringify([ctx.tenantId, ctx.actorId, requestKey]))
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

async function lock(tx: Transaction, tenantId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${`credentials:${tenantId}`}, 0))`,
  );
}

async function writable(tx: Transaction, ctx: ResolvedContext) {
  const [tenant] = await tx
    .select({ status: tenants.status })
    .from(tenants)
    .where(eq(tenants.id, ctx.tenantId));
  if (!tenant) throw new AppError(ERROR_CODES.TENANT_NOT_FOUND);
  if (!['active', 'trial'].includes(tenant.status))
    throw new AppError(ERROR_CODES.TENANT_SUSPENDED);
}

/** Rotating predecessors share their successor's slot during their bounded grace period. */
async function writeUsage(tx: Transaction, ctx: ResolvedContext) {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(apiCredentials)
    .where(
      and(
        eq(apiCredentials.status, 'active'),
        isNull(apiCredentials.deletedAt),
        isNull(apiCredentials.revokedAt),
      ),
    );
  const current = row?.count ?? 0;
  await tx
    .insert(usageCounters)
    .values({ tenantId: ctx.tenantId, key: 'api_keys', currentValue: current, peakValue: current })
    .onConflictDoUpdate({
      target: [usageCounters.tenantId, usageCounters.key],
      set: {
        currentValue: current,
        peakValue: sql`greatest(${usageCounters.peakValue}, ${current})`,
        updatedAt: new Date(),
      },
    });
  return current;
}

export async function listCredentials(ctx: ResolvedContext): Promise<CredentialMetadata[]> {
  owner(ctx);
  return withTenantContext(ctx, async (tx) =>
    (
      await tx
        .select(metadata)
        .from(apiCredentials)
        .where(isNull(apiCredentials.deletedAt))
        .orderBy(desc(apiCredentials.createdAt), apiCredentials.id)
    ).map(publicMetadata),
  );
}

export async function createCredential(
  ctx: ResolvedContext,
  input: unknown,
): Promise<CredentialCreated> {
  owner(ctx);
  const parsed = creation.safeParse(input);
  if (!parsed.success)
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, { message: parsed.error.issues[0]?.message });
  const value = parsed.data;
  const id = operationId(ctx, value.requestKey);
  // Hash before holding the transaction lock; plaintext stays in this invocation only.
  const keyPrefix = `csk_${value.environment}_${randomBytes(8).toString('hex')}`;
  const secret = `${keyPrefix}_${randomBytes(32).toString('base64url')}`;
  const keyHash = await hash(secret, {
    algorithm: 2, // Argon2id; the package enum is ambient under isolatedModules.
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  const result = await withTenantContext(ctx, async (tx) => {
    await lock(tx, ctx.tenantId);
    await writable(tx, ctx);
    const [prior] = await tx.select(metadata).from(apiCredentials).where(eq(apiCredentials.id, id));
    if (prior) {
      if (
        prior.name !== value.name ||
        prior.environment !== value.environment ||
        JSON.stringify(prior.scopes) !== JSON.stringify(value.scopes) ||
        prior.rotatedFromId !== (value.rotateFromId ?? null)
      ) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message:
            'This request reference was already used for different credential settings. Start a new request.',
        });
      }
      return { credential: publicMetadata(prior), replayed: true };
    }
    // These counter locks also coordinate with the console's reviewed plan changes.
    await tx
      .insert(usageCounters)
      .values({ tenantId: ctx.tenantId, key: 'api_keys', currentValue: 0, peakValue: 0 })
      .onConflictDoNothing();
    await tx
      .select({ id: usageCounters.id })
      .from(usageCounters)
      .where(eq(usageCounters.key, 'api_keys'))
      .for('update');
    const [subscription] = await tx
      .select({ planId: subscriptions.planId, status: subscriptions.status })
      .from(subscriptions);
    if (!subscription || !['trialing', 'active'].includes(subscription.status))
      throw new AppError(ERROR_CODES.SUBSCRIPTION_NOT_ACTIVE);
    const [allowance] = await tx
      .select()
      .from(planEntitlements)
      .where(
        and(eq(planEntitlements.planId, subscription.planId), eq(planEntitlements.key, 'api_keys')),
      );
    const [override] = await tx
      .select()
      .from(subscriptionOverrides)
      .where(
        and(
          eq(subscriptionOverrides.key, 'api_keys'),
          sql`(${subscriptionOverrides.expiresAt} is null or ${subscriptionOverrides.expiresAt} > now())`,
        ),
      );
    if (!override && (!allowance || allowance.kind !== 'limit'))
      throw new AppError(ERROR_CODES.ENTITLEMENT_FEATURE_UNAVAILABLE);
    const limit = override ? override.limitValue : allowance!.limitValue;
    let predecessor: StoredMetadata | undefined;
    if (value.rotateFromId) {
      [predecessor] = await tx
        .select(metadata)
        .from(apiCredentials)
        .where(and(eq(apiCredentials.id, value.rotateFromId), isNull(apiCredentials.deletedAt)))
        .for('update');
      if (!predecessor) throw new AppError(ERROR_CODES.CREDENTIAL_NOT_FOUND);
      if (predecessor.status !== 'active' || predecessor.revokedAt)
        throw new AppError(ERROR_CODES.CREDENTIAL_REVOKED);
      if (predecessor.rotatedFromId) {
        const [grace] = await tx
          .select({ id: apiCredentials.id })
          .from(apiCredentials)
          .where(
            and(
              eq(apiCredentials.id, predecessor.rotatedFromId),
              eq(apiCredentials.status, 'rotating'),
              sql`${apiCredentials.expiresAt} > now()`,
              isNull(apiCredentials.revokedAt),
            ),
          );
        if (grace)
          throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
            message:
              'Revoke the previous key or wait for its grace period to end before replacing this key again.',
          });
      }
      if (
        predecessor.environment !== value.environment ||
        JSON.stringify([...predecessor.scopes].sort()) !== JSON.stringify(value.scopes)
      ) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message: 'A replacement must keep the existing environment and permissions.',
        });
      }
    }
    const [count] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(apiCredentials)
      .where(
        and(
          eq(apiCredentials.status, 'active'),
          isNull(apiCredentials.deletedAt),
          isNull(apiCredentials.revokedAt),
        ),
      );
    if (!predecessor && limit !== null && (count?.count ?? 0) >= limit)
      throw new AppError(ERROR_CODES.CREDENTIAL_LIMIT_REACHED);
    const [created] = await tx
      .insert(apiCredentials)
      .values({
        id,
        tenantId: ctx.tenantId,
        name: value.name,
        scopes: value.scopes,
        environment: value.environment,
        keyPrefix,
        keyHash,
        createdBy: ctx.actorId,
        rotatedFromId: predecessor?.id,
      })
      .returning(metadata);
    if (!created) throw new AppError(ERROR_CODES.INTERNAL);
    if (predecessor) {
      const [grace] = await tx
        .update(apiCredentials)
        .set({
          status: 'rotating',
          expiresAt: sql`now() + interval '24 hours'`,
          updatedAt: new Date(),
        })
        .where(eq(apiCredentials.id, predecessor.id))
        .returning({ expiresAt: apiCredentials.expiresAt });
      await writeAudit(tx, ctx, {
        action: AUDIT_ACTIONS.CREDENTIAL_ROTATED,
        entityType: 'api_credential',
        entityId: predecessor.id,
        before: { status: predecessor.status },
        after: { status: 'rotating', successorId: id, expiresAt: grace!.expiresAt },
      });
    }
    await writeAudit(tx, ctx, {
      action: AUDIT_ACTIONS.CREDENTIAL_CREATED,
      entityType: 'api_credential',
      entityId: id,
      after: {
        name: created.name,
        scopes: created.scopes,
        environment: created.environment,
        status: created.status,
        rotatedFromId: created.rotatedFromId,
      },
    });
    await writeUsage(tx, ctx);
    return { credential: publicMetadata(created), secret, replayed: false };
  });
  await invalidateEntitlements(ctx.tenantId);
  return result;
}

export async function revokeCredential(
  ctx: ResolvedContext,
  id: unknown,
): Promise<{ revoked: boolean }> {
  owner(ctx);
  if (!z.string().uuid().safeParse(id).success) throw new AppError(ERROR_CODES.VALIDATION_FAILED);
  const credentialId = id as string;
  const result = await withTenantContext(ctx, async (tx) => {
    await lock(tx, ctx.tenantId);
    await writable(tx, ctx);
    const [prior] = await tx
      .select(metadata)
      .from(apiCredentials)
      .where(and(eq(apiCredentials.id, credentialId), isNull(apiCredentials.deletedAt)))
      .for('update');
    if (!prior) throw new AppError(ERROR_CODES.CREDENTIAL_NOT_FOUND);
    if (prior.status === 'revoked') return { revoked: false };
    await tx
      .update(apiCredentials)
      .set({
        status: 'revoked',
        revokedAt: sql`now()`,
        revokedBy: ctx.actorId,
        updatedAt: new Date(),
      })
      .where(eq(apiCredentials.id, credentialId));
    await writeAudit(tx, ctx, {
      action: AUDIT_ACTIONS.CREDENTIAL_REVOKED,
      entityType: 'api_credential',
      entityId: credentialId,
      before: { name: prior.name, status: prior.status },
      after: { name: prior.name, status: 'revoked' },
    });
    // Ending a successor also ends its predecessor's grace period.
    if (prior.rotatedFromId) {
      const [predecessor] = await tx
        .update(apiCredentials)
        .set({
          status: 'revoked',
          revokedAt: sql`now()`,
          revokedBy: ctx.actorId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(apiCredentials.id, prior.rotatedFromId),
            eq(apiCredentials.status, 'rotating'),
            isNull(apiCredentials.revokedAt),
          ),
        )
        .returning({ id: apiCredentials.id });
      if (predecessor)
        await writeAudit(tx, ctx, {
          action: AUDIT_ACTIONS.CREDENTIAL_REVOKED,
          entityType: 'api_credential',
          entityId: predecessor.id,
          before: { status: 'rotating' },
          after: { status: 'revoked', successorId: prior.id },
        });
    }
    await writeUsage(tx, ctx);
    return { revoked: true };
  });
  await invalidateEntitlements(ctx.tenantId);
  return result;
}
