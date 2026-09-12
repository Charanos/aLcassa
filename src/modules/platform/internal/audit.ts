import 'server-only';
import { platformAuditLog } from '@/db/schema';
import {
  registerPlatformAuditWriter,
  type ServiceRoleCall,
  type ServiceTransaction,
} from '@/lib/db/serviceClient';

/**
 * 05 §9 · 06 §7. The platform audit writer, registered into `serviceClient`.
 *
 * ⚠ WHY THIS IS INJECTED RATHER THAN IMPORTED. `serviceClient.ts` explains it:
 * `@/lib/audit` depends on the schema, and if `serviceClient` imported the
 * audit module directly the boundary rule would become circular — the module
 * that may only be imported by `modules/platform` would itself import a lib
 * that everything imports. Registration inverts that, and this module is the
 * one place allowed to perform it.
 *
 * ⚠ `usedServiceRole` IS HARDCODED TRUE, AND MUST STAY THAT WAY. Every row
 * this writer produces came through `asService`, which is by definition an
 * RLS bypass. Making it a parameter would invite a caller to pass `false` for
 * a call that did bypass, and the one filter an auditor actually runs —
 * "show me every time RLS was bypassed" — would quietly stop being true.
 */
async function writePlatformAudit(tx: ServiceTransaction, call: ServiceRoleCall): Promise<void> {
  await tx.insert(platformAuditLog).values({
    actorUserId: call.actorUserId,
    actorLabel: call.actorLabel,
    action: call.action,
    targetTenantId: call.targetTenantId ?? null,
    entityType: call.entityType ?? null,
    entityId: call.entityId ?? null,
    usedServiceRole: true,
    reason: call.reason ?? null,
    ipAddress: call.ipAddress ?? null,
    requestId: call.requestId,
  });
}

/**
 * Called once, from this module's `index.ts`, at import time. `asService`
 * throws if it is reached before this has run — a service-role call without
 * an audit row is not permitted, and the failure is loud rather than a
 * silently unaudited bypass.
 */
export function installPlatformAuditWriter(): void {
  registerPlatformAuditWriter(writePlatformAudit);
}

/**
 * A platform action that did NOT bypass Row Level Security.
 *
 * ⚠ WHY THIS EXISTS BESIDE THE WRITER ABOVE, RATHER THAN REUSING IT.
 *
 * The writer above is reached only through `asService` and hardcodes
 * `usedServiceRole: true`, deliberately, so that the one query an auditor
 * actually runs — "show me every time we bypassed RLS" — cannot be made to
 * lie by a caller passing the wrong flag.
 *
 * An export is the other case: it reads through `withoutTenantContext` as the
 * signed-in admin, with every policy applying. It is still a platform action
 * that belongs in the trail — an operator taking the full workspace roster off
 * the platform is exactly the event a security review asks about — but
 * recording it as a service-role call would put a false positive into that
 * filter, and a filter with false positives gets ignored.
 *
 * So: same table, same shape, `usedServiceRole: false`, and this is the only
 * other function permitted to insert into it.
 */
export async function recordPlatformAction(
  tx: ServiceTransaction,
  entry: {
    actorUserId: string;
    actorLabel: string;
    action: string;
    entityType?: string | null;
    entityId?: string | null;
    targetTenantId?: string | null;
    reason?: string | null;
    ipAddress?: string | null;
    requestId: string;
  },
): Promise<void> {
  await tx.insert(platformAuditLog).values({
    actorUserId: entry.actorUserId,
    actorLabel: entry.actorLabel,
    action: entry.action,
    targetTenantId: entry.targetTenantId ?? null,
    entityType: entry.entityType ?? null,
    entityId: entry.entityId ?? null,
    usedServiceRole: false,
    reason: entry.reason ?? null,
    ipAddress: entry.ipAddress ?? null,
    requestId: entry.requestId,
  });
}
