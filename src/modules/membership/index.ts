/**
 * 04 §3 · 11 §6. The only file another module may import.
 *
 * `membership` owns who is in a workspace, what they may do there, and how
 * they got in. It does NOT own what a seat costs — that is `entitlements`,
 * which this module calls — and it does not own authentication, which is
 * `lib/auth`. The division matters at exactly one place: inviting someone
 * consumes a seat, so this module asks the guard rather than counting rows
 * itself.
 */

export {
  inviteMember,
  revokeInvitation,
  changeMemberRole,
  removeMember,
  transferOwnership,
} from './service';

/**
 * The two operations that run before the acceptor has a membership, and
 * therefore before any tenant context exists. They go through narrow
 * SECURITY DEFINER functions rather than Drizzle queries — see the file for
 * why that is the only correct option of the three available.
 */
export {
  readInvitationByToken,
  acceptInvitationByToken,
  hashInvitationToken,
} from './invitationAccess';
export type { InvitationPreview } from './invitationAccess';

export type { InviteInput, InviteResult } from './service';
