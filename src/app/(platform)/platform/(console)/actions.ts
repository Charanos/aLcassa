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
} from '@/modules/platform';
import {
  getProvisionOptions,
  getWorkspaceDetail,
  getWorkspaces,
  type ProvisionModel,
  type WorkspaceDetail,
} from '@/lib/console/data';
import { getLiveWorkspaceDetail, getLiveWorkspaces } from '@/lib/console/liveWorkspaces';
import { getLivePlans } from '@/lib/console/live';
import { withoutTenantContext } from '@/lib/db';
import { sql, eq, and } from 'drizzle-orm';
import { platformAuditLog } from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { supportReference } from '@/lib/console/references';

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

/*
 * ⚠ `setNavState` AND `setDensity` LIVED HERE AND HAD NO CALLERS.
 *
 * Both wrote exactly the cookies `POST /api/console/prefs` already writes,
 * and that Route Handler is the one the shell actually uses — deliberately,
 * because a Server Action forces an RSC re-render after it settles and these
 * are cosmetic preferences with nothing to re-render for. `setNavState` was
 * passed to `ConsoleShell` as `onNavStateChange`, which never invoked it;
 * `setDensity` was never referenced at all, and there is still no UI control
 * anywhere that changes density.
 *
 * They are deleted rather than left for later because an exported function in
 * a `'use server'` file is not dead code in the ordinary sense — Next.js
 * assigns it an action id and it is POST-able by anyone who finds that id,
 * whether or not the application ever calls it. Unused surface with no caller
 * to audit is worse than no surface. The Route Handler covers density too,
 * for whenever a control is built.
 */

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
  const [designed, live, livePlans] = await Promise.all([
    getProvisionOptions(),
    getLiveWorkspaces(),
    getLivePlans(),
  ]);
  const workspaces = live ?? (await getWorkspaces());

  /**
   * ⚠ THE PLAN LIST CAME FROM A HARDCODED FIXTURE AND WAS THREE PLANS OUT OF
   *   DATE. This is the bug behind "provisioning does not work".
   *
   * `getProvisionOptions` offered `starter`, `growth`, `scale` and `custom` at
   * KES 46k/92k/184k. The product's plans are `pro`, `business` and `custom` —
   * confirmed 24 Aug 2026, recorded in the schema comment on `plans.code`, and
   * what the seed, `portfolio.ts` and every other console screen have used
   * since. Three of the four choices named plans that have never existed, the
   * default selection was one of them, and the prices beside them were wrong
   * for the two that remained.
   *
   * Reading the catalogue here is the same "live first, designed fixture
   * second" pattern every other reader on this surface already uses. The
   * fixture stays as the fallback for the review bypass, where there is no
   * session to resolve — and it has been corrected to the real codes, because a
   * fallback that lies is how this drifted in the first place.
   */
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

/* ── Workspace suspension ─────────────────────────────────────────────────── */

export type SuspensionImpact = {
  slug: string;
  name: string;
  status: string;
  activeMembers: number;
  openSupportSessions: number;
};

export type FetchSuspensionImpactResult =
  { ok: true; impact: SuspensionImpact } | { ok: false; error: string };

/**
 * What suspending this workspace would cost, read at the moment the dialog
 * opens.
 *
 * ⚠ `previewSuspension` WAS AN AUDITED SERVICE WITH NO CALLER, AND THE DIALOG
 *   IT WAS WRITTEN FOR WAS SHOWING NUMBERS FROM THE LAST PAGE RENDER.
 *
 * Two things were wrong with that, and the second is the one that matters.
 *
 * The staff count came down as a prop with the page, so a tab left open for
 * twenty minutes confirmed against a figure from twenty minutes ago. Design
 * sheet 05 asks the dialog to state consequences "in people"; people it
 * counted a while back is a weaker claim than it looks.
 *
 * The real gap is the second count. A support session open inside a workspace
 * means a colleague is IN THERE RIGHT NOW, and suspending underneath them
 * drops what they were doing without either party being told why. Nothing on
 * the old dialog could have said so — the number did not travel with the page,
 * and it is the one figure that changes minute to minute. This is the service
 * that computes it.
 *
 * It is a read that writes an audit row, deliberately: `asService` bypasses
 * RLS to count across a tenant boundary, and 09 §2 wants every such crossing
 * on the record even when it changed nothing. The service names itself
 * "suspension preview, no change written" for whoever reads that log later.
 */
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

  /**
   * ⚠ THE REFUSAL THIS USED TO GIVE IS NOW FALSE, AND A FALSE REASON IS WORSE
   *   THAN A BLUNT ONE. It said entitlement changes "are not wired until the
   *   entitlements table lands". `plan_entitlements` has been in the schema all
   *   along, and `modules/platform/internal/planCatalogue.ts` now writes to it.
   *
   * What is true is that THIS action cannot be the thing that does it. It
   * takes a plan code, a field name and a target as loose strings, because it
   * was built against the designed fixture's `pendingChange` shape — there is
   * no entitlement id in it, so there is no row it could address without
   * guessing. `setPlanLimit` takes the id, previews what the change would
   * strand, and requires a reason for the log.
   *
   * So this stays a refusal, and says where the working path is rather than
   * blaming a table that exists.
   */
  return {
    ok: false,
    error:
      'This confirmation belongs to the designed plan table. Edit a limit from the headroom card for that plan — it addresses the entitlement directly and counts what the change would strand first.',
  };
}

/* ── Break glass ───────────────────────────────────────────────────────────── */

