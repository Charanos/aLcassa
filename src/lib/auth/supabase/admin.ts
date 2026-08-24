import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { supabaseSecretKey, supabaseUrl } from './env';

/**
 * ⚠ THE SUPABASE CLIENT THAT BYPASSES ROW LEVEL SECURITY.
 *
 * 06 §7 · 01 D-02 · 05 I-05. This is the auth-side twin of
 * `lib/db/serviceClient.ts`, and it carries the same restriction, enforced
 * the same way: importing this file is a lint error everywhere except
 * `src/modules/platform`. That is not a style rule. It is the enforcement of
 * the isolation guarantee, and the exception list has exactly one entry.
 *
 * WHERE IT MAY BE USED. Auth operations on accounts as records, which by
 * definition cannot run as the user they concern:
 *
 *   create a user        during provisioning, before the account exists
 *   invite by email      the invitee has no session yet
 *   delete a user        the account is being removed
 *   list users           reads across accounts by definition
 *
 * WHERE IT MAY NEVER BE USED. Reading or writing anything a signed-in user
 * could read or write as themselves. If a session exists, use
 * `createSupabaseServerClient()` and let the policies apply. Reaching for
 * this because a policy is inconvenient is how the guarantee dies quietly.
 *
 * ⚠ `persistSession: false` IS LOAD-BEARING. This client must never adopt or
 * write a session: it runs with a key that answers to no user, and a
 * persisted session here would leak that authority into a context that then
 * looks like an ordinary signed-in caller.
 */
export function createSupabaseAdminClient() {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
