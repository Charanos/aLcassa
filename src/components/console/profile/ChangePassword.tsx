'use client';

import { useId, useRef, useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconEye, IconEyeOff, IconKey, IconLoader2 } from '@tabler/icons-react';
import { changeConsolePassword } from '@/app/(platform)/platform/(console)/profile-actions';
import { useToast } from '@/components/primitives/Toast';
import { Hint } from '@/components/console/profile/shared';

const MIN = 12;

/**
 * Change your own password.
 *
 * ⚠ THIS CONTROL WAS DISABLED FOR A REASON THAT DID NOT SURVIVE BEING READ
 *   BACK. The old copy said password changes must go through email recovery,
 *   "because a console that could set a password for a signed-in session would
 *   be a way around that proof." Re-authentication IS the proof, and a stronger
 *   one — mailbox control is what an attacker acquires in order to RUN the
 *   recovery flow. See `profile-actions.ts` for the full correction.
 *
 * ⚠ THE DIALOG STATES WHAT ELSE HAPPENS, BECAUSE SOMETHING ELSE HAPPENS.
 *
 * A password change signs out every other device. That is correct — it is the
 * reason most people change a password — but it is not what the button says,
 * and a control that does two things while naming one is the same defect as a
 * control that does nothing while looking live. The consequence is on screen
 * before the submit is reachable, in the same voice the suspend dialog uses.
 */
