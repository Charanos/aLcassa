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

    await verifyPassword(body.password, ctx.actorId);

    const result = await transferOwnership(ctx, body.memberId);

    return jsonOk(
      {
        previousOwnerId: result.previousOwnerId,
        newOwnerId: result.newOwnerId,
        newOwnerMemberId: body.memberId,
        // The caller is now an admin. Saying so lets the interface refresh
        // its own permissions rather than discovering them by being refused.
        yourRoleNow: 'admin',
      },
      { requestId },
    );
  },
});

/** Reauthenticate the resolved owner without persisting or globally ending provider sessions. */
async function verifyPassword(password: string, actorId: string): Promise<void> {
  const sessionClient = await createSupabaseServerClient();
  const { data: current, error: identityError } = await sessionClient.auth.getUser();
  const email = current.user?.email;

  if (identityError || !email || current.user?.id !== actorId) {
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
      message: 'Sign in again before transferring ownership.',
    });
  }

  const { createClient } = await import('@supabase/supabase-js');
  const { supabasePublishableKey, supabaseUrl } = await import('@/lib/auth/supabase/env');

  const throwaway = createClient(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: proof, error } = await throwaway.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.status === 429) throw new AppError(ERROR_CODES.AUTH_ACCOUNT_LOCKED);
    if (!error.status || error.status >= 500 || error.name === 'AuthRetryableFetchError')
      throw new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE, {
        message: 'Password verification is temporarily unavailable. Ownership has not changed.',
      });
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

  // Revoke only this temporary refresh session. Access JWTs retain their normal expiry.
  const { error: cleanupError } = await throwaway.auth.signOut({ scope: 'local' });
  if (cleanupError)
    throw new AppError(ERROR_CODES.UPSTREAM_UNAVAILABLE, {
      message:
        'Password verification could not be completed. Ownership has not changed. Try again shortly.',
    });

  if (!proof.user || proof.user.id !== actorId)
    throw new AppError(ERROR_CODES.AUTH_SESSION_EXPIRED, {
      message: 'Sign in again before transferring ownership. Ownership has not changed.',
    });
}
