import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { transferOwnership } from '@/modules/membership';

/**
 * 07 §4 · `POST /v1/tenant/transfer-ownership`.
 * "Owner. Atomic, requires password confirmation."
 *
 * ⚠ WHY A PASSWORD, WHEN THE CALLER IS ALREADY SIGNED IN.
 *
 * This is the only action in the product that the person taking it cannot
 * undo. After it commits, the former owner is an admin, and getting ownership
 * back requires the new owner's cooperation — or ours. Every other
 * destructive action here has a remedy the actor still controls; this one
 * hands away the control itself.
 *
 * So it is gated on RE-AUTHENTICATION rather than on a typed confirmation
 * phrase. A typed slug proves the person read the dialog. A password proves
 * the person at the keyboard is the account holder, which is the actual risk:
 * an unattended session, or someone who sat down at a borrowed laptop, can
 * type a workspace name off the screen in front of them.
 *
 * ⚠ THE PASSWORD IS CHECKED WITHOUT DISTURBING THE CURRENT SESSION.
 *
 * `signInWithPassword` on the ordinary server client would rotate this
 * request's auth cookies mid-flight. `verifyPassword` below therefore uses a
 * throwaway client with no cookie access at all: it can answer "is this the
 * right password" and it cannot mint, refresh or clear anything.
 */

export const POST = defineRoute({
  door: 'session',
  resolve: resolveSessionDoor,
  roles: ['owner'],
  bodySchema: z.object({
    /** The `tenant_members.id` of the person taking over. */
    memberId: z.string().uuid(),
    password: z.string().min(1, 'Confirm your password to transfer ownership.'),
  }),
  handle: async ({ ctx, body, requestId }) => {
    /**
     * ⚠ A SUPPORT SESSION MAY NEVER DO THIS, WHATEVER 01 D-13 OPENED.
     *
     * Support mode is read and write as of 24 Aug 2026, but that decision was
     * about helping a customer operate their workspace. Handing that workspace
     * to a different person is not operating it. `can_write_as_owner()` in the
     * policies already excludes a support session, so the database would
     * refuse this anyway — this check exists so the refusal arrives with a
     * sentence rather than as an empty update.
     */
    if (ctx.supportMode) {
      throw new AppError(ERROR_CODES.SUPPORT_WRITE_DENIED, {
        message:
          'A support session cannot transfer ownership. The workspace owner has to do this themselves.',
      });
    }

    await verifyPassword(body.password);

    const result = await transferOwnership(ctx, body.memberId);

    return jsonOk(
      {
        previousOwnerId: result.previousOwnerId,
        newOwnerId: result.newOwnerId,
        // The caller is now an admin. Saying so lets the interface refresh
        // its own permissions rather than discovering them by being refused.
        yourRoleNow: 'admin',
      },
      { requestId },
    );
  },
});

/**
 * Re-authentication that cannot touch the caller's session.
 *
 * The client is built with a no-op cookie adapter, so Supabase's attempt to
 * persist the session it creates goes nowhere. What comes back is only the
 * verdict.
 */
async function verifyPassword(password: string): Promise<void> {
  const sessionClient = await createSupabaseServerClient();
  const { data: current } = await sessionClient.auth.getUser();
  const email = current.user?.email;

  if (!email) {
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
      message: 'Sign in again before transferring ownership.',
    });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const { supabasePublishableKey, supabaseUrl } = await import('@/lib/auth/supabase/env');

  const throwaway = createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error } = await throwaway.auth.signInWithPassword({ email, password });

  if (error) {
    throw new AppError(ERROR_CODES.AUTH_INVALID_CREDENTIALS, {
      message: 'That password is not correct.',
      details: [
        {
          field: 'password',
          code: ERROR_CODES.AUTH_INVALID_CREDENTIALS,
          message: 'That password is not correct.',
        },
      ],
    });
  }

  // Nothing was persisted, but ending it explicitly means the token this
  // check minted is dead before the function returns rather than left to
  // expire on Supabase's schedule.
  await throwaway.auth.signOut();
}
