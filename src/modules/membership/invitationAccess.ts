import 'server-only';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { withoutTenantContext, type Transaction } from '@/lib/db';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { MemberRole } from '@/db/schema';

/** Token-scoped database helpers allow joining before a tenant context exists.
 * Definer functions return only the invitation identified by the caller's token.
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

/** Read a token-scoped preview; unknown and malformed links both return null. */
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

/** Commit membership, single-use acceptance and its audit record together. */
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
      const row = (
        result as unknown as { accepted_tenant_id: string; accepted_role: MemberRole }[]
      )[0];
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

/** Map named database refusals while preserving unexpected failures. */
function translate(error: unknown): unknown {
  if (error instanceof AppError) return error;

  let message = '';
  let cause: unknown = error;
  for (let depth = 0; cause instanceof Error && depth < 5; depth++) {
    message += ` ${cause.message}`;
    cause = cause.cause;
  }

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
  if (message.includes('invitation_tenant_suspended'))
    return new AppError(ERROR_CODES.TENANT_SUSPENDED);
  if (message.includes('invitation_existing_member'))
    return new AppError(ERROR_CODES.MEMBER_ALREADY_EXISTS);
  if (message.includes('invitation_owner_role'))
    return new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Ownership changes require a transfer by the current owner.',
    });

  return error;
}
