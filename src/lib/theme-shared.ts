/**
 * The parts of the theme contract that BOTH sides need.
 *
 * `src/lib/theme.ts` is marked `server-only`, correctly: it reads cookies and
 * request headers and must never be bundled for the browser. The client toggle
 * still needs the cookie NAME and the two types, and importing them from there
 * would drag the whole server module across the boundary.
 *
 * So the shared surface lives here, with no imports and no side effects, and
 * the server module re-exports it. One name, one place, both sides.
 */

export const THEME_COOKIE = 'aLcassa_theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

/** One year, path-wide, lax. Written from the client on toggle and read by the
 *  server on the next render, which is what keeps the first paint correct. */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
