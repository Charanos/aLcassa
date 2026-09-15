'use client';

import { useId, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Button } from './Button';
import { Field } from './Field';

/**
 * 03 §9. "Title, one-sentence consequence, cancel then confirm. Confirm never
 * default-focused." The last rule is the one worth stating twice: a dialog
 * that opens with focus already on the destructive button is one accidental
 * Enter key away from firing it, which is exactly the failure mode a
 * confirmation dialog exists to prevent.
 *
 * Radix `Dialog` gives the focus trap, `Esc` handling and focus return for
 * free, per 03 §17; this wraps it in the visual and behavioural contract
 * rather than reimplementing dialog mechanics.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  consequence,
  details,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  onConfirm,
  loading = false,
  error = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** One sentence. What confirming actually does. */
  consequence: string;
  /**
   * Optional, richer than the one-sentence `consequence` — an impact count, a
   * list, or what the action will RECORD. Sits between the description and the
   * error line, the same slot and the same contract as `DestructiveConfirm`,
   * so the "one sentence" rule in 03 §9 still holds for what actually lands in
   * `Dialog.Description`.
   */
  details?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'primary' | 'destructive';
  onConfirm: () => void;
  loading?: boolean;
  /** A submitted attempt's outcome, once the server has answered. Inline,
   *  never a toast — sheet 12. */
  error?: string | null;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[150]"
          style={{ background: 'var(--surface-overlay)' }}
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-[150] w-[92vw] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-overlay border p-6"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-overlay)',
          }}
          // Confirm is never default-focused. Radix focuses the first
          // focusable element by default, which for this layout is Cancel,
          // and that ordering is deliberate rather than incidental.
        >
          <Dialog.Title className="t-panel text-[var(--text-primary)]">{title}</Dialog.Title>
          <Dialog.Description className="t-compact mt-2 text-[var(--text-secondary)]">
            {consequence}
          </Dialog.Description>

          {details ? <div className="mt-4">{details}</div> : null}

          {error ? (
            <p
              role="alert"
              className="t-compact mt-3 flex items-start gap-1.5"
              style={{ color: 'var(--red-500)' }}
            >
              <IconAlertTriangle size={14} stroke={1.5} className="mt-px shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end gap-2.5">
            <Dialog.Close asChild>
              <Button variant="secondary">{cancelLabel}</Button>
            </Dialog.Close>
            <Button
              variant={tone === 'destructive' ? 'destructive' : 'primary'}
              loading={loading}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * 03 §9. "Type-to-confirm. Reserved for suspension, hard delete and
 * credential revocation." The confirm button is disabled until the typed
 * value matches exactly, which is what makes this meaningfully different from
 * `ConfirmDialog`: it costs the reader a moment of genuine attention rather
 * than one more click their hand already knows how to make.
 */
export function DestructiveConfirm({
  open,
  onOpenChange,
  title,
  consequence,
  /** Optional, richer than the one-sentence `consequence` — a breakdown, an
   *  impact count, a list. Sits between the description and the confirm
   *  field rather than displacing the sentence, so the "one sentence"
   *  contract in 03 §9 still holds for what actually sits in
   *  `Dialog.Description`. */
  details,
  /** What the reader must type. Usually the tenant name, the credential
   *  name, or the literal word the action performs. */
  confirmValue,
  confirmFieldLabel = 'Type to confirm',
  confirmLabel = 'Confirm',
  onConfirm,
  loading = false,
  /** The outcome of a submitted attempt, once the server has answered.
   *  Sheet 12: failure is inline, next to the control, never a toast. This
   *  reuses `Field`'s own reserved error line rather than a second banner. */
  error = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  consequence: string;
  details?: React.ReactNode;
  confirmValue: string;
  confirmFieldLabel?: string;
  confirmLabel?: string;
  /** Receives what was actually typed — matching `confirmValue` is what
   *  enables the button, but the server gets to check that for itself too
   *  rather than trusting the client's `matches` gate alone. */
  onConfirm: (typed: string) => void;
  loading?: boolean;
  error?: string | null;
}) {
  const [typed, setTyped] = useState('');
  const fieldId = useId();
  const matches = typed === confirmValue;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped('');
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[150]"
          style={{ background: 'var(--surface-overlay)' }}
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-[150] w-[92vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-overlay border p-6"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'color-mix(in oklab, var(--red-500) 38%, var(--surface-base))',
            boxShadow: 'var(--shadow-overlay)',
          }}
        >
          <Dialog.Title className="t-panel text-[var(--text-primary)]">{title}</Dialog.Title>
          <Dialog.Description className="t-compact mt-2 text-[var(--text-secondary)]">
            {consequence} This cannot be undone.
          </Dialog.Description>

          {details ? <div className="mt-4">{details}</div> : null}

          <div className="mt-5">
            <Field
              id={fieldId}
              label={confirmFieldLabel}
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={confirmValue}
              autoComplete="off"
              spellCheck={false}
              helper={`Type "${confirmValue}" exactly to enable the button below.`}
              error={error ?? undefined}
            />
          </div>

          <div className="mt-4 flex justify-end gap-2.5">
            <Dialog.Close asChild>
              <Button variant="secondary">Cancel</Button>
            </Dialog.Close>
            <Button
              variant="destructive"
              loading={loading}
              disabled={!matches}
              onClick={() => onConfirm(typed)}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
