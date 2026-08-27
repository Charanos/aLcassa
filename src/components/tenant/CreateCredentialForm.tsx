'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Field } from '@/components/primitives/Field';
import { Button } from '@/components/primitives/Button';
import { createCredential } from '@/app/(tenant)/app/actions';

const SCOPES = [
  { value: 'messages:read', label: 'Read messages' },
  { value: 'messages:write', label: 'Send messages' },
  { value: 'contacts:read', label: 'Read contacts' },
];

/** 02 §4. `/app/settings/credentials/new` — the only screen that will ever
 *  show a secret. See `CredentialReveal` for why this form's submit refuses
 *  rather than fabricating one right now. */
export function CreateCredentialForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCredential({ name, scopes });
      if (!result.ok) setError(result.error);
      // A real success would navigate to the reveal state here — see
      // CredentialReveal's own doc comment for why that path is not wired.
    });
  }

  const ready = name.trim() !== '' && scopes.length > 0;

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-5">
      <Field
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Production — order sync"
        helper="How this credential will read in the list. Not shown to anyone outside your team."
        autoFocus
      />

      <fieldset className="grid gap-2">
        <legend className="t-label mb-1 text-[var(--ink-secondary)]">Scopes</legend>
        {SCOPES.map((s) => (
          <label
            key={s.value}
            className="flex cursor-pointer items-center gap-3 rounded-panel border p-3"
            style={{
              borderColor: scopes.includes(s.value) ? 'var(--copper-ink)' : 'var(--rule-base)',
              background: scopes.includes(s.value) ? 'var(--copper-tint)' : 'var(--surface-raised)',
            }}
          >
            <input
              type="checkbox"
              checked={scopes.includes(s.value)}
              onChange={() => toggleScope(s.value)}
            />
            <span className="t-body text-[var(--ink-primary)]">{s.label}</span>
          </label>
        ))}
      </fieldset>

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
        <Button type="submit" variant="primary" loading={pending} disabled={!ready || pending}>
          Create credential
        </Button>
        <Button
          variant="quiet"
          onClick={() => router.push('/app/settings/credentials')}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
