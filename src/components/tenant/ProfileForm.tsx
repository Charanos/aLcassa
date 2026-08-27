'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Field } from '@/components/primitives/Field';
import { Button } from '@/components/primitives/Button';
import { updateProfile } from '@/app/(tenant)/app/actions';
import type { AccountProfile } from '@/lib/tenant/data';

/** `/app/account`. Every role. Name, email, password, plus the role and
 *  tenure facts that make "who am I in this workspace" answerable at a
 *  glance. Password is a link to the same reset flow `/forgot-password`
 *  uses, not an inline current/new password pair — one fewer place a
 *  password is ever typed into a form that isn't the dedicated one. */
export function ProfileForm({ profile }: { profile: AccountProfile }) {
  const [name, setName] = useState(profile.name);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = name !== profile.name;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateProfile({ name });
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  }

  return (
    <div className="grid max-w-xl gap-8">
      <section
        className="flex items-center gap-4 rounded-panel border p-5"
        style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-raised)' }}
      >
        <span
          className="t-heading grid size-12 shrink-0 place-items-center rounded-full"
          style={{ background: 'var(--copper-tint)', color: 'var(--copper-ink)' }}
          aria-hidden
        >
          {profile.initials}
        </span>
        <div>
          <p className="t-body font-medium text-[var(--ink-primary)]">{profile.name}</p>
          <p className="t-caption text-[var(--ink-tertiary)]">
            {profile.role} · member since {profile.memberSince}
          </p>
        </div>
      </section>

      <form onSubmit={submit} className="grid gap-5">
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          label="Email"
          value={profile.email}
          disabled
          helper={profile.emailVerified ? 'Verified' : 'Not verified'}
        />

        {error ? (
          <p
            role="alert"
            className="t-compact flex items-start gap-1.5"
            style={{ color: 'var(--oxide-ink)' }}
          >
            <IconAlertTriangle size={14} stroke={1.5} className="mt-px shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div
          className="flex items-center gap-3 border-t pt-5"
          style={{ borderColor: 'var(--rule-soft)' }}
        >
          <Button type="submit" variant="primary" loading={pending} disabled={!dirty || pending}>
            Save changes
          </Button>
          {saved ? (
            <span className="t-compact" style={{ color: 'var(--verdigris-ink)' }}>
              Saved
            </span>
          ) : null}
        </div>
      </form>

      <section className="border-t pt-6" style={{ borderColor: 'var(--rule-soft)' }}>
        <h2 className="t-panel text-[var(--ink-primary)]">Password</h2>
        <p className="t-compact mt-1 text-[var(--ink-tertiary)]">
          Sent to {profile.email}. Signs you out of every other session on completion.
        </p>
        <Button asChild variant="secondary" className="mt-3">
          <Link href={`/forgot-password?email=${encodeURIComponent(profile.email)}`}>
            Send reset link
          </Link>
        </Button>
      </section>

      <section className="border-t pt-6" style={{ borderColor: 'var(--rule-soft)' }}>
        <h2 className="t-panel text-[var(--ink-primary)]">Sessions</h2>
        <p className="t-compact mt-1 text-[var(--ink-tertiary)]">
          Everywhere you are currently signed in.
        </p>
        <Button asChild variant="secondary" className="mt-3">
          <Link href="/app/account/sessions">Manage sessions</Link>
        </Button>
      </section>
    </div>
  );
}
