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
