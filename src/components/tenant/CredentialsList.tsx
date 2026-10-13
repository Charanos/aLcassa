'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconAlertTriangle, IconKey } from '@tabler/icons-react';
import { Badge, type BadgeTone } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { EmptyState } from '@/components/primitives/EmptyState';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { ConsoleDialog } from '@/components/primitives/ConsoleDialog';
import { CreateCredentialForm } from './CreateCredentialForm';
import { revokeCredential } from '@/app/(tenant)/app/actions';
import type { Credential } from '@/lib/tenant/data';

/** Owner metadata with recorded usage and explicit credential state. */
export function CredentialsList({ credentials }: { credentials: Credential[] }) {
  if (credentials.length === 0) {
    return (
      <EmptyState
        icon={IconKey}
        title="No API credentials yet"
        body="Create a key with permission to read workspace details or assistant rules. Keep its access limited to what the integration needs."
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
  if (!credential.lastUsed) return { tone: 'trialing', label: 'No recorded usage' };
  const days = credential.lastUsedAt
    ? (Date.now() - Date.parse(credential.lastUsedAt)) / 86_400_000
    : Number(credential.lastUsed.match(/(\d+)\s*days?/)?.[1] ?? 0);
  if (days >= 90) return { tone: 'nearLimit', label: `Unused ${credential.lastUsed}` };
  return null;
}

function CredentialRow({ credential }: { credential: Credential }) {
  const router = useRouter();
  const rotationTrigger = useRef<HTMLButtonElement>(null);
  const revokeTrigger = useRef<HTMLButtonElement>(null);
  const rowName = useRef<HTMLHeadingElement>(null);
  const restoreAfterMutation = useRef(false);
  const [confirm, setConfirm] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const usage = usageBadge(credential);
  useEffect(() => {
    if (restoreAfterMutation.current) {
      rowName.current?.focus();
      restoreAfterMutation.current = false;
    }
  }, [credential.status]);

  function submit() {
    setError(null);
    startTransition(async () => {
      try {
        const result = await revokeCredential(credential.id);
        if (!result.ok) setError(result.error);
        else {
          restoreAfterMutation.current = true;
          setConfirm(false);
          router.refresh();
        }
      } catch {
        setError(
          'Revocation could not be confirmed. Reload to check this credential before trying again.',
        );
      }
    });
  }

  return (
    <li className="border-t py-4 first:border-t-0" style={{ borderColor: 'var(--ink-100)' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              ref={rowName}
              tabIndex={-1}
              className="t-body font-medium text-[var(--text-primary)]"
            >
              {credential.name}
            </h3>
            {credential.status === 'revoked' ? <Badge tone="pastDue">Revoked</Badge> : null}
            {credential.status === 'rotating' ? (
              <Badge tone="nearLimit">Being replaced</Badge>
            ) : null}
            {usage ? <Badge tone={usage.tone}>{usage.label}</Badge> : null}
          </div>
          <p className="t-data mt-1 text-[var(--text-tertiary)]">{credential.prefix}…</p>
          <p className="t-caption mt-1 text-[var(--text-tertiary)]">
            {credential.scopes
              .map((scope) =>
                scope === 'ai_rules:read'
                  ? 'Assistant rules'
                  : scope === 'tenant:read'
                    ? 'Workspace details'
                    : scope,
              )
              .join(' · ')}{' '}
            · created {credential.createdAt} by {credential.createdBy}
          </p>
          {credential.status === 'rotating' && credential.expiresAt ? (
            <p className="t-caption mt-2 text-[var(--text-secondary)]">
              Existing key expires{' '}
              {new Date(credential.expiresAt).toLocaleString('en-GB', {
                timeZone: 'Africa/Nairobi',
              })}{' '}
              EAT.
            </p>
          ) : null}
        </div>
        {credential.status !== 'revoked' ? (
          <div className="flex shrink-0 flex-wrap gap-1">
            {credential.status === 'active' ? (
              <Button
                ref={rotationTrigger}
                variant="quiet"
                size="sm"
                onClick={() => setRotating(true)}
              >
                Replace
              </Button>
            ) : null}
            <Button
              ref={revokeTrigger}
              variant="quiet"
              size="sm"
              onClick={() => {
                setError(null);
                setConfirm(true);
              }}
              disabled={pending}
            >
              Revoke
            </Button>
          </div>
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
      <ConfirmDialog
        open={confirm}
        returnFocusRef={
          credential.status === 'revoked' || restoreAfterMutation.current ? rowName : revokeTrigger
        }
        onOpenChange={setConfirm}
        title={`Revoke ${credential.name}?`}
        consequence={
          credential.rotatedFromId
            ? 'This key and any previous key still in its replacement grace period will stop working immediately. Update integrations to use another credential.'
            : 'This key will stop working immediately. Integrations using it will need another credential.'
        }
        confirmLabel="Revoke credential"
        tone="destructive"
        onConfirm={submit}
        loading={pending}
        error={error}
      />
      <ConsoleDialog
        open={rotating}
        onOpenChange={setRotating}
        eyebrow="API credential"
        title={`Replace ${credential.name}`}
        width="lg"
        actions={null}
        returnFocusRef={
          credential.status !== 'active' || restoreAfterMutation.current ? rowName : rotationTrigger
        }
      >
        {rotating ? (
          <CreateCredentialForm
            replacement={credential}
            onDone={(created) => {
              restoreAfterMutation.current = created;
              setRotating(false);
            }}
          />
        ) : null}
      </ConsoleDialog>
    </li>
  );
}