export function ChangePassword() {
  const pushToast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  const ids = useId();
  const firstRef = useRef<HTMLInputElement>(null);

  /* The same three rules the action enforces, run here only to keep the submit
     honest about whether it can succeed. The action is the control; this saves
     a round trip and nothing more, so it must never be the only copy. */
  const tooShort = next.length > 0 && next.length < MIN;
  const mismatch = confirm.length > 0 && next !== confirm;
  const unchanged = next.length > 0 && next === current;
  const ready = current.length > 0 && next.length >= MIN && next === confirm && !unchanged;

  function reset() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setReveal(false);
    setError(null);
    setErrorField(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || pending) return;
    setError(null);
    setErrorField(null);

    startTransition(async () => {
      const result = await changeConsolePassword({
        currentPassword: current,
        password: next,
        passwordConfirm: confirm,
      });

      if (result.ok) {
        setOpen(false);
        reset();
        pushToast({
          tone: 'success',
          title: 'Password changed',
          description:
            result.signedOutDevices > 0
              ? `${result.signedOutDevices} other ${
                  result.signedOutDevices === 1 ? 'device was' : 'devices were'
                } signed out. This one stays.`
              : 'No other devices were signed in.',
        });
        return;
      }

      setError(result.error);
      setErrorField(result.field ?? null);
      if (result.field === 'currentPassword') firstRef.current?.focus();
    });
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(n) => {
        if (pending) return;
        setOpen(n);
        if (!n) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-[34px] shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-colors hover:bg-[var(--surface-inset)]"
          style={{
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
          }}
        >
          <IconKey size={15} stroke={1.5} aria-hidden />
          Change password
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[150]"
          style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(4px)' }}
        />
        {/* Centring lives on this wrapper, never on a transform. See the note
            in `ProvisionWorkspaceDialog` for the bug that rule comes from. */}
        <div className="pointer-events-none fixed inset-0 z-[150] grid place-items-center p-4">
          <Dialog.Content className="surface-glass-strong pointer-events-auto flex max-h-[88vh] w-full max-w-[480px] flex-col overflow-hidden rounded-3xl">
            <form onSubmit={submit} className="flex min-h-0 flex-col">
              <div className="px-7 pt-7 pb-4">
                <Dialog.Title
                  className="text-[19px] tracking-tight"
                  style={{ color: 'var(--text-primary)', fontWeight: 500 }}
                >
                  Change password
                </Dialog.Title>
                <Dialog.Description
                  className="mt-2 text-[13px] leading-relaxed"
                  style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
                >
                  Your current password proves this is you &mdash; which is a stronger check than an
                  emailed link, since a mailbox is the first thing an attacker takes.
                </Dialog.Description>
              </div>

              <div className="scrollbar-slim grid min-h-0 flex-1 gap-4 overflow-y-auto px-7 pb-2">
                <Field
                  id={`${ids}-current`}
                  label="Current password"
                  value={current}
                  onChange={setCurrent}
                  reveal={reveal}
                  invalid={errorField === 'currentPassword'}
                  inputRef={firstRef}
                  autoComplete="current-password"
                />

                <div className="grid gap-1.5">
                  <Field
                    id={`${ids}-next`}
                    label="New password"
                    value={next}
                    onChange={setNext}
                    reveal={reveal}
                    invalid={errorField === 'password' || tooShort || unchanged}
                    autoComplete="new-password"
                  />
                  {/* 02 §9: length over composition. Stated as the requirement
                      rather than as a scolding after the fact. */}
                  <Hint id={`${ids}-rule`}>
                    {unchanged
                      ? 'That is the password you already have.'
                      : tooShort
                        ? `${MIN - next.length} more ${MIN - next.length === 1 ? 'character' : 'characters'} to go.`
                        : `At least ${MIN} characters. A passphrase you can remember beats a short one you write down.`}
                  </Hint>
                </div>

                <div className="grid gap-1.5">
                  <Field
                    id={`${ids}-confirm`}
                    label="Confirm new password"
                    value={confirm}
                    onChange={setConfirm}
                    reveal={reveal}
                    invalid={errorField === 'passwordConfirm' || mismatch}
                    autoComplete="new-password"
                  />
                  {mismatch ? <Hint id={`${ids}-match`}>Both entries must match.</Hint> : null}
                </div>

                <button
                  type="button"
                  onClick={() => setReveal((r) => !r)}
                  className="justify-self-start inline-flex items-center gap-1.5 rounded-md py-1 text-[12.5px] transition-colors"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {reveal ? (
                    <IconEyeOff size={14} stroke={1.5} aria-hidden />
                  ) : (
                    <IconEye size={14} stroke={1.5} aria-hidden />
                  )}
                  {reveal ? 'Hide passwords' : 'Show passwords'}
                </button>

                {/*
                  The second thing this does, said before the submit is pressed
                  rather than discovered afterwards on another machine.
                */}
                <p
                  className="rounded-panel px-3.5 py-3 text-[12.5px] leading-relaxed"
                  style={{
                    background: 'var(--surface-sunken)',
                    color: 'var(--text-tertiary)',
                    textWrap: 'pretty',
                  }}
                >
                  Every other signed-in device is signed out when this saves. This one stays, so you
                  will not be dropped mid-task.
                </p>

                {error ? (
                  <p
                    role="alert"
                    className="rounded-panel px-3.5 py-3 text-[13px] leading-relaxed"
                    style={{
                      background: 'var(--badge-danger-bg)',
                      border: '1px solid var(--badge-danger-edge)',
                      color: 'var(--danger-fg)',
                      textWrap: 'pretty',
                    }}
                  >
                    {error}
                  </p>
                ) : null}
              </div>

              <div
                className="mt-4 flex items-center justify-end gap-2 px-7 py-5"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <Dialog.Close asChild>
                  <button
                    type="button"
                    disabled={pending}
                    className="h-[34px] rounded-lg px-4 text-[13px] font-medium transition-colors hover:bg-[var(--surface-inset)]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={!ready || pending}
                  className="inline-flex h-[34px] items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-all"
                  style={{
                    background: ready && !pending ? 'var(--blue-500)' : 'var(--surface-sunken)',
                    color:
                      ready && !pending ? 'var(--text-inverse)' : 'var(--text-disabled)',
                    cursor: ready && !pending ? 'pointer' : 'not-allowed',
                    boxShadow: ready && !pending ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {pending ? (
                    <>
                      <IconLoader2 size={15} stroke={1.5} className="animate-spin" aria-hidden />
                      Saving
                    </>
                  ) : (
                    'Change password'
                  )}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  reveal,
  invalid,
  inputRef,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  reveal: boolean;
  invalid?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoComplete: string;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="t-label" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        ref={inputRef}
        id={id}
        type={reveal ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className="h-[38px] w-full rounded-chip px-3 outline-none transition-colors focus:border-[var(--blue-500)]"
        style={{
          border: `1px solid ${invalid ? 'var(--danger-fg)' : 'var(--border-strong)'}`,
          background: 'var(--surface-raised)',
          boxShadow: 'var(--neu-inset)',
          color: 'var(--text-primary)',
          font: '400 var(--text-base)/1 var(--font-ui)',
        }}
      />
    </div>
  );
}
