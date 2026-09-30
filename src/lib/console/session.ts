import 'server-only';
import { cookies } from 'next/headers';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { readSupportSession } from '@/modules/platform';

/**
 * The support session, as the SERVER sees it.
 *
 * ⚠ THIS IS THE ONE PLACE THE DESIGN HAD TO CHANGE SHAPE TO BE REAL.
 *
 * `Console-Shell.dc.html` holds the session in component state and counts down
 * from `secondsLeft: 1800` on an interval. That is exactly right for a design
 * file and would be a security defect in production, for three reasons:
 *
 *   1. A REFRESH WOULD RESET THE CLOCK. Client state does not survive
 *      navigation, so a 30-minute grant becomes an unbounded one for anybody
 *      who presses F5. The expiry has to be an absolute instant issued by the
 *      server, not a duration held by the browser.
 *
 *   2. THE CLIENT DOES NOT DECIDE WHAT THE DATABASE SEES. Support mode is an
 *      RLS input — `app.support_mode` in `withTenantContext`, read by
 *      `app.is_support_session()` in half a dozen policies. A React boolean
 *      cannot be allowed anywhere near that decision; if it were, closing the
 *      banner would silently widen access.
 *
 *   3. IT IS AUDITED, AND THE AUDIT IS THE PRODUCT. 09 §4 requires the entry
 *      to land in the CUSTOMER's activity log with the operator's name and
 *      their stated reason. That write has to happen on the server, in the
 *      same transaction that opens the session, or the record and the grant
 *      can disagree.
 *
 * So the cookie below carries only an opaque id. The banner's countdown is
 * derived from the row's `expiresAt` on every tick, which means a refresh, a
 * slow tab, or a laptop resumed from sleep all resolve to the same remaining
 * time — and an expired session renders as expired rather than as "29:59"
 * until someone happens to reload.
 *
 * ⚠ THE ROW ARRIVED AT M4, AND THIS FILE CHANGED SHAPE AGAIN.
 *
 * The paragraph here used to say authority "would" rest with the row once M4
 * landed a `support_sessions` table, and that until then the cookie carried
 * the tenant, the reason and the expiry itself. Both are now out of date, and
 * in the safe direction:
 *
 *   - The table is `sessions` with `kind = 'support'`, not a table of its
 *     own — see `modules/platform/internal/support.ts` for why that is the
 *     entire ceiling argument rather than a schema convenience.
 *   - The cookie carries ONLY the row id. A cookie that carried the grant was
 *     a grant its holder could edit; a pointer resolves to nothing the
 *     instant the row is revoked.
 *
 * `resolveSupportSession` therefore returns the id for the caller to resolve
 * against the database. It deliberately does NOT hit the database itself:
 * this module is imported by client-adjacent console code, and the row read
 * is a service-role call that belongs behind the platform module's boundary.
 */

export const SUPPORT_SESSION_COOKIE = 'alcassa_support_session';

/**
 * 09 §3. Thirty minutes of inactivity.
 *
 * ⚠ RE-EXPORTED FROM THE MODULE THAT ISSUES THE GRANT, NOT DECLARED AGAIN.
 *
 * It was declared here as its own literal while the session was cookie-only.
 * Now that the row carries the expiry, two constants could disagree — and the
 * one that would win is the one nobody was looking at. The dialog copy, the
 * cookie lifetime and the server check all read this, and it has exactly one
 * definition.
 */
export { SUPPORT_SESSION_DURATION_MS } from '@/modules/platform';

/**
 * The support session id this request is carrying, if any.
 *
 * ⚠ IT RETURNS AN ID, NOT A SESSION, AND THE DIFFERENCE IS THE POINT.
 *
 * Everything a caller wants to know — which workspace, whose grant, how long
 * is left — comes from the row, resolved by `readSupportSession` in the
 * platform module. Returning a shaped object from here would invite a caller
 * to trust it, and a cookie is not a source of truth about its own validity.
 *
 * The uuid check is not validation of the grant. It only stops an obviously
 * malformed value reaching a uuid column and raising, which would turn a
 * tampered cookie into a 500 rather than a signed-out state.
 */
