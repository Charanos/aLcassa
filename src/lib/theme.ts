import 'server-only';
import { cookies, headers } from 'next/headers';

/**
 * 03 §19. The theme is resolved server side so there is no flash.
 *
 * The usual way to do this is an inline script in <head> that reads a cookie
 * and stamps an attribute before paint. 04 §7 forbids dangerouslySetInnerHTML
 * anywhere in Phase 1, and that is the only way to emit one in the App Router,
 * so this uses the `Sec-CH-Prefers-Color-Scheme` client hint instead. The
 * browser sends the user's OS preference with the request, the server resolves
 * it, and there is no client-side correction to flash.
 *
 * The hint is requested by the `Accept-CH` header in next.config.ts. On the
 * first ever request a browser has not been asked for it yet, so a `system`
 * preference renders light for that one navigation and correctly from then on.
 * Light is the ground the drafting sheet is drawn on, so a wrong first frame
 * there is the less jarring of the two.
 */

export const THEME_COOKIE = 'conduit_theme';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export async function getThemePreference(): Promise<ThemePreference> {
  const store = await cookies();
  const value = store.get(THEME_COOKIE)?.value;
  return isThemePreference(value) ? value : 'system';
}

export async function resolveTheme(preference: ThemePreference): Promise<ResolvedTheme> {
  if (preference === 'light' || preference === 'dark') return preference;
  const hint = (await headers()).get('sec-ch-prefers-color-scheme');
  return hint === 'dark' ? 'dark' : 'light';
}
