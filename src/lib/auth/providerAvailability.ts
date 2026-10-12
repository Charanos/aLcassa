import 'server-only';
import { supabasePublishableKey, supabaseUrl } from './supabase/env';

export type ProviderAvailability = 'enabled' | 'disabled' | 'unavailable' | 'unconfigured';

/** Public provider configuration only; never an authentication or authorization decision. */
export async function googleAvailability(fresh = false): Promise<ProviderAvailability> {
  let url: URL;
  let key: string;
  try {
    url = new URL('/auth/v1/settings', supabaseUrl());
    key = supabasePublishableKey();
  } catch {
    return 'unconfigured';
  }
  // Retry transient transport/5xx failures once; explicit provider disablement is final.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { apikey: key },
        signal: AbortSignal.timeout(attempt === 0 ? 2000 : 3000),
        ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: 30 } }),
      });
      if (!response.ok) {
        if (response.status >= 500 && attempt === 0) continue;
        return 'unavailable';
      }
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
      if (attempt === 1) return 'unavailable';
    }
  }
  return 'unavailable';
}
