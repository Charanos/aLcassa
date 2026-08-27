'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  CONSOLE_DENSITY_COOKIE,
  CONSOLE_NAV_COOKIE,
  SUPPORT_SESSION_COOKIE,
  SUPPORT_SESSION_DURATION_MS,
  resolveSupportSessionId,
  type Density,
  type NavState,
} from '@/lib/console/session';
import { currentPlatformSession } from '@/lib/auth/resolve';
import { isAppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import {
  endSupportSession as revokeSupportSession,
  extendSupportSession,
  setTenantStatus,
  startSupportSession as mintSupportSession,
} from '@/modules/platform';
import {
  getProvisionOptions,
  getWorkspaceDetail,
  getWorkspaces,
  type ProvisionModel,
  type WorkspaceDetail,
} from '@/lib/console/data';
import { getLiveWorkspaceDetail, getLiveWorkspaces } from '@/lib/console/liveWorkspaces';

/**
 * Console server actions.
 *
 * Everything the console shell can change about itself lands here rather than
 * in a client handler, for one reason: each of these is a fact the SERVER has
 * to know before it renders. The nav width and the density decide the first
 * paint; the support session decides what the database will show.
 */

const COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

/* ── Chrome geometry ──────────────────────────────────────────────────────
 * These two are preferences, not permissions, so they are cheap: write the
 * cookie, let the next render read it. They are `httpOnly` anyway — nothing
 * client-side needs to read them, and a cookie the client cannot touch is one
 * fewer surface that can disagree with the server.
 */

export async function setNavState(nav: NavState): Promise<void> {
  (await cookies()).set(CONSOLE_NAV_COOKIE, nav, {
    ...COOKIE_BASE,
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function setDensity(density: Density): Promise<void> {
  (await cookies()).set(CONSOLE_DENSITY_COOKIE, density, {
    ...COOKIE_BASE,
    maxAge: 60 * 60 * 24 * 365,
  });
}

/* ── Support sessions ─────────────────────────────────────────────────────── */

export type StartSessionResult = { ok: true } | { ok: false; error: string };

/**
 * Open a scoped, read-only, expiring support session against one workspace.
 *
 * ⚠ THE REASON IS VALIDATED HERE AND NOT ONLY IN THE DIALOG.
 *
 * The design file checks `if (!s.reason.trim())` in the confirm handler, which
 * is the right check in the wrong place: a client-side guard on a field whose
 * whole purpose is to appear in someone else's audit log is a suggestion, not
 * a requirement. 09 §4 makes the reason the thing that keeps this feature
 * accountable — the customer reads it, and it is the only part of the record
 * a human wrote. So it is enforced on the server, where it cannot be skipped
 * by anyone who can open a devtools console.
 *
 * The minimum length is deliberate too. An empty check passes on `"."`, and a
 * reason of "." is worse than none: it satisfies the audit requirement on
 * paper while telling the customer nothing.
 *
 * ⚠ WHAT IS STILL MISSING, stated rather than hidden.
 *
 * Three writes belong in this function and cannot be written until M4 lands
 * the `support_sessions` table and the platform module:
 *
 *   1. INSERT the session row via `dbAsService` (platform record operation,
 *      the one legitimate service-role use).
 *   2. `writeAudit` into the CUSTOMER's log, in the SAME transaction, so the
 *      grant and its record cannot disagree.
 *   3. Verify the caller is actually a platform admin.
 *
 * Until those exist this sets the cookie only, and the cookie alone grants
 * nothing: `withTenantContext` reads `ctx.supportMode` off the resolved
 * server context, not off this cookie, so the banner can appear without the
 * database widening by a single row. That is the safe direction to be
 * incomplete in, and it is why this ships now rather than waiting.
 */
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

  /**
   * ⚠ THE ROW IS MINTED FIRST, AND THE COOKIE POINTS AT IT.
   *
   * This used to write the whole grant — tenant, reason, expiry — into the
   * cookie and never touch the database, because there was no row to write.
   * There is now. `startSupportSession` opens the session, writes the
   * platform audit entry and writes the CUSTOMER's audit entry, all in one
   * transaction; if any of it fails, nothing is set and the operator is told.
   */
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

/**
 * 09 §3. Extend a session that is about to lapse.
 *
 * "At two minutes remaining a warning appears with an extend action; extending
 * is a fresh confirmation, not a silent renewal." The confirmation is the
 * dialog's job; this is the write, and it is audited into the customer's log
 * so a renewed ceiling is as visible to them as the original entry was.
 */
export async function extendCurrentSupportSession(): Promise<StartSessionResult> {
  try {
    const sessionId = await resolveSupportSessionId();
    if (!sessionId) return { ok: false, error: 'There is no support session to extend.' };

    const ctx = await currentPlatformSession();
    const extended = await extendSupportSession(sessionId, {
      userId: ctx.actorId,
      label: ctx.actorLabel,
      requestId: ctx.requestId,
      ipAddress: ctx.ipAddress,
    });

    if (!extended) {
      return { ok: false, error: 'That session has already ended. Switch in again to continue.' };
    }

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

  /**
   * ⚠ THE COOKIE GOES LAST, AND THE ORDER MATTERS.
   *
   * Clearing it first loses the id, and with it any way to name the row that
   * must be revoked — leaving a live grant behind that the operator believes
   * they have ended. Same reasoning as sign-out, and the same consequence if
   * it were the other way round.
   *
   * Every failure is swallowed. 09 §4 wants a one-click exit that is always
   * available, and an exit with a failure mode is one that can trap somebody
   * inside a session they are trying to leave. The row expires on its own
   * timer regardless, so the residual risk is bounded at thirty minutes.
   */
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

/**
 * Read model for a single workspace detail slide-over.
 */
export async function fetchWorkspaceDetail(slug: string): Promise<WorkspaceDetail | null> {
  // Live first. The drawer is where an operator decides whether to suspend
  // somebody, so it is the last screen that should be showing designed data.
  return (await getLiveWorkspaceDetail(slug)) ?? (await getWorkspaceDetail(slug));
}

/**
 * Read model for the provision-workspace modal: the plan set and the real
 * slugs already in use, fetched on open rather than threaded down as props —
 * the modal is reachable from `?provision=1` on any console page, not only
 * `/platform/tenants`, so it has no single server-component parent to hand
 * it these.
 */
export async function fetchProvisionOptions(): Promise<{
  options: ProvisionModel;
  existingSlugs: string[];
}> {
  // The slug-uniqueness check must run against REAL slugs, or the modal
  // would accept a slug that already exists and fail at the insert.
  const [options, live] = await Promise.all([getProvisionOptions(), getLiveWorkspaces()]);
  const workspaces = live ?? (await getWorkspaces());
  return { options, existingSlugs: workspaces.map((w) => w.slug) };
}

/* ── Workspace suspension ─────────────────────────────────────────────────── */

export type SuspendWorkspaceResult = { ok: true } | { ok: false; error: string };

/**
 * 06 §8 · 09 §2. Suspend or reactivate a workspace.
 *
 * ⚠ SUSPENSION IS READ-ONLY ACCESS, NOT A LOCKOUT. A suspended customer who
 * can still see their configuration and their team can fix their billing
 * problem; one locked out entirely opens a support ticket, and Brian is the
 * support team. The behaviour is `app.tenant_is_writable()` in the database,
 * not a check here — this only sets the value that function reads.
 *
 * ⚠ THE TYPED SLUG IS CHECKED AGAINST THE RECORD, NOT AGAINST THE CALLER'S
 *   OWN `slug` ARGUMENT.
 *
 * This action previously compared `confirmSlug` with `slug`, both supplied by
 * the caller — which is the operator agreeing with themselves, and passes
 * trivially for a direct call to the Server Action. `setTenantStatus` loads
 * the workspace and compares against what is on record.
 */
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
    revalidatePath('/platform');
    return { ok: true };
  } catch (error) {
    if (isAppError(error)) return { ok: false, error: error.message };
    logger.error('workspace status change failed', { error });
    return { ok: false, error: 'That did not go through. The platform log has the detail.' };
  }
}

/* ── Plan / entitlement changes ───────────────────────────────────────────── */

export type ApplyPlanChangeResult = { ok: true } | { ok: false; error: string };

/**
 * Apply a pending plan entitlement change, immediately or at the next
 * billing period.
 *
 * Same shape as `suspendWorkspace` and the same reason: `getPlans()` in
 * `src/lib/console/data.ts` is a read-model seam, so there is no entitlement
 * row to write yet. Every button in `BlastRadiusDialog` called `setOpen(false)`
 * and nothing else before this existed — three ways to look like the change
 * saved without it ever having tried to.
 */
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

  return {
    ok: false,
    error:
      'Entitlement changes write to the plan record and are not wired until the entitlements table lands. The request itself is valid — nothing else is blocking it.',
  };
}

/* ── Break glass ───────────────────────────────────────────────────────────── */

export type ToggleBreakGlassResult = { ok: true } | { ok: false; error: string };

/**
 * Lock or re-enable support-session access platform-wide.
 *
 * The real switch is `app.support_lock`, read by `withTenantContext` next to
 * `app.support_mode` — a client boolean cannot decide this any more than the
 * session banner can, per `session.ts`. That check does not exist yet, so
 * this refuses honestly rather than flipping local state and calling it
 * locked while every session guard remains none the wiser.
 */
// Server Actions must be async; there is nothing to await until the write below is real.
// eslint-disable-next-line @typescript-eslint/require-await
export async function toggleBreakGlass(input: { lock: boolean }): Promise<ToggleBreakGlassResult> {
  return {
    ok: false,
    error: input.lock
      ? 'The platform-wide lock writes to app.support_lock, which withTenantContext does not read yet. Nothing is currently enforcing this — flipping a local flag would be worse than refusing.'
      : 'Re-enabling reads the same unwired flag. There is nothing active to release yet.',
  };
}
