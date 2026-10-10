import 'server-only';
import { supabasePublishableKey, supabaseUrl } from './supabase/env';

export type ProviderAvailability = 'enabled' | 'disabled' | 'unavailable';

/** Public provider configuration only; never an authentication or authorization decision. */
export async function googleAvailability(fresh = false): Promise<ProviderAvailability> {
  try {
    const response = await fetch(new URL('/auth/v1/settings', supabaseUrl()), {
      headers: { apikey: supabasePublishableKey() },
      signal: AbortSignal.timeout(2000),
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 30 } }),
    });
    if (!response.ok) return 'unavailable';
    const settings: unknown = await response.json();
    if (!settings || typeof settings !== 'object' || !('external' in settings))
      return 'unavailable';
    const providers = settings.external;
    if (!providers || typeof providers !== 'object' || !('google' in providers))
      return 'unavailable';
    return providers.google === true
      ? 'enabled'
      : providers.google === false
        ? 'disabled'
        : 'unavailable';
  } catch {
    return 'unavailable';
  }
}
