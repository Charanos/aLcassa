'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { IconClock, IconHistory, IconPlayerPlay, IconShieldLock } from '@tabler/icons-react';
import { nextSupportReference } from '@/app/(platform)/platform/(console)/actions';
import { ConsoleDialog, DialogActions, DialogFact } from '@/components/primitives/ConsoleDialog';
import type { ConsoleWorkspace } from './types';

/**
 * Enter a customer's workspace.
 *
 * ⚠ THIS DIALOG SET THE HOUSE STYLE AND NOW USES IT. Its eyebrow, its fact
 * list, its sunken footer carrying `support_session.start` in mono — that
 * vocabulary is `ConsoleDialog` now, extracted so the four modals written after
 * it stop being four approximations of this one. Nothing here is lost; the
 * padding, the borders and the footer are the same rhythm, defined once.
 *
 * Two things this file gains by the move:
 *
 *   · The entrance animation no longer replays on every keystroke. It was on an
 *     inline callback ref, which React re-invokes whenever the function's
 *     identity changes — every render, for an inline arrow.
 *   · The title stops being `display display-md`. "Enter Kilimanjaro Logistics
 *     Group Ltd" at 38px wrapped to three lines and pushed the reason field
 *     below the fold on a laptop.
 *
 * ⚠ THE REFERENCE IS GENERATED, NOT INVENTED. See `nextSupportReference`.
 */
export function StartSessionDialog({
  workspace,
  onCancel,
  onConfirm,
}: {
  workspace: ConsoleWorkspace;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * ⚠ THE REFERENCE PREFIXES THE FIELD, AND THE OPERATOR WRITES AFTER IT.
   *
   * Two rejected alternatives, both worse. Putting it in a separate read-only
   * input costs a field for a string nobody edits. Appending it on the server
   * would mean the operator cannot see, at the moment they confirm, the exact
   * text the customer is about to read in their own activity log — and that
   * text being legible before it is written is the whole point of the field.
   */
  useEffect(() => {
    let live = true;
    void nextSupportReference().then((ref) => {
      if (!live) return;
      setReference(ref);
      setReason((current) => (current === '' ? `${ref} · ` : current));
      /* Caret to the end, so typing continues the sentence rather than
         landing in front of the reference. */
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
    });
    return () => {
      live = false;
    };
  }, []);

  /* The reference alone is not a reason. The server requires eight characters;
     this requires eight BEYOND the generated prefix, so pressing confirm on an
     untouched field is not possible. */
  const written = reference ? reason.replace(`${reference} · `, '').trim() : reason.trim();
  const ready = written.length >= 8;

  function submit() {
    if (!ready || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(reason);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <ConsoleDialog
      open
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
      dismissible={!pending}
      eyebrow="Support session"
      title={`Enter ${workspace.name}`}
      width="md"
      operation="support_session.start"
      description="You will see this workspace under the same Row Level Security rules its own staff work under. Not a master key."
      facts={
        <>
          <DialogFact icon={IconClock}>
            Read-only, and it expires after <em>30 minutes</em>. There is no extension.
          </DialogFact>
          <DialogFact icon={IconHistory}>
            Written to <em>the customer&rsquo;s own activity log</em>, with your name and this
            reason. They can read it, and they can end the session themselves.
          </DialogFact>
          <DialogFact icon={IconShieldLock}>
            Reference <em>{reference ?? 'pending'}</em>, taken from the platform log rather than
            typed — so the session can be joined to a ticket afterwards.
          </DialogFact>
        </>
      }
      error={error}
      actions={
        <DialogActions
          confirmLabel="Start 30-minute session"
          confirmIcon={IconPlayerPlay}
          onConfirm={submit}
          disabled={!ready}
          loading={pending}
        />
      }
    >
      <label className="block">
        <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
          Reason{' '}
          <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
            · required, and the customer reads it
          </span>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !pending) submit();
          }}
          placeholder="verifying a duplicated WhatsApp thread"
          aria-invalid={error ? true : undefined}
          className="t-body w-full rounded-chip px-3 outline-none transition-colors"
          style={{
            height: 38,
            border: `1px solid ${error ? 'var(--danger-fg)' : 'var(--border-strong)'}`,
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
          }}
        />
        <span
          className="t-caption mt-1.5 block min-h-[1.2em]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {ready
            ? 'Written as it appears here.'
            : 'Say what you are checking. "." satisfies a length test and tells the customer nothing.'}
        </span>
      </label>
    </ConsoleDialog>
  );
}
