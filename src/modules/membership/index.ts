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
  acceptInvitation,
} from './service';

export type { InviteInput, InviteResult } from './service';
