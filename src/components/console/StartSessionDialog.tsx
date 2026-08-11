'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { IconAlertTriangle, IconClock, IconHistory, IconPlayerPlay } from '@tabler/icons-react';
import gsap from 'gsap';
import type { ConsoleWorkspace } from './types';

/**
 * The confirmation that stands between the switcher and a workspace.
 *
 * 09 §4: selecting a workspace NEVER navigates straight in. The friction is
 * the feature. What this dialog is really doing is making the operator write
 * something a customer will read, at the moment they still remember why.
 *
 * The two facts on it are chosen for what they defuse rather than for what
 * they describe. "Not a master key" answers the fear the customer has when
 * they see the banner; "they can end the session themselves" answers the one
 * they have immediately afterwards. Both are load-bearing product claims, so
 * the copy states them plainly and does not soften them.
 *
 * ⚠ VALIDATION IS SERVER-AUTHORITATIVE. The inline error below is UX; the
 * refusal lives in `startSupportSession`. This component surfaces whatever the
 * action returns rather than deciding for itself, so the two can never
 * disagree about what counts as an acceptable reason.
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (overlayRef.current) {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22, ease: 'power2.out' });
    }
    if (dialogRef.current) {
      gsap.fromTo(
        dialogRef.current,
        { opacity: 0, y: 18, scale: 0.94 },
        { opacity: 1, y: 0, scale: 1, duration: 0.34, ease: 'power3.out' }
      );
    }
  }, []);

  /* Escape closes. A modal you can only leave by finding the Cancel button is
     a modal that traps keyboard users, and this one appears in front of an
     operator who may well have opened it by accident from the switcher. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel, pending]);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(reason);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div
      ref={overlayRef}
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 90,
        background: 'var(--surface-overlay)',
        display: 'grid',
        placeItems: 'center',
        padding: 'var(--space-6)',
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="start-session-title"
        onClick={(e) => e.stopPropagation()}
        className="surface-glass-strong w-[560px] max-w-full overflow-hidden rounded-overlay"
        style={{
          boxShadow: 'var(--glass-highlight), var(--shadow-lg)',
        }}
      >
        <div className="p-6">
          <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
            Support session
          </p>
          <h2
            id="start-session-title"
            className="display display-md mt-2.5"
            style={{ color: 'var(--text-primary)' }}
          >
            Enter {workspace.name}
          </h2>
          <p
            className="t-body mt-3"
            style={{ color: 'var(--text-secondary)', maxWidth: '56ch' }}
          >
            You will see this workspace under the same Row Level Security rules its own staff work
            under. Not a master key.
          </p>

          <ul
            className="mt-4 grid list-none gap-2.5 border-t p-0 pt-4"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Fact icon={IconClock}>
              Read-only, and it expires after <em>30 minutes</em>. There is no extension.
            </Fact>
            <Fact icon={IconHistory}>
              Written to <em>the customer&rsquo;s own activity log</em>, with your name and this
              reason. They can read it, and they can end the session themselves.
            </Fact>
          </ul>

          <label className="mt-5 block">
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
              placeholder="Ticket 4829 · verifying a duplicated WhatsApp thread"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'start-session-error' : undefined}
              className="t-body w-full rounded-chip px-3"
              style={{
                height: 38,
                border: `1px solid ${error ? 'var(--danger-fg)' : 'var(--border-strong)'}`,
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }}
            />
          </label>

          {error ? (
            <p
              id="start-session-error"
              role="alert"
              className="t-compact mt-2 flex items-center gap-1.5"
              style={{ color: 'var(--danger-fg)' }}
            >
              <IconAlertTriangle size={15} stroke={1.5} className="shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}
        </div>

        <div
          className="flex items-center gap-2.5 border-t px-6 py-3.5"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
        >
          {/* The operation's real name, in mono. An operator who is about to
              do something audited should be able to see what it is called in
              the log they will later search. */}
          <span className="t-caption numeric flex-1" style={{ color: 'var(--text-tertiary)' }}>
            support_session.start
          </span>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="t-compact rounded-panel px-3.5 transition-colors"
            style={{
              height: 36,
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="t-compact inline-flex items-center gap-2 rounded-panel px-4 transition-colors"
            style={{
              height: 36,
              border: 'none',
              background: 'var(--blue-500)',
              color: '#ffffff',
              fontWeight: 500,
              opacity: pending ? 0.75 : 1,
            }}
          >
            <IconPlayerPlay size={15} stroke={1.5} aria-hidden />
            {pending ? 'Starting…' : 'Start 30-minute session'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  children,
}: {
  icon: typeof IconClock;
  children: React.ReactNode;
}) {
  return (
    <li className="t-compact flex items-start gap-2.5" style={{ color: 'var(--text-primary)' }}>
      <Icon
        size={16}
        stroke={1.5}
        className="mt-0.5 shrink-0"
        style={{ color: 'var(--text-tertiary)' }}
        aria-hidden
      />
      <span>{children}</span>
    </li>
  );
}
