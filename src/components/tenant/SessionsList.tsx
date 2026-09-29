'use client';

import { useState, useTransition } from 'react';
import { IconAlertTriangle, IconDeviceDesktop } from '@tabler/icons-react';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { revokeSession } from '@/app/(tenant)/app/actions';
import type { AccountSession } from '@/lib/tenant/data';

/** `/app/account/sessions`. Every role. Revoke individually or all. */
export function SessionsList({ sessions }: { sessions: AccountSession[] }) {
  const others = sessions.filter((s) => !s.current);

  return (
    <div className="grid gap-6">
      <ul
        className="overflow-hidden rounded-panel border"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
        role="list"
      >
        {sessions.map((session) => (
          <SessionRow key={session.id} session={session} />
        ))}
      </ul>

      {others.length > 1 ? <RevokeAllRow count={others.length} /> : null}
    </div>
  );
}

function SessionRow({ session }: { session: AccountSession }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await revokeSession(session.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className="border-t px-4 py-3.5 first:border-t-0" style={{ borderColor: 'var(--ink-100)' }}>
      <div className="flex items-center gap-3.5">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-panel"
          style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}
          aria-hidden
        >
          <IconDeviceDesktop size={16} stroke={1.5} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="t-body font-medium text-[var(--text-primary)]">{session.device}</span>
            {session.current ? <Badge tone="active">This device</Badge> : null}
          </span>
          <span className="t-caption block text-[var(--text-tertiary)]">
            {session.location} · {session.lastActive}
          </span>
        </span>
        {!session.current ? (
          <Button variant="quiet" size="sm" onClick={submit} loading={pending} disabled={pending}>
            Revoke
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

function RevokeAllRow({ count }: { count: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await revokeSession('all');
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div>
      <Button variant="destructive" onClick={submit} loading={pending} disabled={pending}>
        Revoke {count} other sessions
      </Button>
      {error ? (
        <p
          role="alert"
          className="t-compact mt-2 flex items-center gap-1.5"
          style={{ color: 'var(--red-500)' }}
        >
          <IconAlertTriangle size={14} stroke={1.5} className="shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
    </div>
  );
}
