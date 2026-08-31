'use client';

import { useState, useTransition } from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Badge, MEMBER_STATUS_TONE, type BadgeTone } from '@/components/feedback/Badge';
import { Button } from '@/components/primitives/Button';
import { removeMember, revokeInvitation } from '@/app/(tenant)/app/actions';
import type { Invitation, Member } from '@/lib/tenant/data';

/**
 * 02 §4 · 03 §14. Team members and pending invitations.
 *
 * Role — owner, admin, agent — renders in graphite, never a badge hue: 03
 * §14 is explicit that "role is not a state." Member status IS a state, and
 * only earns a badge when it is not the default: "Active" is absence, per
 * the same rule the credential and subscription lists follow.
 */
export function TeamPanel({
  members,
  invitations,
}: {
  members: Member[];
  invitations: Invitation[];
}) {
  return (
    <div className="grid gap-8">
      <section>
        <h2 className="t-panel text-[var(--text-primary)]">Members</h2>
        <ul className="mt-3 grid" role="list">
          {members.map((m) => (
            <MemberRow key={m.id} member={m} />
          ))}
        </ul>
      </section>

      {invitations.length > 0 ? (
        <section>
          <h2 className="t-panel text-[var(--text-primary)]">Pending invitations</h2>
          <ul className="mt-3 grid" role="list">
            {invitations.map((inv) => (
              <InvitationRow key={inv.id} invitation={inv} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function MemberRow({ member }: { member: Member }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tone = MEMBER_STATUS_TONE[member.status];

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await removeMember(member.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className="border-t py-3.5 first:border-t-0" style={{ borderColor: 'var(--ink-100)' }}>
      <div className="flex items-center gap-3.5">
        <span
          className="t-chip grid size-8 shrink-0 place-items-center rounded-full"
          style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}
          aria-hidden
        >
          {member.initials}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="t-body font-medium text-[var(--text-primary)]">{member.name}</span>
            <span className="t-caption tracking-wide text-[var(--text-tertiary)] uppercase">
              {member.role}
            </span>
            {tone ? <Badge tone={tone}>{member.status.replace('_', ' ')}</Badge> : null}
          </span>
          <span className="t-caption block text-[var(--text-tertiary)]">{member.email}</span>
        </span>
        {member.role !== 'owner' ? (
          <Button variant="quiet" size="sm" onClick={submit} loading={pending} disabled={pending}>
            Remove
          </Button>
        ) : null}
      </div>
      {error ? (
        <p
          role="alert"
          className="t-caption mt-1.5 flex items-center gap-1.5"
          style={{ color: 'var(--red-500)' }}
        >
          <IconAlertTriangle size={13} stroke={1.5} className="shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </li>
  );
}

function InvitationRow({ invitation }: { invitation: Invitation }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tone: BadgeTone = invitation.status === 'expired' ? 'nearLimit' : 'trialing';

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await revokeInvitation(invitation.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className="border-t py-3.5 first:border-t-0" style={{ borderColor: 'var(--ink-100)' }}>
      <div className="flex items-center gap-3.5">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="t-body text-[var(--text-primary)]">{invitation.email}</span>
            <span className="t-caption tracking-wide text-[var(--text-tertiary)] uppercase">
              {invitation.role}
            </span>
            <Badge tone={tone}>
              {invitation.status === 'expired' ? 'Invitation expired' : 'Invited'}
            </Badge>
          </span>
          <span className="t-caption block text-[var(--text-tertiary)]">
            Sent {invitation.sentAt} ·{' '}
            {invitation.status === 'expired'
              ? `Expired ${invitation.expiresAt}`
              : `Expires ${invitation.expiresAt}`}
          </span>
        </span>
        <Button variant="quiet" size="sm" onClick={submit} loading={pending} disabled={pending}>
          Revoke
        </Button>
      </div>
      {error ? (
        <p
          role="alert"
          className="t-caption mt-1.5 flex items-center gap-1.5"
          style={{ color: 'var(--red-500)' }}
        >
          <IconAlertTriangle size={13} stroke={1.5} className="shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </li>
  );
}
