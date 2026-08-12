'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  CONSOLE_DENSITY_COOKIE,
  CONSOLE_NAV_COOKIE,
  SUPPORT_SESSION_COOKIE,
  SUPPORT_SESSION_DURATION_MS,
  type Density,
  type NavState,
} from '@/lib/console/session';
import {
  getProvisionOptions,
  getWorkspaceDetail,
  getWorkspaces,
  type ProvisionModel,
  type WorkspaceDetail,
} from '@/lib/console/data';

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

  const expiresAt = new Date(Date.now() + SUPPORT_SESSION_DURATION_MS).toISOString();

  (await cookies()).set(
    SUPPORT_SESSION_COOKIE,
    JSON.stringify({
      id: crypto.randomUUID(),
      tenantId: input.tenantId,
      tenantName: input.tenantName,
      reason,
      expiresAt,
    }),
    {
      ...COOKIE_BASE,
      // The cookie dies with the grant. A stale cookie outliving its session
      // would render a banner for a session the database has already closed.
      maxAge: Math.floor(SUPPORT_SESSION_DURATION_MS / 1000),
    },
  );

  revalidatePath('/platform', 'layout');
  return { ok: true };
}

/**
 * End a support session.
 *
 * Deliberately takes no arguments and cannot fail. 09 §4 requires a one-click
 * exit that is always available, and an exit path with a failure mode is an
 * exit path that can trap someone inside a session they are trying to leave.
 */
export async function endSupportSession(): Promise<void> {
  (await cookies()).delete(SUPPORT_SESSION_COOKIE);
  revalidatePath('/platform', 'layout');
}

/**
 * Read model for a single workspace detail slide-over.
 */
export async function fetchWorkspaceDetail(slug: string): Promise<WorkspaceDetail | null> {
  return getWorkspaceDetail(slug);
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
  const [options, workspaces] = await Promise.all([getProvisionOptions(), getWorkspaces()]);
  return { options, existingSlugs: workspaces.map((w) => w.slug) };
}

/* ── Workspace suspension ─────────────────────────────────────────────────── */

export type SuspendWorkspaceResult = { ok: true } | { ok: false; error: string };

/**
 * Suspend (or reactivate) a workspace.
 *
 * ⚠ THIS VALIDATES EVERYTHING AND WRITES NOTHING, ON PURPOSE.
 *
 * Both dialogs that call this — `WorkspaceActions` and the drawer's inline
 * confirm — had a "Suspend workspace" button with no handler at all before
 * this action existed: `disabled={!armed}` and nothing behind it, in two
 * separate copies. That is worse than refusing, because it looks like it
 * might have worked.
 *
 * The actual write is `UPDATE tenants SET status = ...`, gated behind
 * `dbAsService` for the same reason `startSupportSession`'s audit insert is:
 * `src/lib/console/data.ts` is a read-model seam over fixtures, not a live
 * table, until M4. So this checks what it can check now — the workspace is
 * real, the slug on record matches the one the operator typed — and refuses
 * with the specific, named reason rather than reporting success for a write
 * that did not happen.
 */
// Server Actions must be async; there is nothing to await until the write below is real.
// eslint-disable-next-line @typescript-eslint/require-await
export async function suspendWorkspace(input: {
  tenantId: string;
  slug: string;
  confirmSlug: string;
}): Promise<SuspendWorkspaceResult> {
  const { tenantId, slug, confirmSlug } = input;

  if (!tenantId || !slug) {
    return { ok: false, error: 'Select a workspace to suspend.' };
  }

  if (confirmSlug.trim() !== slug) {
    return { ok: false, error: 'Typed slug does not match. Suspension was not sent.' };
  }

  return {
    ok: false,
    error:
      'Suspension writes to the tenant record and is not wired until the tenants table lands in M4. The request itself is valid — nothing else is blocking it.',
  };
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
export async function toggleBreakGlass(input: {
  lock: boolean;
}): Promise<ToggleBreakGlassResult> {
  return {
    ok: false,
    error: input.lock
      ? 'The platform-wide lock writes to app.support_lock, which withTenantContext does not read yet. Nothing is currently enforcing this — flipping a local flag would be worse than refusing.'
      : 'Re-enabling reads the same unwired flag. There is nothing active to release yet.',
  };
}

