import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabasePublishableKey, supabaseUrl } from './env';

/**
 * A throwaway Supabase client for PROVING A PASSWORD and nothing else.
 *
 * ⚠ WHY THIS CANNOT BE `createSupabaseServerClient()`.
 *
 * Re-authentication means calling `signInWithPassword` with the credentials
 * the user just typed. The server client is bound to the caller's cookie jar,
 * so that call would mint a NEW session and overwrite the live one — for the
 * same person, but with a different session id, which is precisely the value
 * `sessions` keys its rows on and `revokeAllSessions(…, exceptSessionId)`
 * uses to spare the current device. Proving a password would silently rotate
 * the session underneath the request that was proving it.
 *
 * This client keeps its session in memory, never persists, never refreshes,
 * and is thrown away with the request. It answers exactly one question — does
 * this password belong to this address — and holds nothing afterwards.
 *
 * ⚠ IT USES THE PUBLISHABLE KEY, DELIBERATELY. Verifying a password through
 * the admin client would mean an RLS-bypassing credential in a path that takes
 * user input, to do a job the ordinary key already does. The publishable key
 * is rate-limited by GoTrue like any sign-in attempt, which is the behaviour
 * this wants.
 */
export function createSupabasePasswordVerifier() {
  return createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
