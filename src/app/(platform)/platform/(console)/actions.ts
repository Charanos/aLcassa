'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  SUPPORT_SESSION_COOKIE,
  SUPPORT_SESSION_DURATION_MS,
  resolveSupportSessionId,
} from '@/lib/console/session';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  endSupportSession as revokeSupportSession,
  extendSupportSession,
  breakGlassState,
  previewSuspension,
  provisionTenant,
  setBreakGlass,
  type BreakGlassState,
  setTenantStatus,
  startSupportSession as mintSupportSession,
  type StartedSupportSession,
} from '@/modules/platform';
import { sendEmail, supportSessionEmail } from '@/modules/email';
import {
  getProvisionOptions,
  getWorkspaceDetail,
  getWorkspaces,
  type ProvisionModel,
  type WorkspaceDetail,
} from '@/lib/console/data';
import { getLiveWorkspaceDetail, getLiveWorkspaces } from '@/lib/console/liveWorkspaces';
import { getLivePlans } from '@/lib/console/live';
import { withActorContext } from '@/lib/db';
import { sql, eq, and } from 'drizzle-orm';
import { platformAuditLog } from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { supportReference } from '@/lib/console/references';

/** Resolve console mutations on the server, including support context and provisioning outcomes. */

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

/* Display preferences persist through the dedicated preferences route. */

/* Keep cosmetic preference writes in /api/console/prefs to avoid unnecessary Server Action refreshes. */

export type StartSessionResult = { ok: true } | { ok: false; error: string };

/** Open a scoped, expiring support visit; enforce its required reason on the server. */
export async function startSupportSession(input: {
  tenantId: string;
  tenantName: string;
  reason: string;
}): Promise<StartSessionResult> {
  const reason = input.reason.trim();

  if (reason.length < 8) {
    return {
      ok: false,
      error: 'A reason is required. The customer reads it, so write it for them.',
    };
  }

  if (!input.tenantId || !input.tenantName) {
    return { ok: false, error: 'Select a workspace to enter.' };
  }

  /** Commit the support grant and both audit trails before issuing its reference cookie. */
  try {
    const ctx = await currentPlatformSession();
    const session = await mintSupportSession(
      { tenantId: input.tenantId, reason },
      {
        userId: ctx.actorId,
        label: ctx.actorLabel,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      },
    );

    (await cookies()).set(SUPPORT_SESSION_COOKIE, session.id, {
      ...COOKIE_BASE,
      // The cookie dies with the grant. A stale cookie outliving its session
      // would render a banner for a session the database has already closed —
      // though the row is checked on every read regardless, so an early
      // expiry here is a tidiness measure rather than the control.
      maxAge: Math.floor(SUPPORT_SESSION_DURATION_MS / 1000),
    });

    /** Notify the customer after commit; a delivery failure is logged without undoing the support grant. */
    await notifyOwners(session, ctx.requestId);

    revalidatePath('/platform', 'layout');
    return { ok: true };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('support session could not be opened', { error });
    return {
      ok: false,
      error: 'The support session could not be opened. The platform log has the detail.',
    };
  }
}

