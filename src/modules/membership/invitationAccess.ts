import 'server-only';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { withoutTenantContext, type Transaction } from '@/lib/db';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { MemberRole } from '@/db/schema';

/**
 * 07 §5. THE TWO READS THAT HAPPEN BEFORE ANYBODY HAS A MEMBERSHIP.
 *
 * ⚠ WHY THESE GO THROUGH DATABASE FUNCTIONS RATHER THAN DRIZZLE QUERIES.
 *
 * Accepting an invitation is the one flow with no tenant context available:
 * resolving one requires a membership, and creating that membership is the
 * whole operation. Every policy on `invitations` and `tenant_members`
 * therefore matches nothing, and a plain query returns zero rows — which is
 * the policies working, not a bug in them.
 *
 * There are three ways out and only one is right:
 *
 *   a public SELECT policy    would let any unauthenticated caller read the
 *                             table by some other predicate, leaking every
 *                             pending invitation and address on the platform
 *   the service role          forbidden: `serviceClient.ts` lists four
 *                             permitted operations and says in terms that it
 *                             may NEVER read a tenant's members
 *   a narrow SECURITY DEFINER FUNCTION, keyed by the token hash  ← this
 *
 * The function sees past RLS, so it is deliberately narrow: it takes a hash
 * rather than an id, returns no token material, and can only ever return the
 * single row whose token the caller already holds. `02_identity.sql` carries
 * the same reasoning next to the definitions.
 */

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export type InvitationPreview = {
  invitationId: string;
  tenantId: string;
  tenantName: string;
  invitedEmail: string;
  invitedRole: MemberRole;
  invitedByName: string | null;
  expiresAt: Date;
  state: 'pending' | 'expired' | 'accepted' | 'revoked';
};

type PreviewRow = {
  invitation_id: string;
  tenant_id: string;
  tenant_name: string;
  invited_email: string;
  invited_role: MemberRole;
  invited_by_name: string | null;
  expires_at: string | Date;
  accepted_at: string | Date | null;
  revoked_at: string | Date | null;
};

/**
 * The accept screen's read. Answers null when the token names nothing, so a
 * caller can render "this link is not valid" rather than distinguishing a
 * malformed token from an unknown one — which would confirm which tokens are
 * real.
 */
export async function readInvitationByToken(
  token: string,
  requestId: string,
  existingTx?: Transaction,
): Promise<InvitationPreview | null> {
  const run = async (tx: Transaction) => {
    const result = await tx.execute(
      sql`select * from app.invitation_by_token(${hashInvitationToken(token)})`,
    );
    return (result as unknown as PreviewRow[])[0] ?? null;
  };

  const row = existingTx ? await run(existingTx) : await withoutTenantContext(requestId, run);
  if (!row) return null;

  const expiresAt = new Date(row.expires_at);

  return {
    invitationId: row.invitation_id,
    tenantId: row.tenant_id,
    tenantName: row.tenant_name,
    invitedEmail: row.invited_email,
    invitedRole: row.invited_role,
    invitedByName: row.invited_by_name,
    expiresAt,
    state: row.revoked_at
      ? 'revoked'
      : row.accepted_at
        ? 'accepted'
        : expiresAt.getTime() <= Date.now()
          ? 'expired'
          : 'pending',
  };
}

/**
 * The acceptance. One database function, so marking the token used and
 * creating the membership cannot come apart — see the note on
 * `app.accept_invitation` for why that matters more than it looks.
 *
 * The function raises named exceptions for the four refusals; they are mapped
 * back onto the error catalogue here so the caller gets the same codes, the
 * same statuses and the same sentences as every other route.
 */
export async function acceptInvitationByToken(
  token: string,
  userId: string,
  profile: { fullName: string; email: string },
  requestId: string,
): Promise<{ tenantId: string; role: MemberRole }> {
  return withoutTenantContext(requestId, async (tx) => {
    try {
      const result = await tx.execute(
        sql`select * from app.accept_invitation(
              ${hashInvitationToken(token)}, ${userId}, ${profile.fullName}, ${profile.email})`,
      );
      const row = (result as unknown as { accepted_tenant_id: string; accepted_role: MemberRole }[])[0];
      if (!row) {
        throw new AppError(ERROR_CODES.NOT_FOUND, {
          message: 'This invitation link is not valid. Ask whoever invited you for a new one.',
        });
      }
      return { tenantId: row.accepted_tenant_id, role: row.accepted_role };
    } catch (error) {
      throw translate(error);
    }
  });
}

/** Postgres exception → the catalogue. Anything unrecognised is rethrown
 *  untouched: swallowing an unexpected database error into a friendly
 *  invitation message would hide a real fault behind a plausible story. */
function translate(error: unknown): unknown {
  if (error instanceof AppError) return error;

  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('invitation_not_found')) {
    return new AppError(ERROR_CODES.NOT_FOUND, {
      message: 'This invitation link is not valid. Ask whoever invited you for a new one.',
    });
  }
  if (message.includes('invitation_revoked')) return new AppError(ERROR_CODES.INVITATION_REVOKED);
  if (message.includes('invitation_already_accepted')) {
    return new AppError(ERROR_CODES.INVITATION_ALREADY_ACCEPTED);
  }
  if (message.includes('invitation_expired')) return new AppError(ERROR_CODES.INVITATION_EXPIRED);

  return error;
}
