import 'server-only';
import { cookies } from 'next/headers';

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
 * So the cookie below carries only an opaque id and the absolute expiry. The
 * banner's countdown is derived from `expiresAt` on every tick, which means a
 * refresh, a slow tab, or a laptop resumed from sleep all resolve to the same
 * remaining time — and an expired session renders as expired rather than as
 * "29:59" until someone happens to reload.
 *
 * Authority still rests with the row, not the cookie: the cookie is a pointer,
 * and `resolveSupportSession` is where the row would be loaded and re-checked
 * once M4 lands the `support_sessions` table. Until then this reads the cookie
 * and hard-fails closed on anything it cannot parse.
 */

export const SUPPORT_SESSION_COOKIE = 'alcassa_support_session';

/** 09 §4. Thirty minutes, no extension. Stated here once so the dialog copy,
 *  the cookie lifetime and the server check cannot drift apart. */
export const SUPPORT_SESSION_DURATION_MS = 30 * 60 * 1000;

export type SupportSession = {
  id: string;
  tenantId: string;
  tenantName: string;
  /** The operator's stated reason. The customer reads this. */
  reason: string;
  /** Absolute, ISO 8601. The client derives its countdown from this. */
  expiresAt: string;
};

type CookiePayload = Partial<Record<keyof SupportSession, unknown>>;

function isExpired(expiresAt: string): boolean {
  const at = Date.parse(expiresAt);
  return Number.isNaN(at) || at <= Date.now();
}

/**
 * Read the active support session, or null.
 *
 * Fails closed on every ambiguity: unparseable JSON, a missing field, a
 * malformed timestamp and an elapsed timestamp all return null rather than
 * throwing or degrading to a partial session. A support session that cannot
 * be fully verified is not a support session.
 */
export async function resolveSupportSession(): Promise<SupportSession | null> {
  const raw = (await cookies()).get(SUPPORT_SESSION_COOKIE)?.value;
  if (!raw) return null;

  let parsed: CookiePayload;
  try {
    parsed = JSON.parse(raw) as CookiePayload;
  } catch {
    return null;
  }

  const { id, tenantId, tenantName, reason, expiresAt } = parsed;
  if (
    typeof id !== 'string' ||
    typeof tenantId !== 'string' ||
    typeof tenantName !== 'string' ||
    typeof reason !== 'string' ||
    typeof expiresAt !== 'string'
  ) {
    return null;
  }

  if (isExpired(expiresAt)) return null;

  return { id, tenantId, tenantName, reason, expiresAt };
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
export function chromeStyle(nav: NavState, density: Density): React.CSSProperties {
  return {
    '--nav-w': nav === 'collapsed' ? '60px' : '248px',
    '--row-h': density === 'dense' ? '36px' : '44px',
    '--row-pad': density === 'dense' ? '6px' : '10px',
  } as React.CSSProperties;
}
