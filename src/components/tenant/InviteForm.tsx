'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Field } from '@/components/primitives/Field';
import { Button } from '@/components/primitives/Button';
import { sendInvitation } from '@/app/(tenant)/app/actions';
import type { MemberRole } from '@/lib/tenant/data';

const ROLES: Array<{ value: MemberRole; label: string; detail: string }> = [
  {
    value: 'admin',
    label: 'Administrator',
    detail: 'Manages teammates and workspace settings. Credentials remain private to the owner.',
  },
  { value: 'agent', label: 'Agent', detail: 'Handles conversations. No access to settings.' },
];

export function InviteForm({
  seatsRemaining,
  planName,
}: {
  seatsRemaining: number | null;
  /** 08 §2. The plan is passed in rather than named here: the tiers are Pro,
   *  Business and Custom, and this component previously hardcoded "Growth" —
   *  a tier from the four-name proposal that was replaced on 24 Aug 2026. */
  planName?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('agent');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const emailValid = /.+@.+\..+/.test(email);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) return;
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await sendInvitation({ email, role });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      /**
       * ⚠ THE REDIRECT IS SKIPPED WHEN THERE IS SOMETHING TO READ.
       *
       * The invitation succeeded either way. But when the email could not be
       * sent, the response carries the only remaining route to that person —
       * and navigating away would discard it before anyone saw it. So a
       * plain success leaves for the team list, and a success with a notice
       * stays put until the owner has copied the link.
       */
      if (result.notice) {
        setNotice(result.notice);
        setEmail('');
        return;
      }

      router.push('/app/settings/team');
    });
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-5">
      {seatsRemaining !== null && seatsRemaining <= 2 ? (
        <p
          className="t-compact rounded-chip border px-3.5 py-2.5"
          style={{
            borderColor: 'color-mix(in oklab, var(--amber-500) 38%, var(--surface-base))',
            background: 'var(--amber-100)',
            color: 'var(--amber-500)',
          }}
        >
          {seatsRemaining} {seatsRemaining === 1 ? 'seat' : 'seats'} left
          {planName ? ` on ${planName}` : ''}. Invitations reserve a seat until accepted or
          withdrawn.
        </p>
      ) : null}

      <Field
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="teammate@acmeindustrial.co.ke"
        autoFocus
      />

      <fieldset className="grid gap-2">
        <legend className="t-label mb-1 text-[var(--text-secondary)]">Role</legend>
        {ROLES.map((r) => (
          <label
            key={r.value}
            className="flex cursor-pointer items-start gap-3 rounded-panel border p-3.5 transition-colors"
            style={{
              borderColor: role === r.value ? 'var(--blue-500)' : 'var(--border-subtle)',
              background: role === r.value ? 'var(--blue-50)' : 'var(--surface-raised)',
            }}
          >
            <input
              type="radio"
              name="role"
              value={r.value}
              checked={role === r.value}
              onChange={() => setRole(r.value)}
              className="mt-0.5"
            />
            <span>
              <span className="t-body block font-medium text-[var(--text-primary)]">{r.label}</span>
              <span className="t-caption block text-[var(--text-tertiary)]">{r.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {notice ? (
        <div
          role="status"
          className="t-compact grid gap-2 rounded-panel border px-3.5 py-3"
          style={{
            borderColor: 'color-mix(in oklab, var(--amber-500) 38%, var(--surface-base))',
            background: 'var(--amber-100)',
            color: 'var(--amber-500)',
          }}
        >
          <span>{notice}</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => router.push('/app/settings/team')}
          >
            Done
          </Button>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="t-compact flex items-start gap-1.5"
          style={{ color: 'var(--red-500)' }}
        >
          <IconAlertTriangle size={14} stroke={1.5} className="mt-px shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <div
        className="flex items-center gap-3 border-t pt-5"
        style={{ borderColor: 'var(--ink-100)' }}
      >
        <Button type="submit" variant="primary" loading={pending} disabled={!emailValid || pending}>
          Send invitation
        </Button>
        <Button
          variant="quiet"
          onClick={() => router.push('/app/settings/team')}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
