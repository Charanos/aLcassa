'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconKey, IconLock } from '@tabler/icons-react';
import { Field } from '@/components/primitives/Field';
import { Button } from '@/components/primitives/Button';
import { CredentialReveal } from '@/components/domain/CredentialReveal';
import { createCredential } from '@/app/(tenant)/app/actions';
import type { Credential } from '@/lib/tenant/data';

const permissions = [
  {
    value: 'ai_rules:read',
    label: 'Read assistant rules',
    detail: 'Read the published instructions used by your assistant.',
  },
  {
    value: 'tenant:read',
    label: 'Read workspace details',
    detail: 'Read the workspace name, timezone, language and status.',
  },
];

export function CreateCredentialForm({
  replacement,
  onDone,
}: {
  replacement?: Credential;
  onDone?: (created: boolean) => void;
}) {
  const router = useRouter();
  const requestKey = useRef<string | null>(null);
  const submitting = useRef(false);
  const [name, setName] = useState(replacement?.name ?? '');
  const [scopes, setScopes] = useState<string[]>(replacement?.scopes ?? []);
  const [environment, setEnvironment] = useState<'live' | 'test'>(
    replacement?.environment ?? 'live',
  );
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [replayed, setReplayed] = useState(false);
  const [pending, startTransition] = useTransition();
  const done = () => {
    const created = secret !== null || replayed;
    setSecret(null);
    router.refresh();
    if (onDone) onDone(created);
    else router.push('/app/settings/credentials');
  };

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    requestKey.current ??= crypto.randomUUID();
    setError(null);
    startTransition(async () => {
      try {
        const result = await createCredential({
          name,
          scopes,
          environment,
          requestKey: requestKey.current!,
          ...(replacement ? { rotateFromId: replacement.id } : {}),
        });
        if (!result.ok) setError(result.error);
        else if (result.secret) setSecret(result.secret);
        else setReplayed(true);
      } catch {
        setError(
          'The outcome could not be confirmed. Retry this request to check whether it was created.',
        );
      } finally {
        submitting.current = false;
      }
    });
  }

  if (secret)
    return <CredentialReveal name={name} secret={secret} scopes={scopes} onConfirm={done} />;
  if (replayed)
    return (
      <div className="grid gap-4" role="status">
        <p className="t-body">
          This request already created a credential. Its key cannot be shown again. Open the list
          and replace it if you did not save the original.
        </p>
        <Button onClick={done}>Open credentials</Button>
      </div>
    );

  return (
    <form
      onSubmit={submit}
      className="grid gap-6 rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 sm:p-6"
    >
      <div className="flex items-start gap-3 border-b border-[var(--border-subtle)] pb-5">
        <IconKey
          size={22}
          stroke={1.5}
          className="mt-1 shrink-0 text-[var(--blue-500)]"
          aria-hidden
        />
        <div>
          <h2 className="t-panel">{replacement ? 'Replace this key' : 'Connection permissions'}</h2>
          <p className="t-compact mt-1 text-[var(--text-secondary)]">
            {replacement
              ? 'The replacement keeps the same permissions. The existing key remains valid for 24 hours so you can update your integration.'
              : 'Choose only the access your integration needs. Permissions cannot be widened after creation.'}
          </p>
        </div>
      </div>
      <Field
        label="Name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Production assistant"
        maxLength={100}
        disabled={pending}
        required
        autoFocus
      />
      <fieldset disabled={pending || !!replacement} className="grid gap-2">
        <legend className="t-label mb-2 text-[var(--text-secondary)]">Permissions</legend>
        {permissions.map((permission) => (
          <label
            key={permission.value}
            className="flex cursor-pointer items-start gap-3 rounded-chip px-3 py-3 hover:bg-[var(--surface-sunken)]"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={scopes.includes(permission.value)}
              onChange={() =>
                setScopes((current) =>
                  current.includes(permission.value)
                    ? current.filter((scope) => scope !== permission.value)
                    : [...current, permission.value],
                )
              }
            />
            <span>
              <span className="t-body block">{permission.label}</span>
              <span className="t-caption mt-1 block text-[var(--text-secondary)]">
                {permission.detail}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="t-compact grid gap-2">
        Environment
        <select
          className="rounded-chip border border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 py-2"
          value={environment}
          onChange={(event) => setEnvironment(event.target.value as 'live' | 'test')}
          disabled={pending || !!replacement}
        >
          <option value="live">Live</option>
          <option value="test">Test</option>
        </select>
        <span className="t-caption text-[var(--text-secondary)]">
          Both environments can read this workspace. Test is a label, not a separate sandbox.
        </span>
      </label>
      <p className="t-caption flex items-start gap-2 text-[var(--text-secondary)]">
        <IconLock size={16} className="shrink-0" aria-hidden />
        The key appears once. Keep it private and store it in your secret manager.
      </p>
      {error ? (
        <p role="alert" className="t-compact text-[var(--red-500)]">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3 border-t border-[var(--border-subtle)] pt-5">
        <Button
          type="submit"
          variant="primary"
          loading={pending}
          disabled={!name.trim() || !scopes.length || pending}
        >
          {replacement ? 'Create replacement' : 'Create credential'}
        </Button>
        <Button variant="quiet" onClick={done} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
