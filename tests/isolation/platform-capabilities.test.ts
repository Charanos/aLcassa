import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { adminQuery, cleanup, closeHarness } from './harness';
import { SEED_TENANT_A } from '../../src/db/seed/constants';
/* Through the module's public entry, as the application does: `index.ts`
   installs the platform audit writer at import time, and `asService` refuses
   to run without one ("a service-role call without an audit row is not
   permitted"). Importing the internal files alone made every call fail for
   that reason instead of the one under test. */
import {
  publishMasterRules,
  setTenantStatus,
  startSupportSession,
} from '../../src/modules/platform';
import { AppError, ERROR_CODES } from '../../src/lib/errors';

/**
 * Platform capabilities are ENFORCED, not displayed.
 *
 * ⚠ UNTIL DOC 23, `platform_admins.can_suspend_tenants`, `can_edit_master_rules`
 *   and `can_enter_support_mode` were read by nothing in the platform module.
 *   An operator with all three false could suspend a workspace, publish master
 *   rules and open a support session, while the Admins page drew a capability
 *   matrix as though these were permissions.
 *
 * Each case uses an operator holding NONE of the three, and asserts two things:
 * the call is refused with PLATFORM_CAPABILITY_MISSING, and the refusal wrote
 * nothing — not the change, and not an audit row claiming the change. That
 * second half is the one that matters in a dispute: `asService` writes its
 * audit row first, so a check placed anywhere but inside its transaction
 * would leave "tenant.suspended" in the ledger for a suspension that never
 * happened.
 */

const operatorId = randomUUID();
const actor = {
  userId: operatorId,
  label: 'Capability probe <probe@example.invalid>',
  requestId: randomUUID(),
  ipAddress: null,
};

async function auditRowsBy(userId: string): Promise<number> {
  const [row] = await adminQuery<{ n: number }[]>`
    select count(*)::int as n from platform_audit_log where actor_user_id = ${userId}`;
  return row?.n ?? 0;
}

async function expectRefused(call: Promise<unknown>) {
  const error = await call.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, 'the call succeeded for an operator without the capability').toBeInstanceOf(
    AppError,
  );
  expect((error as AppError).code).toBe(ERROR_CODES.PLATFORM_CAPABILITY_MISSING);
}

beforeAll(async () => {
  await adminQuery`
    insert into user_profiles (id, full_name, email)
    values (${operatorId}, 'Capability probe', ${`probe-${operatorId.slice(0, 8)}@example.invalid`})
    on conflict do nothing`;
  await adminQuery`
    insert into platform_admins
      (user_id, display_name, can_suspend_tenants, can_edit_master_rules, can_enter_support_mode)
    values (${operatorId}, 'Capability probe', false, false, false)`;
});

afterAll(async () => {
  await cleanup`delete from platform_admins where user_id = ${operatorId}`;
  await cleanup`delete from user_profiles where id = ${operatorId}`;
  await closeHarness();
});

describe('platform capabilities · an operator holding none', () => {
  it('cannot suspend a workspace, and the refusal writes nothing', async () => {
    const [before] = await adminQuery<{ status: string; slug: string }[]>`
      select status, slug from tenants where id = ${SEED_TENANT_A}`;

    /* A request that is valid in every other respect — the right slug typed
       back, a real reason — so the capability is the only thing that can
       refuse it. */
    await expectRefused(
      setTenantStatus(
        {
          tenantId: SEED_TENANT_A,
          status: 'suspended',
          confirmSlug: before?.slug ?? '',
          reason: 'capability probe — must be refused',
        },
        actor,
      ),
    );

    const [after] = await adminQuery<{ status: string }[]>`
      select status from tenants where id = ${SEED_TENANT_A}`;
    expect(after?.status).toBe(before?.status);
    expect(await auditRowsBy(operatorId)).toBe(0);
  });

  it('cannot publish the master AI rules', async () => {
    await expectRefused(
      publishMasterRules(
        {
          fields: {
            tone: 'Warm and direct.',
            responseGuidelines: 'Answer the question asked.',
            businessInformation: '',
            escalationInstructions: 'Hand billing disputes to a person.',
            prohibitedTopics: '',
            customInstructions: '',
          },
          changeNote: 'capability probe — must be refused',
          lockedFields: [],
        },
        actor,
      ),
    );
    expect(await auditRowsBy(operatorId)).toBe(0);
  });

  it('cannot open a support session', async () => {
    await expectRefused(
      startSupportSession(
        { tenantId: SEED_TENANT_A, reason: 'capability probe — must be refused' },
        actor,
      ),
    );
    expect(await auditRowsBy(operatorId)).toBe(0);
  });
});
