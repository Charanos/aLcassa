'use client';

import { useState, useTransition } from 'react';
import { IconAlertTriangle, IconKey } from '@tabler/icons-react';
import { Badge, type BadgeTone } from '@/components/feedback/Badge';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { revokeCredential } from '@/app/(tenant)/app/actions';
import type { Credential } from '@/lib/tenant/data';

/**
 * 02 §4 · 03 §14. Owner only. "Never used" and "unused 90 days" are their own
 * badge states — the list says which credential is worth revoking rather
 * than making the reader compute it from a date.
 */
export function CredentialsList({ credentials }: { credentials: Credential[] }) {
  if (credentials.length === 0) {
    return (
      <EmptyState
        icon={IconKey}
        title="No API credentials yet"
        body="A credential lets an external system read and write messages through the service door, scoped to exactly what it needs."
      />
    );
  }

  return (
    <ul className="grid" role="list">
      {credentials.map((c) => (
        <CredentialRow key={c.id} credential={c} />
      ))}
    </ul>
  );
}

/** The usage badge only — revoked status renders its own badge separately. */
function usageBadge(credential: Credential): { tone: BadgeTone; label: string } | null {
  if (credential.status === 'revoked') return null;
  if (!credential.lastUsed) return { tone: 'trialing', label: 'Never used' };
  const days = Number(credential.lastUsed.match(/(\d+)\s*days?/)?.[1] ?? 0);
  if (days >= 90) return { tone: 'nearLimit', label: `Unused ${credential.lastUsed}` };
  return null;
}

function CredentialRow({ credential }: { credential: Credential }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const usage = usageBadge(credential);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await revokeCredential(credential.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className="border-t py-4 first:border-t-0" style={{ borderColor: 'var(--ink-100)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="t-body font-medium text-[var(--text-primary)]">{credential.name}</span>
            {credential.status === 'revoked' ? <Badge tone="pastDue">Revoked</Badge> : null}
            {usage ? <Badge tone={usage.tone}>{usage.label}</Badge> : null}
          </div>
          <p className="t-data mt-1 text-[var(--text-tertiary)]">{credential.prefix}…</p>
          <p className="t-caption mt-1 text-[var(--text-tertiary)]">
            {credential.scopes.join(' · ')} — created {credential.createdAt} by{' '}
            {credential.createdBy}
          </p>
        </div>
        {credential.status !== 'revoked' ? (
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