export async function resolveSupportSessionId(): Promise<string | null> {
  const raw = (await cookies()).get(SUPPORT_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw);
  return isUuid ? raw : null;
}

/**
 * What the console renders: the session as the DATABASE has it.
 *
 * ⚠ EVERY FIELD HERE COMES FROM THE ROW. The cookie contributes one thing —
 * which row to look at — and if the row is revoked, expired, or belongs to a
 * different operator, this is null however intact the cookie looks.
 *
 * The shape is unchanged from when this was cookie-derived, so the banner,
 * the shell and the session card did not need touching. What changed is that
 * it is now true.
 */
export type SupportSession = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  /** The operator's stated reason. The customer reads this. */
  reason: string;
  /** Absolute, ISO 8601. The client derives its countdown from this. */
  expiresAt: string;
  startedAt: string;
  platformAdminName: string;
  /** Extensions used so far. Doc 24 · D2 caps them at two. */
  extensions: number;
};

/**
 * Resolve the active support session, or null.
 *
 * Fails closed on every ambiguity, as before — but the ambiguities are now
 * the ones that matter: a revoked row, an elapsed expiry, somebody else's
 * grant. A cookie that parses perfectly and names a closed session resolves
 * to nothing, which is the case the old cookie-only version could not see.
 */
export async function resolveSupportSession(): Promise<SupportSession | null> {
  const sessionId = await resolveSupportSessionId();
  if (!sessionId) return null;

  // No platform session, no support session: the row is read as the
  // operator it belongs to, and a cookie on its own resolves nothing.
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  const record = await readSupportSession(sessionId, {
    userId: ctx.actorId,
    label: ctx.actorLabel,
    requestId: ctx.requestId,
    ipAddress: ctx.ipAddress,
  });

  if (!record) return null;

  return {
    id: record.id,
    tenantId: record.tenantId,
    tenantSlug: record.tenantSlug,
    tenantName: record.tenantName,
    reason: record.reason,
    expiresAt: record.expiresAt,
    startedAt: record.startedAt,
    platformAdminName: record.platformAdminName,
    extensions: record.extensions,
  };
}

/**
 * The console's own chrome geometry, read server side so the sidebar paints at
 * its correct width on the first byte.
 *
 * The design file writes `--nav-w` from a client effect, which is correct in a
 * preview and produces a visible snap in a real app: the server renders 248px,
 * hydration discovers the user collapsed it, and the whole layout jumps. This
 * is the same problem the theme has, and it takes the same solution — a cookie
 * the server can read before it renders a single element.
 */
export const CONSOLE_NAV_COOKIE = 'alcassa_console_nav';
export const CONSOLE_DENSITY_COOKIE = 'alcassa_console_density';

export type NavState = 'expanded' | 'collapsed';
export type Density = 'comfortable' | 'dense';

export async function getConsoleChrome(): Promise<{ nav: NavState; density: Density }> {
  const store = await cookies();
  const nav = store.get(CONSOLE_NAV_COOKIE)?.value === 'collapsed' ? 'collapsed' : 'expanded';
  const density = store.get(CONSOLE_DENSITY_COOKIE)?.value === 'dense' ? 'dense' : 'comfortable';
  return { nav, density };
}

/** The CSS custom properties the shell root carries. Kept beside the cookie
 *  readers so a new density option cannot be added in one place only. */
/*
 * ⚠ THESE NUMBERS ARE MIRRORED IN `ConsoleShell`'s `RAIL_W` / `RAIL_W_OPEN`
 * AND MUST STAY EQUAL. They disagreed for a long time — 60/248 here against
 * 58/240 there — and nothing caught it because no CSS has ever read
 * `--nav-w`. The shell was moved onto these values rather than the reverse,
 * so this function stays the published contract. If the rail is resized,
 * both change together.
 */
export function chromeStyle(nav: NavState, density: Density): React.CSSProperties {
  return {
    '--nav-w': nav === 'collapsed' ? '60px' : '248px',
    '--row-h': density === 'dense' ? '36px' : '44px',
    '--row-pad': density === 'dense' ? '6px' : '10px',
  } as React.CSSProperties;
}
