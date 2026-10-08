'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconMail, IconUsers } from '@tabler/icons-react';
import { Badge, MEMBER_STATUS_TONE } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { LimitBar } from '@/components/domain/LimitBar';
import {
  removeMember,
  revokeInvitation,
  updateMemberRole,
  resendTeamInvitation,
} from '@/app/(tenant)/app/actions';
import type { Invitation, Member, TeamModel } from '@/lib/tenant/data';
import type { TenantRole } from '@/lib/db/context';

type Review =
  | { kind: 'remove'; member: Member }
  | { kind: 'role'; member: Member }
  | { kind: 'withdraw'; invitation: Invitation }
  | { kind: 'resend'; invitation: Invitation };
const roleName = (role: string) =>
  role === 'admin' ? 'Administrator' : role === 'owner' ? 'Owner' : 'Agent';

/** Shared review keeps errors, focus and pending state stable when a row disappears. */
export function TeamPanel({ model, role }: { model: TeamModel; role: TenantRole | null }) {
  const router = useRouter();
  const [review, setReview] = useState<Review | null>(null);
  const [nextRole, setNextRole] = useState<'admin' | 'agent'>('agent');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmedModel, setConfirmedModel] = useState<TeamModel | null>(null);
  const [refreshRequired, setRefreshRequired] = useState(false);
  const shown =
    confirmedModel && (confirmedModel.readAt ?? '') >= (model.readAt ?? '')
      ? confirmedModel
      : model;
  const { members, invitations } = shown;
  const activeCount = members.filter((member) => member.status === 'active').length;
  const [pending, startTransition] = useTransition();
  const memberHeading = useRef<HTMLHeadingElement>(null);
  const invitationHeading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const canManage = role === 'owner' || role === 'admin' || role === 'support';

  function open(value: Review, trigger: HTMLElement) {
    if (pending || refreshRequired) return;
    returnFocus.current = trigger;
    setError(null);
    setReview(value);
    if ('member' in value) setNextRole(value.member.role === 'admin' ? 'agent' : 'admin');
  }

  function submit() {
    if (!review) return;
    setError(null);
    startTransition(async () => {
      const result =
        review.kind === 'remove'
          ? await removeMember(review.member.id)
          : review.kind === 'role'
            ? await updateMemberRole(review.member.id, nextRole)
            : review.kind === 'withdraw'
              ? await revokeInvitation(review.invitation.id)
              : await resendTeamInvitation(review.invitation.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.team) setConfirmedModel(result.team);
      setRefreshRequired(Boolean(result.refreshRequired));
      returnFocus.current = 'member' in review ? memberHeading.current : invitationHeading.current;
      setNotice(
        result.notice ??
          (review.kind === 'remove'
            ? 'Teammate removed.'
            : review.kind === 'role'
              ? 'Role updated.'
              : review.kind === 'withdraw'
                ? 'Invitation withdrawn. Its reserved seat is available.'
                : 'Invitation renewed and emailed.'),
      );
      setReview(null);
      router.refresh();
    });
  }

  const title =
    review?.kind === 'remove'
      ? 'Remove teammate?'
      : review?.kind === 'role'
        ? 'Change workspace role?'
        : review?.kind === 'withdraw'
          ? 'Withdraw invitation?'
          : 'Renew invitation?';
  const consequence =
    review && 'member' in review
      ? review.kind === 'remove'
        ? `${review.member.name} will lose access to this workspace. You can invite them again later.`
        : `${review.member.name} will become an ${roleName(nextRole).toLowerCase()}. Their permissions change on their next request.`
      : review
        ? review.kind === 'withdraw'
          ? `The invitation for ${review.invitation.email} will stop working and its seat will become available.`
          : `A new seven-day link will replace the old invitation for ${review.invitation.email}.`
        : '';

  return (
    <div className="grid gap-10">
      <div className="surface-sunken grid gap-5 rounded-panel border border-[var(--border-subtle)] p-5 md:grid-cols-[1fr_1fr] md:items-center md:p-6">
        <div>
          <p className="t-eyebrow text-[var(--text-tertiary)]">Workspace capacity</p>
          <p className="t-body mt-2 text-[var(--text-secondary)]">
            Active teammates and outstanding invitations share your seat allowance. Expired
            invitations keep their seat until withdrawn.
          </p>
        </div>
        <LimitBar
          label={`${activeCount} active${invitations.length ? ` · ${invitations.length} reserved` : ''}`}
          current={shown.seatsUsed}
          limit={shown.seatsLimit}
        />
      </div>
      {notice ? (
        <p
          role="status"
          className="t-compact rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4 break-words"
        >
          {notice}
        </p>
      ) : null}
      {refreshRequired ? (
        <Button variant="secondary" onClick={() => location.reload()}>
          Reload team
        </Button>
      ) : null}
      <section aria-labelledby="team-members-title">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 id="team-members-title" ref={memberHeading} tabIndex={-1} className="t-heading">
              Your team
            </h2>
            <p className="t-compact mt-2 text-[var(--text-secondary)]">
              Teammates and their workspace roles.
            </p>
          </div>
          <span className="t-caption shrink-0 text-[var(--text-tertiary)]">
            {members.length} {members.length === 1 ? 'person' : 'people'}
          </span>
        </div>
        <ul
          className="overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 md:px-6"
          role="list"
        >
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--border-subtle)] py-5 first:border-t-0"
            >
              <span
                aria-hidden
                className="t-chip grid size-10 shrink-0 place-items-center rounded-full bg-[var(--surface-sunken)] text-[var(--text-secondary)]"
              >
                {member.initials}
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="t-body text-[var(--text-primary)]">{member.name}</span>
                  {MEMBER_STATUS_TONE[member.status] ? (
                    <Badge tone={MEMBER_STATUS_TONE[member.status]!}>
                      {member.status.replaceAll('_', ' ')}
                    </Badge>
                  ) : null}
                </div>
                <p className="t-caption mt-1 break-all text-[var(--text-secondary)]">
                  {member.email || 'Email unavailable'}
                </p>
              </div>
              <span className="t-compact text-[var(--text-secondary)]">
                {roleName(member.role)}
              </span>
              {role === 'owner' && member.role !== 'owner' ? (
                <Button
                  variant="quiet"
                  size="sm"
                  aria-label={`Change role for ${member.name}`}
                  disabled={pending || refreshRequired}
                  onClick={(event) => open({ kind: 'role', member }, event.currentTarget)}
                >
                  Change role
                </Button>
              ) : null}
              {canManage &&
              (member.role === 'agent' || (role === 'owner' && member.role === 'admin')) ? (
                <Button
                  variant="quiet"
                  size="sm"
                  aria-label={`Remove ${member.name}`}
                  disabled={pending || refreshRequired}
                  onClick={(event) => open({ kind: 'remove', member }, event.currentTarget)}
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
          {!members.length ? (
            <li className="t-compact flex items-center gap-3 py-7 text-[var(--text-secondary)]">
              <IconUsers size={24} aria-hidden /> No teammates to display.
            </li>
          ) : null}
        </ul>
      </section>

      <section aria-labelledby="team-invitations-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <span className="t-caption text-[var(--text-tertiary)]">
            {invitations.length} {invitations.length === 1 ? 'invitation' : 'invitations'}
          </span>
          <div className="ml-auto text-right">
            <h2
              id="team-invitations-title"
              ref={invitationHeading}
              tabIndex={-1}
              className="t-heading"
            >
              Waiting to join
            </h2>
            <p className="t-compact mt-2 text-[var(--text-secondary)]">
              Renew an older link or release a reserved seat.
            </p>
          </div>
        </div>
        <ul
          className="surface-sunken rounded-panel border border-[var(--border-subtle)] px-4 md:px-6"
          role="list"
        >
          {invitations.map((invitation) => (
            <li
              key={invitation.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[var(--border-subtle)] py-5 first:border-t-0"
            >
              <IconMail
                size={24}
                stroke={1.5}
                aria-hidden
                className="shrink-0 text-[var(--text-tertiary)]"
              />
              <div className="min-w-0 flex-1 basis-48">
                <p className="t-body break-all">{invitation.email}</p>
                <p className="t-caption mt-1 text-[var(--text-secondary)]">
                  {roleName(invitation.role)} · Sent {invitation.sentAt} ·{' '}
                  {invitation.status === 'expired' ? 'Expired' : 'Expires'} {invitation.expiresAt}
                </p>
              </div>
              {invitation.status === 'expired' ? (
                <Badge tone="nearLimit">Link expired</Badge>
              ) : null}
              {canManage ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="quiet"
                    size="sm"
                    disabled={
                      pending ||
                      refreshRequired ||
                      (!invitation.canResend && invitation.status !== 'expired')
                    }
                    title={
                      !invitation.canResend && invitation.status !== 'expired'
                        ? 'Available one day after the last send.'
                        : undefined
                    }
                    aria-label={`Renew invitation for ${invitation.email}`}
                    onClick={(event) => open({ kind: 'resend', invitation }, event.currentTarget)}
                  >
                    Renew link
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    aria-label={`Withdraw invitation for ${invitation.email}`}
                    disabled={pending || refreshRequired}
                    onClick={(event) => open({ kind: 'withdraw', invitation }, event.currentTarget)}
                  >
                    Withdraw
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
          {!invitations.length ? (
            <li className="flex items-center gap-4 py-7">
              <IconMail
                size={28}
                stroke={1.25}
                aria-hidden
                className="shrink-0 text-[var(--text-tertiary)]"
              />
              <div>
                <p className="t-body">No outstanding invitations</p>
                <p className="t-compact mt-1 text-[var(--text-secondary)]">
                  New invitations will appear here until they join or you withdraw them.
                </p>
              </div>
            </li>
          ) : null}
        </ul>
      </section>
      <ConfirmDialog
        open={review !== null}
        onOpenChange={(value) => {
          if (!value && !pending) setReview(null);
        }}
        title={title}
        consequence={consequence}
        confirmLabel={
          review?.kind === 'remove'
            ? 'Remove teammate'
            : review?.kind === 'role'
              ? 'Update role'
              : review?.kind === 'withdraw'
                ? 'Withdraw invitation'
                : 'Renew invitation'
        }
        tone={review?.kind === 'remove' || review?.kind === 'withdraw' ? 'destructive' : 'primary'}
        onConfirm={submit}
        loading={pending}
        error={error}
        returnFocusRef={returnFocus}
        details={
          review?.kind === 'role' ? (
            <label className="t-label grid gap-2">
              New role
              <select
                value={nextRole}
                onChange={(event) => setNextRole(event.target.value as 'admin' | 'agent')}
                className="t-body rounded-chip border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2"
              >
                <option value="agent">Agent</option>
                <option value="admin">Administrator</option>
              </select>
            </label>
          ) : undefined
        }
      />
    </div>
  );
}
