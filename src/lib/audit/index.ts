import 'server-only';
import { auditLog } from '@/db/schema';
import type { Transaction } from '@/lib/db';
import type { ResolvedContext } from '@/lib/db/context';
import { redact } from '@/lib/logger';

/**
 * 05 §9 · 11 §6 rule 5.
 *
 * Every write to a tenant-scoped table writes an audit row IN THE SAME
 * TRANSACTION as the operation. Never after it, never best-effort, never on a
 * queue. An audit trail that can be absent for a write that succeeded is not an
 * audit trail; it is a log with a marketing name.
 *
 * The table has a select policy and an insert policy and NO update or delete
 * policy, so append-only is enforced by the database rather than by convention.
 * There is no code path, including this one, that can amend history.
 */

/**
 * The action catalogue. Dotted `entity.verb`, past tense, because an audit row
 * records something that happened. Adding an action here is how a new module
 * joins the trail; inventing a string at a call site is how a trail becomes
 * unqueryable six months later.
 */
export const AUDIT_ACTIONS = {
  TENANT_PROVISIONED: 'tenant.provisioned',
  /**
   * A workspace the platform did not create. Distinct from
   * `tenant.provisioned` ON PURPOSE — the actor on that row is a platform
   * admin who chose to create it, and the actor on this one is the member of
   * the public who registered. Folding the two would make "how many
   * workspaces did we open ourselves this quarter" unanswerable, and would
   * put an unauthenticated caller's id in a column every other row reads as
   * "a platform admin did this".
   */
  TENANT_SELF_REGISTERED: 'tenant.self_registered',
  TENANT_SUSPENDED: 'tenant.suspended',
  TENANT_REACTIVATED: 'tenant.reactivated',
  TENANT_SETTINGS_UPDATED: 'tenant.settings_updated',
  TENANT_LOGO_UPLOADED: 'tenant.logo_uploaded',
  TENANT_OWNERSHIP_TRANSFERRED: 'tenant.ownership_transferred',

  PROFILE_UPDATED: 'profile.updated',

  MEMBER_INVITED: 'member.invited',
  MEMBER_JOINED: 'member.joined',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_REMOVED: 'member.removed',
  INVITATION_RESENT: 'invitation.resent',
  INVITATION_REVOKED: 'invitation.revoked',

  CREDENTIAL_CREATED: 'credential.created',
  CREDENTIAL_ROTATED: 'credential.rotated',
  CREDENTIAL_REVOKED: 'credential.revoked',

  RULES_DRAFTED: 'rules.drafted',
  RULES_PUBLISHED: 'rules.published',
  RULES_ROLLED_BACK: 'rules.rolled_back',

  SUBSCRIPTION_PLAN_ASSIGNED: 'subscription.plan_assigned',
  SUBSCRIPTION_STATUS_CHANGED: 'subscription.status_changed',
  SUBSCRIPTION_OVERRIDE_GRANTED: 'subscription.override_granted',

  SUPPORT_ENTERED: 'support.entered',
  SUPPORT_EXITED: 'support.exited',
  /**
   * ⚠ SPLIT OUT OF SUPPORT_ENTERED, BECAUSE ONE ACTION WAS DOING THREE JOBS.
   *
   * Entering, extending and merely READING a support session were all written
   * as `support.entered`. 09 §7 promises a tenant can see "every time the
   * platform entered their workspace" and gives them a filter to do it — and
   * that filter was over-counting, reporting one visit as three or four
   * because every console page load that resolved the session logged another
   * entry.
   *
   * A transparency feature that inflates the number is not more transparent.
   * It is less trustworthy, and the customer has no way to tell which entries
   * were real.
   */
  SUPPORT_EXTENDED: 'support.extended',
  /** A read of the session record. Audited because it is a service-role call,
   *  and distinct because it is not a visit. */
  SUPPORT_SESSION_READ: 'support.session_read',

  SESSION_REVOKED: 'session.revoked',
  AUDIT_EXPORTED: 'audit.exported',
  /**
   * A platform-level CSV leaving the product: the workspace roster, revenue,
   * or the audit log itself.
   *
   * ⚠ DISTINCT FROM `audit.exported`, WHICH NAMES ONLY THE LOG. The console's
   * one export route serves three resources, so reusing that action would
   * record a revenue export as an audit export and make "who took the roster"
   * unanswerable. The resource travels in `reason`.
   *
   * It is here rather than as a literal at the call site because that is the
   * rule this catalogue exists to enforce — and the export route had broken it.
   */
  PLATFORM_EXPORTED: 'platform.exported',

  /** 06 §9. The one table where READS are audited, not only writes. */
  CUSTOMER_RECORD_READ: 'customer_record.read',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditEntry = {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
};

/**
 * Writes the tenant audit row. The transaction passed in must be the one the
 * operation itself is running in; that is the whole point, and it is why this
 * takes a `tx` rather than opening its own.
 *
 * `actorLabel` is denormalised deliberately. An entry reading "user
 * 9f2a-… invited a member" after that user has been deleted is useless, and
 * joining to a soft-deleted row to recover a name is fragile. 05 §9.
 *
 * `before` and `after` are redacted on the way in. An audit row for a change to
 * a customer record must record that the change happened without restating the
 * personal data that the redaction rules kept out of the logs. 05 I-16.
 */
export async function writeAudit(
  tx: Transaction,
  ctx: ResolvedContext,
  entry: AuditEntry,
): Promise<void> {
  await tx.insert(auditLog).values({
    tenantId: ctx.tenantId,
    actorUserId: ctx.actorType === 'service' ? null : ctx.actorId,
    actorType: ctx.actorType,
    actorLabel: ctx.actorLabel,
    // 05 §9: this boolean is what lets a tenant filter their own log to every
    // time the platform looked into their workspace. 09 §7.
    supportMode: ctx.supportMode,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    before: entry.before === undefined ? null : redact(entry.before),
    after: entry.after === undefined ? null : redact(entry.after),
    ipAddress: ctx.ipAddress,
    requestId: ctx.requestId,
  });
}

/**
 * The pattern every mutating service follows: do the work and write the row
 * together, or do neither.
 *
 * Using this rather than two statements is what makes rule 5 mechanically
 * checkable, because a repository write that is not wrapped by an `audited`
 * call is visible to review and to the module test in 11 §4 condition 3.
 */
export async function audited<T>(
  tx: Transaction,
  ctx: ResolvedContext,
  entry: AuditEntry | ((result: T) => AuditEntry),
  operation: () => Promise<T>,
): Promise<T> {
  const result = await operation();
  const resolved = typeof entry === 'function' ? entry(result) : entry;
  await writeAudit(tx, ctx, resolved);
  return result;
}
