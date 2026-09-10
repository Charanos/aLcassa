'use client';

import { useRef, useState, useTransition } from 'react';
import { IconAlertTriangle, IconClock, IconHistory, IconPlayerPlay } from '@tabler/icons-react';
import * as Dialog from '@radix-ui/react-dialog';
import { gsapSafe } from '@/lib/motion';
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
 *
 * Built directly on Radix `Dialog` rather than `ConfirmDialog` — the reason
 * field makes this more than a title-and-consequence confirm — which is what
 * gets it the focus trap, Escape handling, scroll lock and focus-restore that
 * the hand-rolled version never had.
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
  const dialogRef = useRef<HTMLDivElement>(null);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(reason);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Dialog.Root
      open
      onOpenChange={(next) => {
        if (!next && !pending) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[150]"
          style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(6px)' }}
        />
        <Dialog.Content
          ref={(el) => {
            dialogRef.current = el;
            if (el) {
              gsapSafe.fromTo(
                el,
                { opacity: 0, y: 18, xPercent: -50, yPercent: -50, scale: 0.94 },
                { opacity: 1, y: 0, xPercent: -50, yPercent: -50, scale: 1, duration: 0.34, ease: 'power3.out' },
              );
            }
          }}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className="surface-glass-strong fixed top-1/2 left-1/2 z-[150] w-[560px] max-w-[92vw] overflow-hidden rounded-overlay"
          style={{ boxShadow: 'var(--glass-highlight), var(--shadow-lg)' }}
        >
          <div className="p-6">
            <p className="t-eyebrow" style={{ color: 'var(--text-tertiary)' }}>
              Support session
            </p>
            <Dialog.Title asChild>
              <h2 className="display display-md mt-2.5" style={{ color: 'var(--text-primary)' }}>
                Enter {workspace.name}
              </h2>
            </Dialog.Title>
            <Dialog.Description asChild>
              <p
                className="t-body mt-3"
                style={{ color: 'var(--text-secondary)', maxWidth: '56ch' }}
              >
                You will see this workspace under the same Row Level Security rules its own staff
                work under. Not a master key.
              </p>
            </Dialog.Description>

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
            <Dialog.Close asChild>
              <button
                type="button"
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
            </Dialog.Close>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Fact({ icon: Icon, children }: { icon: typeof IconClock; children: React.ReactNode }) {
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
