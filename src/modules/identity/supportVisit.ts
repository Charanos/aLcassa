import 'server-only';
import { sql } from 'drizzle-orm';
import { withTenantContext, type ResolvedContext } from '@/lib/db';
import { AppError, ERROR_CODES } from '@/lib/errors';

/**
 * A customer ends a support visit to their own workspace. Doc 24 · S0.3 · D6.
 *
 * 09 §7 promised an owner could end a visit; the policy allowed it and the
 * frame's button did nothing. This is the path the button now takes.
 *
 * The work is `app.end_support_visit` (02_identity.sql): it checks that the
 * caller is an owner or admin of THIS workspace against the membership row,
 * revokes the session, and writes the customer's log and the platform's in
 * one statement — the customer cannot write the platform log themselves, and
 * the register must learn who ended the visit.
 *
 * Returns false when the visit was already over, so a second click records
 * nothing.
 */
export async function endSupportVisit(ctx: ResolvedContext, sessionId: string): Promise<boolean> {
  if (ctx.supportMode) {
    throw new AppError(ERROR_CODES.SUPPORT_WRITE_DENIED, {
      message: 'A support session cannot end itself from inside the workspace.',
    });
  }
  if (ctx.role !== 'owner' && ctx.role !== 'admin') {
    throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED, {
      message: 'Only an owner or admin of this workspace can end a support visit.',
    });
  }

  try {
    const rows = await withTenantContext(ctx, (tx) =>
      tx.execute<{ ended: boolean }>(
        sql`select app.end_support_visit(${sessionId}::uuid, ${ctx.requestId}) as ended`,
      ),
    );
    return Boolean((rows as unknown as Array<{ ended: boolean }>)[0]?.ended);
  } catch (error) {
    const code =
      (error as { code?: string; cause?: { code?: string } }).code ??
      (error as { cause?: { code?: string } }).cause?.code;
    if (code === 'P0002' || code === '22P02') {
      throw new AppError(ERROR_CODES.NOT_FOUND, {
        message: 'That support visit is not in this workspace.',
      });
    }
    if (code === '42501') {
      throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED, {
        message: 'Only an owner or admin of this workspace can end a support visit.',
      });
    }
    throw error;
  }
}
