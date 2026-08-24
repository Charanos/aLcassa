'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabasePublishableKey, supabaseUrl } from './env';

/**
 * The Supabase client for the BROWSER.
 *
 * Only the publishable key ever reaches here, and that is safe by design:
 * the key identifies the project, it does not grant access. Row Level
 * Security is what protects the data, which is the whole reason `06` insists
 * isolation lives in the database rather than in application code — a key in
 * a browser bundle cannot read what policy forbids.
 *
 * Prefer the server client wherever there is a choice. This exists for the
 * genuinely interactive parts of auth: a sign-in form that must react to a
 * bad password without a round trip, and `onAuthStateChange`.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabasePublishableKey());
}
