import { createServerClient } from '@supabase/ssr';
import type { NextRequest, NextResponse } from 'next/server';
import { supabasePublishableKey, supabaseUrl } from './env';

/**
 * Session refresh at the edge.
 *
 * ⚠ WHY THIS IS SHAPED DIFFERENTLY FROM SUPABASE'S OWN SNIPPET.
 *
 * The published example builds and returns its own `NextResponse`. This
 * project's `src/middleware.ts` already builds one, carrying a CSP nonce, a
 * correlation id and the `x-pathname` header — and 04 §7 documents at length
 * why that nonce must be on the REQUEST headers rather than only the
 * response. A helper that constructs a second response would either discard
 * that work or duplicate it, and the failure mode is a page that returns 200
 * with correct markup and no working JavaScript.
 *
 * So this MUTATES the response it is handed instead of creating one:
 * cookies land on the caller's response, the caller keeps its headers, and
 * there is exactly one `NextResponse` per request.
 *
 * ⚠ IT REFRESHES; IT DOES NOT AUTHORISE. `getUser()` is called for its side
 * effect — validating the token with Supabase and writing rotated cookies.
 * The coarse redirect for an unauthenticated request stays in
 * `src/middleware.ts`, and the real authorisation happens in the request
 * pipeline where a database transaction can set tenant context on the same
 * connection as the query (06 §3). Edge middleware cannot do that, which is
 * the reason it is not trusted to.
 */
export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse,
): Promise<void> {
  const supabase = createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          // Both sides: the request so anything later in this same pass sees
          // the refreshed token, and the response so the browser keeps it.
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Deliberately `getUser()` and not `getSession()`. getSession reads the
  // cookie and trusts it; getUser revalidates against Supabase. At the edge,
  // on a token we did not mint this request, only the second is worth having.
  await supabase.auth.getUser();
}