export type ToggleBreakGlassResult =
  { ok: true; locked: boolean; revoked: number } | { ok: false; error: string };

/**
 * Lock or re-enable support-session access platform-wide.
 *
 * ⚠ THIS REFUSED FOR A PHASE, AND THE REASON IT GAVE WAS A DESIGN THAT NEVER
 *   NEEDED BUILDING. It said the real switch was `app.support_lock`, "read by
 *   `withTenantContext` next to `app.support_mode`" — a per-request check, in
 *   the hottest function in the system, for a control used perhaps twice a
 *   year.
 *
 * It is enforced where sessions are MINTED instead, and the lock itself has no
 * column: the most recent `support.lock_engaged` / `support.lock_released` row
 * in the platform audit log IS the state. `modules/platform/internal/breakGlass.ts`
 * has the full argument. No migration, no flag to drift, and the history —
 * which is the only thing anyone ever actually asks of a break-glass control —
 * comes free.
 */
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

/**
 * The current lock state, for the settings screen.
 *
 * Read through `withoutTenantContext` rather than `asService`: it is a read of
 * the platform's own log by a platform admin, and routing it through the
 * audited path would write a row every time somebody opened Settings.
 */
export async function fetchBreakGlassState(): Promise<BreakGlassState> {
  const ctx = await currentPlatformSession();
  return withoutTenantContext(ctx.requestId, (tx) => breakGlassState(tx));
}

/* ── Provisioning ─────────────────────────────────────────────────────────── */

export type ProvisionWorkspaceResult =
  { ok: true; slug: string } | { ok: false; error: string; field?: 'name' | 'slug' | 'ownerEmail' };

/**
 * Provision a workspace from the console's own dialog.
 *
 * ⚠ THE DIALOG WAS A `setTimeout`. That is the whole reason this exists.
 *
 * `ProvisionWorkspaceDialog.submit()` ran an 1800ms timer, flipped itself to
 * "done", raised a toast reading "<name> provisioned · invitation sent to the
 * owner", and navigated to the workspace list. No request was made and no rows
 * were written — while the panel beside the form promised five specific things
 * by name: an RLS-bound tenant row, snapshotted entitlements, an invited
 * owner, propagated master rules and a `tenant.provision` audit entry.
 *
 * A control that fakes a success is worse than one that does nothing visible,
 * because the operator leaves believing a customer can sign in. `provisionTenant`
 * has been sitting in `modules/platform` fully built the entire time — creating
 * tenant, settings, profile and owner membership in one transaction, and
 * deleting the auth user again if any of it fails. This connects the two.
 *
 * ⚠ THE RESULT NAMES A FIELD WHERE IT CAN. `slug_taken` and `owner_exists` are
 * both fixable by the operator in one edit, and a dialog that says only "that
 * did not go through" makes them guess which of four inputs to change.
 */
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
        /* The dialog collects four fields and an owner NAME is not one of
           them — 02 §3 has the owner set their own profile from the
           invitation. The address is the only thing known about them here, so
           it stands in until they arrive rather than inventing a display name
           the person never chose. */
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

/* ── Support session references ───────────────────────────────────────────── */

/**
 * The next support-session reference, so the operator does not invent one.
 *
 * ⚠ THE PLACEHOLDER WAS DOING THE WORK OF A FEATURE. The dialog's reason field
 * reads `Ticket 4829 · verifying a duplicated WhatsApp thread` in grey, which
 * tells an operator the house style and then leaves them to make up a number —
 * so the references in the audit log are whatever each person typed, and the
 * one column that should let somebody join a session to a support ticket is
 * unjoinable.
 *
 * ⚠ IT IS DERIVED FROM THE LOG RATHER THAN FROM A SEQUENCE TABLE. Every
 * support session already writes `support.entered` to `platform_audit_log`, and
 * that table is append-only, so counting it IS the sequence — the same
 * reasoning break glass uses for its lock. A `nextval()` would need a
 * migration and would then be a second source that can disagree with the log
 * about how many sessions there have been.
 *
 * ⚠ THE SHAPE IS THE CONSOLE'S, NOT THIS FILE'S. `TKT-260915-013` is the same
 * grammar as `INV-2609-2468` — kind, period, place in the period — and it is
 * built by `supportReference` in `lib/console/references.ts` so the two
 * numbers a client sees cannot drift into different shapes. See the note at
 * the head of that file for why it is a plain module rather than living here:
 * a `'use server'` file may export nothing but async functions.
 *
 * ⚠ THE COUNT IS OF TODAY'S SESSIONS, NOT OF EVERY SESSION EVER. It used to be
 * `count(*)` over the whole log, which meant the number after the date was a
 * lifetime total — `TKT-260915-482` on the first session of the day, and the
 * same 482 rolling into tomorrow's reference. The sequence is the position
 * within the period the reference names, or it is not a sequence.
 */
export async function nextSupportReference(): Promise<string> {
  try {
    const ctx = await currentPlatformSession();
    const n = await withoutTenantContext(ctx.requestId, async (tx) => {
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
    /* ⚠ A REFERENCE THAT CANNOT BE NUMBERED IS STILL A REFERENCE. The dialog
       renders it as fixed text, so returning nothing would leave the operator
       with a field that says the session is unjoinable — worse than a
       reference whose sequence position is provisional. Sequence 1 is the
       honest fallback: it says "the first of today" and the log, which carries
       its own ids, is what actually distinguishes two sessions. */
    logger.warn('support reference could not be numbered', { error });
    return supportReference(1);
  }
}
