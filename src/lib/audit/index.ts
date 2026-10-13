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
  TENANT_PROVISIONING_CHECKED: 'tenant.provisioning_checked',
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
  TENANT_SUSPENSION_PREVIEWED: 'tenant.suspension_previewed',
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
  /**
   * A ceiling on the plan CATALOGUE changed — not one workspace's entitlement,
   * but what every workspace on that plan is entitled to.
   *
   * ⚠ DISTINCT FROM `subscription.plan_assigned`, WHICH MOVES ONE CUSTOMER
   * BETWEEN PLANS. This moves the plan underneath all of them at once, so a
   * log conflating the two could not answer "why did forty workspaces get more
   * seats on Tuesday" — the likeliest question ever to be asked of this table.
   */
  PLAN_LIMIT_CHANGED: 'plan.limit_changed',
  SUBSCRIPTION_STATUS_CHANGED: 'subscription.status_changed',
  USAGE_RECONCILED: 'usage.reconciled',
  SUBSCRIPTION_OVERRIDE_GRANTED: 'subscription.override_granted',
  /** A Custom workspace's negotiated monthly price was set or changed. Doc 25 · R1. */
  SUBSCRIPTION_CONTRACT_SET: 'subscription.contract_set',

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
  /**
   * Doc 24 · Stage 2. The endings the customer's log never recorded: a visit
   * that ran to its thirty-minute cap, one the customer ended themselves, and
   * an attempt refused (by break glass or a missing capability) — the last in
   * the platform log only, since nothing happened to the customer's workspace.
   * How any visit ended is also on the session row, as `end_reason`.
   */
  SUPPORT_EXPIRED: 'support.expired',
  SUPPORT_ENDED_BY_CUSTOMER: 'support.ended_by_customer',
  SUPPORT_ENTRY_REFUSED: 'support.entry_refused',
  /**
   * Break glass: support access suspended platform-wide, and released again.
   *
   * ⚠ THESE TWO EVENTS ARE THE STATE. THERE IS NO `is_locked` COLUMN ANYWHERE,
   *   AND THAT IS THE DESIGN RATHER THAN A SHORTCUT.
   *
   * A boolean somewhere would answer "is it locked" and nothing else. The
   * questions actually asked of a break-glass control are "who locked it",
   * "when", "why", and "how long were we dark" — every one of which is a
   * question about HISTORY, and every one of which a flag answers by pointing
   * at an audit table that would have to be kept in step with it by hand.
   *
   * So the most recent of these two rows IS the lock. The state cannot drift
   * from its own record, because they are the same row; the history is
   * intrinsic rather than bolted on; and it needed no migration, which is why
   * a control that had been inert for a phase could be wired in an afternoon.
   *
   * The cost is a query, and it is charged in the right place: the check runs
   * when a support session is MINTED, not on every read, so it is once per
   * session rather than once per request.
   */
  SUPPORT_LOCK_ENGAGED: 'support.lock_engaged',
  SUPPORT_LOCK_RELEASED: 'support.lock_released',
  /**
   * Platform-wide settings saved from the console. Doc 23 · S0.2. The row
   * carries `before` and `after` holding only the fields that changed, so the
   * entry reads as the diff rather than as two copies of the form.
   */
  PLATFORM_SETTINGS_UPDATED: 'platform.settings_updated',
  /** A read of the session record. Audited because it is a service-role call,
   *  and distinct because it is not a visit. */
  SUPPORT_SESSION_READ: 'support.session_read',

  /**
   * ⚠ TWO MORE READS THAT WERE RECORDED AS CHANGES — THE SAME DEFECT AS
   *   SUPPORT_ENTERED ABOVE, IN TWO PLACES IT HAD NOT BEEN LOOKED FOR.
   *
   * The watchlist reads every tenant's usage, so it runs through `asService`,
   * which writes an audit row before every service-role call. It was given
   * `subscription.status_changed` because `asService` needs an action and
   * that one was nearby. Every console page load that showed the watchlist
   * therefore recorded a subscription status change that never happened,
   * flagged as a row-level-security bypass — 287 of the 297 platform entries
   * in the window when doc 23 counted them. `previewPlanChange` did the same
   * with `subscription.plan_assigned`: opening a preview wrote "plan
   * assigned" into the ledger.
   *
   * In a dispute, those rows are the log asserting changes nobody made. The
   * reads are still audited — every bypass is, 06 §7 — under verbs that say
   * what happened. Rows already written under the wrong verb are never
   * rewritten (the table is append-only); `describeEntry` in
   * `console/auditVocabulary.ts` recognises them and says so.
   */
  WATCHLIST_READ: 'watchlist.read',
  PLAN_CHANGE_PREVIEWED: 'subscription.plan_change_previewed',

  SESSION_REVOKED: 'session.revoked',
  /**
   * A credential changed by the person it belongs to, from a signed-in
   * session, having re-proved the old one.
   *
   * ⚠ DISTINCT FROM A RESET, WHICH IS NOT THE SAME EVENT. A reset is driven
   * from an email link by someone who could NOT produce the old password, and
   * it is the shape an account takeover has. A change is made by a session
   * that already re-authenticated. Recording both as one action makes the
   * question this log exists to answer — "was that recovery flow me?" —
   * unanswerable, so the two stay apart.
   */
  PASSWORD_CHANGED: 'password.changed',
  PASSWORD_RESET: 'password.reset',
  PASSWORD_SET: 'password.set',
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
