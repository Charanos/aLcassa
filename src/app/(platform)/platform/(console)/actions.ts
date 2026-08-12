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
import { getWorkspaceDetail, type WorkspaceDetail } from '@/lib/console/data';

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

