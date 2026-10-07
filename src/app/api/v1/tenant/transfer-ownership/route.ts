import { z } from 'zod';
import { resolveSessionDoor } from '@/lib/auth/resolve';
import { createSupabaseServerClient } from '@/lib/auth/supabase/server';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { defineRoute } from '@/lib/http/pipeline';
import { jsonOk } from '@/lib/http/response';
import { transferOwnership } from '@/modules/membership';

/** Ownership transfer requires password reauthentication because the previous owner cannot independently undo it. */

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
    /** Support visits cannot transfer ownership, regardless of their other write permissions. */
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
