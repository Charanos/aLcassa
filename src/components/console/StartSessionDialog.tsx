'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { IconClock, IconHistory, IconPlayerPlay, IconShieldLock } from '@tabler/icons-react';
import { nextSupportReference } from '@/app/(platform)/platform/(console)/actions';
import { ConsoleDialog, DialogActions, DialogFact } from '@/components/primitives/ConsoleDialog';
import { REFERENCE_SEPARATOR } from '@/lib/console/references';
import type { ConsoleWorkspace } from './types';

/**
 * Enter a customer's workspace.
 *
 * ⚠ THIS DIALOG SET THE HOUSE STYLE AND NOW USES IT. Its eyebrow, its fact
 * list, its sunken footer — that vocabulary is `ConsoleDialog` now, extracted
 * so the four modals written after it stop being four approximations of this
 * one. Nothing here is lost; the padding, the borders and the footer are the
 * same rhythm, defined once.
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
 * ⚠ THE REFERENCE IS GENERATED, NOT INVENTED, AND NOT EDITABLE. It is numbered
 * from the platform log by `nextSupportReference` and rendered as fixed text
 * inside the reason field. It shares its grammar with the invoice numbers on
 * the billing tab — `TKT-260915-013` beside `INV-2609-2468` — because both
 * come from `lib/console/references.ts`.
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
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * ⚠ THE REFERENCE IS NOT IN THE FIELD'S VALUE ANY MORE, AND THAT WAS A BUG.
   *
   * It used to be prefilled as text — the reference, a separator, and the caret
   * parked after it. Which meant the operator could select it and delete it,
   * could type in front of it, and could backspace through it one character at
   * a time while trying to correct a typo; and the readiness check had to
   * string-replace the prefix back out of the value to find out whether
   * anything had actually been written. A value the product depends on and the
   * user can silently destroy is not a prefill, it is a trap.
   *
   * So the reference is a `<span>` inside the field's frame. It cannot be
   * edited because it is not editable — no `readOnly`, no `onKeyDown` guard, no
   * "put it back if they deleted it" repair pass. The input beside it holds
   * ONLY the operator's own words, and the two are joined once, on submit.
   *
   * Rejected: a separate read-only input above the reason, which spends a whole
   * field on a string nobody edits; and appending it server-side, which would
   * mean the operator cannot read — at the moment they confirm — the exact
   * sentence the customer is about to see in their own activity log, and that
   * sentence being legible before it is written is the point of the field.
   */
  useEffect(() => {
    let live = true;
    void nextSupportReference().then((ref) => {
      if (!live) return;
      setReference(ref);
      /* Focus once the reference has landed, so the field the operator starts
         typing into is the finished one. */
      requestAnimationFrame(() => inputRef.current?.focus());
    });
    return () => {
      live = false;
    };
  }, []);

  /* The reference is not a reason, and it can no longer masquerade as one:
     `reason` holds nothing but what was typed. Eight characters, which is the
     same floor the server enforces. */
  const ready = reason.trim().length >= 8;

  /** What the customer will read, assembled exactly as the field displays it. */
  const sentence = reference ? `${reference}${REFERENCE_SEPARATOR}${reason.trim()}` : reason.trim();

  function submit() {
    if (!ready || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await onConfirm(sentence);
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
            Numbered <em>{reference ?? 'from the platform log'}</em> — the day&rsquo;s queue
            position, taken from the log rather than typed, so the session joins to a ticket
            afterwards.
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

        {/*
          ⚠ THE FRAME IS THE CONTROL; THE INPUT INSIDE IT HAS NO BORDER.

          The reference has to sit INSIDE the field rather than beside it —
          `TKT-260915-013 · verifying a duplicated WhatsApp thread` is one
          sentence, and splitting it across two bordered boxes would say it is
          two facts. So the shell carries the border, the height, the radius
          and the focus ring, and the input is a transparent slot within it.

          The focus ring is tracked in state rather than done with
          `focus-within:` because the border colour also answers to `error`,
          and a Tailwind variant cannot express "blue unless red".
        */}
        <div
          className="flex w-full items-stretch overflow-hidden rounded-chip transition-shadow"
          style={{
            height: 38,
            border: `1px solid ${
              error ? 'var(--danger-fg)' : focused ? 'var(--blue-500)' : 'var(--border-strong)'
            }`,
            background: 'var(--surface-raised)',
            boxShadow: focused && !error ? 'var(--focus-ring)' : undefined,
          }}
        >
          {/*
            ⚠ A SPAN, WHICH IS WHY IT IS UNEDITABLE.

            `select-all` so one click copies the whole reference into a ticket
            system — the one thing an operator actually wants to do with it.
            `aria-hidden` would be wrong: a screen-reader user needs to hear
            the reference their session will be filed under, so it is labelled
            instead and read before the field it prefixes.
          */}
          <span
            role="note"
            aria-label={reference ? `Session reference ${reference}` : 'Session reference, loading'}
            className="numeric grid shrink-0 place-items-center border-r px-3 select-all"
            style={{
              borderColor: 'var(--border-subtle)',
              background: 'var(--surface-sunken)',
              color: reference ? 'var(--text-secondary)' : 'var(--text-disabled)',
              font: '500 var(--type-chip)/1 var(--font-mono)',
              letterSpacing: '0.02em',
            }}
          >
            {/* Same character count as the real thing, so the field does not
                resize under the cursor when it arrives. 03 §15. */}
            {reference ?? 'TKT-••••••-•••'}
          </span>

          <input
            ref={inputRef}
            type="text"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError(null);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !pending) submit();
            }}
            placeholder="verifying a duplicated WhatsApp thread"
            aria-invalid={error ? true : undefined}
            className="t-body min-w-0 flex-1 bg-transparent px-3 outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>

        <span
          className="t-caption mt-1.5 block min-h-[1.2em]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {ready
            ? 'Written to the customer’s log exactly as it reads here.'
            : 'Say what you are checking. "." satisfies a length test and tells the customer nothing.'}
        </span>
      </label>
    </ConsoleDialog>
  );
}