/** Validate and audit support extension through the service; the dialog supplies an explicit confirmation. */
export async function extendCurrentSupportSession(): Promise<StartSessionResult> {
  try {
    const sessionId = await resolveSupportSessionId();
    if (!sessionId) return { ok: false, error: 'There is no support session to extend.' };

    const ctx = await currentPlatformSession();
    /* Refusals — outside the last five minutes, past the second extension,
       already over — arrive as AppErrors with the sentence to show. */
    await extendSupportSession(sessionId, {
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    (await cookies()).set(SUPPORT_SESSION_COOKIE, sessionId, {
      ...COOKIE_BASE,
      maxAge: Math.floor(SUPPORT_SESSION_DURATION_MS / 1000),
    });

    revalidatePath('/platform', 'layout');
    return { ok: true };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('support session could not be extended', { error });
    return { ok: false, error: 'The session could not be extended.' };
  }
}

/**
 * End a support session.
 *
 * Deliberately takes no arguments and cannot fail. 09 §4 requires a one-click
 * exit that is always available, and an exit path with a failure mode is an
 * exit path that can trap someone inside a session they are trying to leave.
 */
export async function endSupportSession(): Promise<void> {
  const sessionId = await resolveSupportSessionId();

  /** Attempt grant revocation before clearing the cookie; failures are logged and the grant still has a bounded expiry. */
  if (sessionId) {
    try {
      const ctx = await currentPlatformSession();
      await revokeSupportSession(sessionId, {
        userId: ctx.actorId,
        label: ctx.actorLabel,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      });
    } catch (error) {
      logger.error('support session row could not be revoked on exit', { sessionId, error });
    }
  }

  (await cookies()).delete(SUPPORT_SESSION_COOKIE);
  revalidatePath('/platform', 'layout');
}

export type EndSessionResult =
  { ok: true; ended: boolean; endReason?: 'operator' | 'colleague' } | { ok: false; error: string };

/**
 * End any open support session from the register — yours, or a colleague's.
 * Doc 24 · D5. A colleague's ending is recorded as such in both logs, naming
 * both people. If it is your own, the cookie goes too.
 */
export async function endSupportSessionById(sessionId: string): Promise<EndSessionResult> {
  try {
    const ctx = await currentPlatformSession();
    const result = await revokeSupportSession(sessionId, {
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    if ((await resolveSupportSessionId()) === sessionId) {
      (await cookies()).delete(SUPPORT_SESSION_COOKIE);
    }
    revalidatePath('/platform', 'layout');
    return result
      ? { ok: true, ended: true, endReason: result.endReason }
      : { ok: true, ended: false };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('support session could not be ended', { sessionId, error });
    return { ok: false, error: 'The session could not be ended. It still expires on its own.' };
  }
}

async function notifyOwners(session: StartedSupportSession, requestId: string): Promise<void> {
  if (session.notify.length === 0) return;
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, '') ?? 'http://localhost:3000';
  const template = supportSessionEmail({
    platformAdminName: session.platformAdminName,
    companyName: session.tenantName,
    reason: session.reason,
    activityUrl: `${base}/app/settings/audit`,
  });
  await Promise.all(
    session.notify.map((to) =>
      sendEmail({ to, template, requestId }).catch((error: unknown) => {
        logger.error('support session email could not be sent', { error, requestId });
      }),
    ),
  );
}

/**
 * Read model for a single workspace detail slide-over.
 */
export async function fetchWorkspaceDetail(slug: string): Promise<WorkspaceDetail | null> {
  // Live first. The drawer is where an operator decides whether to suspend
  // somebody, so it is the last screen that should be showing designed data.
  return (await getLiveWorkspaceDetail(slug)) ?? (await getWorkspaceDetail(slug));
}

/** Load active plans and occupied slugs when the shared provisioning dialog opens. */
export async function fetchProvisionOptions(): Promise<{
  options: ProvisionModel;
  existingSlugs: string[];
}> {
  // The slug-uniqueness check must run against REAL slugs, or the modal
  // would accept a slug that already exists and fail at the insert.
  const [designed, live, livePlans] = await Promise.all([
    getProvisionOptions(),
    getLiveWorkspaces(),
    getLivePlans(),
  ]);
  const workspaces = live ?? (await getWorkspaces());

  /** Use the stored plan catalogue and align entitlement values to its plan ordering. */
  const options: ProvisionModel = livePlans
    ? {
        ...designed,
        plans: livePlans.plans.map((plan, column) => ({
          key: plan.key,
          name: plan.name,
          price: plan.price,
          /* `EntitlementRow.values` is positionally aligned with `plans`, so
             column `i` is this plan's value for each row. The first two are
             the two a form field has room for. */
          limit:
            livePlans.rows
              .slice(0, 2)
              .map((r) => `${r.values[column] ?? '—'} ${r.label.toLowerCase()}`)
              .join(' · ') || 'Set overrides after',
        })),
      }
    : designed;

  return { options, existingSlugs: workspaces.map((w) => w.slug) };
}

export type SuspensionImpact = {
  slug: string;
  name: string;
  status: string;
  activeMembers: number;
  openSupportSessions: number;
};

export type FetchSuspensionImpactResult =
  { ok: true; impact: SuspensionImpact } | { ok: false; error: string };

/** Read current staff and support-visit consequences when the suspension dialog opens. */
export async function fetchSuspensionImpact(
  tenantId: string,
): Promise<FetchSuspensionImpactResult> {
  if (!tenantId) return { ok: false, error: 'Select a workspace.' };

  try {
    const ctx = await currentPlatformSession();
    const impact = await previewSuspension(tenantId, {
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });
    return { ok: true, impact };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('suspension preview failed', { error });
    return { ok: false, error: 'The impact figures could not be read.' };
  }
}

export type SuspendWorkspaceResult = { ok: true } | { ok: false; error: string };

/** Suspension makes tenant operations read-only; validate the typed slug against the stored record. */
export async function suspendWorkspace(input: {
  tenantId: string;
  slug: string;
  confirmSlug: string;
  reason: string;
  /** Omitted means suspend; 'active' reactivates. */
  status?: 'active' | 'suspended';
}): Promise<SuspendWorkspaceResult> {
  if (!input.tenantId) return { ok: false, error: 'Select a workspace.' };

  try {
    const ctx = await currentPlatformSession();
    await setTenantStatus(
      {
        tenantId: input.tenantId,
        status: input.status ?? 'suspended',
        confirmSlug: input.confirmSlug,
        reason: input.reason,
      },
      {
        userId: ctx.actorId,
        label: ctx.actorLabel,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      },
    );

    revalidatePath('/platform/tenants');
    revalidatePath('/platform/tenants/[id]', 'page');
    revalidatePath('/platform');
    return { ok: true };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('workspace status change failed', { error });
    return { ok: false, error: 'That did not go through. The platform log has the detail.' };
  }
}

export type ApplyPlanChangeResult = { ok: true } | { ok: false; error: string };

/** Legacy fixture-shaped entitlement actions refuse unsupported writes explicitly. */
// Server Actions must be async; there is nothing to await until the write below is real.
// eslint-disable-next-line @typescript-eslint/require-await
export async function applyPlanChange(input: {
  plan: string;
  field: string;
  to: string;
  when: 'now' | 'next_period';
}): Promise<ApplyPlanChangeResult> {
  if (!input.plan || !input.field || !input.to) {
    return { ok: false, error: 'Nothing to apply — the pending change is incomplete.' };
  }

  /** Use the entitlement-ID-based setPlanLimit flow for live changes; this legacy string-based payload cannot identify the target safely. */
  return {
    ok: false,
    error:
      'This confirmation belongs to the designed plan table. Edit a limit from the headroom card for that plan — it addresses the entitlement directly and counts what the change would strand first.',
  };
}

export type ToggleBreakGlassResult =
  { ok: true; locked: boolean; revoked: number } | { ok: false; error: string };

/** Support access state follows the latest lock event; enforce it when creating grants. */
export async function toggleBreakGlass(input: {
  lock: boolean;
  reason: string;
}): Promise<ToggleBreakGlassResult> {
  try {
    const ctx = await currentPlatformSession();
    const result = await setBreakGlass(input, {
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    // The banner, the settings screen and every support control read this.
    revalidatePath('/platform', 'layout');
    return { ok: true, locked: result.locked, revoked: result.revoked };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('break glass toggle failed', { error });
    return { ok: false, error: 'The lock did not move. Nothing changed.' };
  }
}

/** Read the latest support-lock event in operator context without producing a new audit event. */
export async function fetchBreakGlassState(): Promise<BreakGlassState> {
  const ctx = await currentPlatformSession();
  return withActorContext(ctx.actorId, ctx.requestId, (tx) => breakGlassState(tx));
}

export type ProvisionWorkspaceResult =
  { ok: true; slug: string } | { ok: false; error: string; field?: 'name' | 'slug' | 'ownerEmail' };

/** Provision through the audited platform service and report committed workspace and delivery outcomes separately. */
export async function provisionWorkspace(input: {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerName?: string;
  trial: boolean;
  /** `plans.code`. The dialog has always collected this and never sent it. */
  planCode: string;
}): Promise<ProvisionWorkspaceResult> {
  try {
    const ctx = await currentPlatformSession();

    const result = await provisionTenant(
      {
        name: input.name.trim(),
        slug: input.slug.trim(),
        ownerEmail: input.ownerEmail.trim(),
        /* Use the supplied email as the initial owner label until the invited person chooses a display name. */
        ownerName: input.ownerName?.trim() || input.ownerEmail.trim(),
        initialStatus: input.trial ? 'trial' : 'active',
        planCode: input.planCode,
      },
      {
        userId: ctx.actorId,
        label: ctx.actorLabel,
        requestId: ctx.requestId,
        ipAddress: ctx.ipAddress,
      },
    );

    if (!result.ok) {
      const field =
        result.code === 'slug_taken'
          ? ('slug' as const)
          : result.code === 'owner_exists'
            ? ('ownerEmail' as const)
            : undefined;
      return { ok: false, error: result.message, field };
    }

    /* Both surfaces that count workspaces. The overview's portfolio band and
       the workspace table would otherwise keep serving a cached page that
       does not contain the tenant the operator just watched being created. */
    revalidatePath('/platform/tenants');
    revalidatePath('/platform');

    return { ok: true, slug: result.slug };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('workspace provisioning failed', { error });
    return { ok: false, error: 'That did not go through. The platform log has the detail.' };
  }
}

/** Generate support references using the shared grammar and today's recorded visits; audit IDs remain the unique correlation key. */
export async function nextSupportReference(): Promise<string> {
  try {
    const ctx = await currentPlatformSession();
    /* As the operator: the count is of platform audit rows, which no context
       without an actor can see. It read zero, so every support reference was
       numbered as the first of its day. */
    const n = await withActorContext(ctx.actorId, ctx.requestId, async (tx) => {
      const [row] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(platformAuditLog)
        .where(
          and(
            eq(platformAuditLog.action, AUDIT_ACTIONS.SUPPORT_ENTERED),
            /* Midnight in Nairobi, not in UTC. A session opened at 01:00 EAT
               belongs to the day the operator is having. */
            sql`${platformAuditLog.occurredAt} >= date_trunc('day', now() at time zone 'Africa/Nairobi') at time zone 'Africa/Nairobi'`,
          ),
        );
      return row?.n ?? 0;
    });
    return supportReference(n + 1);
  } catch (error) {
    /* Return a provisional sequence when numbering is unavailable; audit IDs still distinguish visits. */
    logger.warn('support reference could not be numbered', { error });
    return supportReference(1);
  }
}
