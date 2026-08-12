import type { ResolvedTheme, ThemePreference } from './theme-shared';

export async function getThemePreference(): Promise<ThemePreference> {
  // In production this reads the theme cookie server-side (03 §19) so there is
  // no flash. Stubbed here for the component preview.
  return 'light';
}

export async function resolveTheme(pref: ThemePreference): Promise<ResolvedTheme> {
  if (pref === 'system') return 'light';
  return pref;
}
