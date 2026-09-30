import 'server-only';
import { and, eq, isNull } from 'drizzle-orm';
import { platformAdmins } from '@/db/schema';
import type { ServiceTransaction } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';

/**
 * What a platform operator may do, checked where it is done.
 *
 * ⚠ THE THREE CAPABILITY COLUMNS WERE DECORATIVE. `platform_admins` carries
 *   `can_suspend_tenants`, `can_edit_master_rules` and `can_enter_support_mode`,
 *   and until 30 Sep 2026 nothing in the platform module read any of them.
 *
 * An operator with all three `false` could suspend a workspace, publish master
 * rules and open a support session exactly as the owner could. The only reader
 * was a display label in the console chrome. Meanwhile the Admins page drew a
 * capability matrix — the page's whole claim — as though these were
 * permissions. A matrix of unenforced permissions is worse than none: it is
 * the thing a security review reads, and it was describing a control that did
 * not exist. Doc 23.
 *
 * ⚠ CHECKED INSIDE THE SERVICE TRANSACTION, FIRST. `asService` writes its audit
 * row and runs the operation in one transaction, so a refusal thrown here rolls
 * both back — the ledger never records an action that was refused, and never
 * records a refusal as the action.
 *
 * ⚠ READ FRESH ON EVERY CALL, NOT CARRIED IN THE SESSION. Revoking a capability
 * has to take effect on the next request, not when the operator next signs in.
 * One indexed lookup on a table of a handful of rows is the right price.
 */

export type Capability = 'manage_workspaces' | 'edit_master_rules' | 'enter_support_mode';

/**
 * Capability → the column that holds it, and the words a refusal uses.
 *
 * ⚠ `manage_workspaces` READS `can_suspend_tenants`. The schema has one
 * workspace-authority column and it is named for its most consequential use.
 * Provisioning, suspension, reactivation, plan assignment, overrides and plan
 * limits all change what a customer can do, and the Admins page has always
 * grouped them under that one grant. Splitting them needs a migration; until
 * then they share the column, and this is the one place that says so.
 */
const COLUMN = {
  manage_workspaces: platformAdmins.canSuspendTenants,
  edit_master_rules: platformAdmins.canEditMasterRules,
  enter_support_mode: platformAdmins.canEnterSupportMode,
} as const;

export const CAPABILITY_LABEL: Record<Capability, string> = {
  manage_workspaces: 'manage workspaces — provision, suspend, re-plan',
  edit_master_rules: 'edit the master AI rules',
  enter_support_mode: 'open support sessions',
};

export async function requireCapability(
  tx: ServiceTransaction,
  actorUserId: string,
  capability: Capability,
): Promise<void> {
  const [row] = await tx
    .select({ allowed: COLUMN[capability] })
    .from(platformAdmins)
    .where(and(eq(platformAdmins.userId, actorUserId), isNull(platformAdmins.deletedAt)))
    .limit(1);

  if (!row) {
    throw new AppError(ERROR_CODES.PLATFORM_CAPABILITY_MISSING, {
      message: 'This account is not a platform operator.',
      internal: { actorUserId, capability },
    });
  }
  if (!row.allowed) {
    throw new AppError(ERROR_CODES.PLATFORM_CAPABILITY_MISSING, {
      message: `Your operator account cannot ${CAPABILITY_LABEL[capability]}. It is granted on your operator record; ask the platform owner.`,
      internal: { actorUserId, capability },
    });
  }
}
