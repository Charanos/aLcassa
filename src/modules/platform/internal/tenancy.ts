import 'server-only';
import { and, count, eq, gt, isNull } from 'drizzle-orm';
import { auditLog, sessions, tenantMembers, tenants } from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { PlatformActor } from './subscriptions';

/**
 * 06 §8 · 09 §2. SUSPENSION AND REACTIVATION.
 *
 * ⚠ SUSPENSION IS READ-ONLY ACCESS, NOT A LOCKOUT. CONFIRMED 24 Aug 2026.
 *
 * `00_context.sql` carries the reasoning next to the function that enforces
 * it: "a suspended customer who can still see their configuration and their
 * team is a customer who can fix their billing problem, whereas one locked
 * out entirely opens a support ticket and Brian is the support team."
 *
 * ⚠ THIS FUNCTION DOES NOT ENFORCE ANYTHING. It writes one column.
 *
 * The enforcement is `app.tenant_is_writable()`, which every modify policy in
 * the database calls. That is the whole design: suspension is a POLICY rather
 * than a flag the application checks, so a handler that forgets to check it
 * still cannot write. What this does is set the value that policy reads —
 * which is why it is short, and why the comment is longer than the code.
 */

export type TenantStatus = 'active' | 'suspended' | 'closed';

/**
 * ⚠ THE TYPED SLUG IS CHECKED HERE, NOT ONLY IN THE DIALOG.
 *
 * Design sheet 05 asks for type-to-confirm on this action, and a confirmation
 * enforced only in the component is a confirmation that a direct call to the
 * Server Action skips entirely. The dialog and this function check the same
 * thing, and this one is the one that counts.
 */
export async function setTenantStatus(
  input: {
    tenantId: string;
    status: TenantStatus;
    /** The slug the operator typed, checked against the record. */
    confirmSlug: string;
    reason: string;
  },
  actor: PlatformActor,
): Promise<{ slug: string; from: TenantStatus; to: TenantStatus }> {
  if (input.reason.trim().length < 8) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message:
        'A reason is required. It lands in the customer’s own activity log, so write it for them.',
      details: [
        { field: 'reason', code: ERROR_CODES.VALIDATION_FAILED, message: 'Give a reason.' },
      ],
    });
  }

  const result = await asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action:
        input.status === 'active'
          ? AUDIT_ACTIONS.TENANT_REACTIVATED
          : AUDIT_ACTIONS.TENANT_SUSPENDED,
      targetTenantId: input.tenantId,
      entityType: 'tenant',
      entityId: input.tenantId,
      reason: input.reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      const [tenant] = await tx
        .select({ id: tenants.id, slug: tenants.slug, status: tenants.status })
        .from(tenants)
        .where(and(eq(tenants.id, input.tenantId), isNull(tenants.deletedAt)))
        .limit(1);

      if (!tenant) {
        throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, {
          message: 'That workspace does not exist.',
        });
      }

      // Compared against the RECORD, never against a slug the caller also
      // supplied — otherwise the confirmation is the operator agreeing with
      // themselves.
      if (input.confirmSlug.trim() !== tenant.slug) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message: `The typed slug does not match. Nothing was changed. Type "${tenant.slug}" exactly to confirm.`,
          details: [
            {
              field: 'confirmSlug',
              code: ERROR_CODES.VALIDATION_FAILED,
              message: 'Slug does not match.',
            },
          ],
        });
      }

      const from = tenant.status as TenantStatus;

      if (from === input.status) {
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message: `That workspace is already ${input.status}.`,
        });
      }

      await tx
        .update(tenants)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(tenants.id, tenant.id));

      /**
       * 09 §7. The customer's own log carries it.
       *
       * Suspension is the single most consequential thing the platform can do
       * to a workspace short of deleting it, and a customer discovering it
       * only because their writes started failing is a customer who cannot
       * tell an outage from a billing decision. The reason is theirs to read.
       */
      await tx.insert(auditLog).values({
        tenantId: tenant.id,
        actorUserId: actor.userId,
        actorType: 'platform_admin',
        actorLabel: actor.label,
        // Not a support session: this is the platform acting on the tenant as
        // a RECORD, from outside. `supportMode` means "we were inside your
        // workspace", and conflating the two would make that filter lie.
        supportMode: false,
        action:
          input.status === 'active'
            ? AUDIT_ACTIONS.TENANT_REACTIVATED
            : AUDIT_ACTIONS.TENANT_SUSPENDED,
        entityType: 'tenant',
        entityId: tenant.id,
        before: { status: from },
        after: { status: input.status, reason: input.reason },
        ipAddress: actor.ipAddress ?? null,
        requestId: actor.requestId,
      });

      return { slug: tenant.slug, from, to: input.status };
    },
  );

  return result;
}

/**
 * 09 §2. What a suspension would affect, computed before it is applied.
 *
 * Design sheet 05: a destructive confirmation "states its consequences in
 * people and workspaces rather than asking for confidence". Nobody can judge
 * "suspend this workspace?" without knowing how many people it locks out of
 * writing.
 */
export async function previewSuspension(
  tenantId: string,
  actor: PlatformActor,
): Promise<{ slug: string; name: string; status: string; activeMembers: number; openSupportSessions: number }> {
  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.TENANT_SUSPENDED,
      targetTenantId: tenantId,
      entityType: 'tenant',
      reason: 'suspension preview, no change written',
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      const [tenant] = await tx
        .select({ id: tenants.id, slug: tenants.slug, name: tenants.name, status: tenants.status })
        .from(tenants)
        .where(and(eq(tenants.id, tenantId), isNull(tenants.deletedAt)))
        .limit(1);

      if (!tenant) {
        throw new AppError(ERROR_CODES.TENANT_NOT_FOUND, {
          message: 'That workspace does not exist.',
        });
      }

      // Two counts rather than one query with subselects: the service role
      // bypasses RLS, so these are ordinary reads, and three short statements
      // are easier to check against what the dialog claims than one clever one.
      const [members] = await tx
        .select({ n: count() })
        .from(tenantMembers)
        .where(
          and(
            eq(tenantMembers.tenantId, tenant.id),
            eq(tenantMembers.status, 'active'),
            isNull(tenantMembers.deletedAt),
          ),
        );

      const [open] = await tx
        .select({ n: count() })
        .from(sessions)
        .where(
          and(
            eq(sessions.tenantId, tenant.id),
            eq(sessions.kind, 'support'),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, new Date()),
          ),
        );

      return {
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        activeMembers: members?.n ?? 0,
        openSupportSessions: open?.n ?? 0,
      };
    },
  );
}
