import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { supabasePublishableKey, supabaseUrl } from './env';

/**
 * ADR-004. The Supabase client for a SERVER context, carrying the caller's
 * own session.
 *
 * "Drizzle owns schema, migrations and typed queries. The Supabase client
 * owns auth and storage. They talk to the same Postgres." — `lib/db/client.ts`.
 * That division is why this file exists alongside the Drizzle client rather
 * than replacing it: reach for this to ask *who is signed in*, and for
 * `db` to read anything the answer entitles them to.
 *
 * ⚠ THIS USES THE PUBLISHABLE KEY, SO IT IS BOUND BY ROW LEVEL SECURITY —
 * which is the point. It authenticates as the user whose cookies it was
 * given, and every policy in `db/policies/` applies to it exactly as it
 * applies to that user. The RLS-bypassing client is `./admin.ts`, kept
 * separate and lint-guarded for the same reason `lib/db/serviceClient.ts` is.
 *
 * ⚠ THE `setAll` CATCH IS NOT SLOPPINESS. A Server Component cannot write
 * cookies — Next throws if it tries. When the session is refreshed during a
 * Server Component render the write must be swallowed here and performed by
 * middleware instead, which is exactly what `./middleware.ts` does on every
 * request. Removing the catch breaks every server-rendered page the moment a
 * token needs refreshing; removing the middleware makes the swallowed write
 * permanent and silently logs people out. The two are a pair.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component. Middleware refreshes the session
          // instead — see the note above. Genuinely safe to ignore.
        }
      },
    },
  });
}
