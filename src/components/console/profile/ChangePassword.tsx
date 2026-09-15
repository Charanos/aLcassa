'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { IconEye, IconEyeOff, IconKey, IconLogout, IconShieldCheck } from '@tabler/icons-react';
import { changeConsolePassword } from '@/app/(platform)/platform/(console)/profile-actions';
import { ConsoleDialog, DialogActions, DialogFact } from '@/components/primitives/ConsoleDialog';
import { useToast } from '@/components/primitives/Toast';

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
 * ⚠ THE CONSEQUENCE IS A FACT IN THE HEAD, NOT A NOTE BURIED IN THE FORM.
 *
 * A password change signs out every other device. That is correct — it is the
 * reason most people change a password — but it is not what the button says,
 * and a control that does two things while naming one is the same defect as a
 * control that does nothing while looking live. `ConsoleDialog`'s fact list is
 * where the support-session dialog puts exactly this kind of clause, and it
 * sits above the fold rather than under the third field.
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

  function submit() {
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
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="inline-flex h-[34px] shrink-0 items-center justify-center gap-2 rounded-panel px-4 transition-colors hover:bg-[var(--surface-inset)]"
        style={{
          border: '1px solid var(--border-strong)',
          background: 'var(--surface-raised)',
          color: 'var(--text-primary)',
          font: '500 var(--text-sm)/1 var(--font-ui)',
        }}
      >
        <IconKey size={15} stroke={1.5} aria-hidden />
        Change password
      </button>

      <ConsoleDialog
        open={open}
        onOpenChange={(n) => {
          setOpen(n);
          if (!n) reset();
        }}
        dismissible={!pending}
        eyebrow="Account security"
        title="Change your password"
        width="md"
        operation="password.changed"
        description="Your current password proves this is you — a stronger check than an emailed link, since a mailbox is the first thing an attacker takes."
        facts={
          <>
            <DialogFact icon={IconShieldCheck}>
              At least <em>{MIN} characters</em>. A passphrase you can remember beats a short one
              you write down.
            </DialogFact>
            <DialogFact icon={IconLogout}>
              Every <em>other</em> signed-in device is signed out when this saves. This one stays,
              so you will not be dropped mid-task.
            </DialogFact>
          </>
        }
        error={error}
        actions={
          <DialogActions
            confirmLabel="Change password"
            confirmIcon={IconKey}
            onConfirm={submit}
            disabled={!ready}
            loading={pending}
          />
        }
      >
        <div className="grid gap-4">
          <Field
            id={`${ids}-current`}
            label="Current password"
            value={current}
            onChange={setCurrent}
            reveal={reveal}
            invalid={errorField === 'currentPassword'}
            inputRef={firstRef}
            autoComplete="current-password"
            onEnter={submit}
          />

          {/* The two new-password fields sit side by side: they are one
              decision entered twice, and stacking them made a 600px dialog
              scroll for three inputs. */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id={`${ids}-next`}
              label="New password"
              value={next}
              onChange={setNext}
              reveal={reveal}
              invalid={errorField === 'password' || tooShort || unchanged}
              autoComplete="new-password"
              onEnter={submit}
              hint={
                unchanged
                  ? 'That is the password you already have.'
                  : tooShort
                    ? `${MIN - next.length} more to go.`
                    : undefined
              }
            />
            <Field
              id={`${ids}-confirm`}
              label="Confirm new password"
              value={confirm}
              onChange={setConfirm}
              reveal={reveal}
              invalid={errorField === 'passwordConfirm' || mismatch}
              autoComplete="new-password"
              onEnter={submit}
              hint={mismatch ? 'Both entries must match.' : undefined}
            />
          </div>

          <button
            type="button"
            onClick={() => setReveal((r) => !r)}
            className="t-caption inline-flex w-fit items-center gap-1.5 rounded-md py-1 transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {reveal ? (
              <IconEyeOff size={14} stroke={1.5} aria-hidden />
            ) : (
              <IconEye size={14} stroke={1.5} aria-hidden />
            )}
            {reveal ? 'Hide passwords' : 'Show passwords'}
          </button>
        </div>
      </ConsoleDialog>
    </>
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
  hint,
  onEnter,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  reveal: boolean;
  invalid?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  autoComplete: string;
  hint?: string;
  onEnter?: () => void;
}) {
  return (
    <label className="block">
      <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      <input
        ref={inputRef}
        id={id}
        type={reveal ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter?.();
        }}
        className="t-body w-full rounded-chip px-3 transition-colors outline-none"
        style={{
          height: 38,
          border: `1px solid ${invalid ? 'var(--danger-fg)' : 'var(--border-strong)'}`,
          background: 'var(--surface-raised)',
          color: 'var(--text-primary)',
        }}
      />
      {/* The hint line is always in the layout, empty or not — a message that
          appears and pushes the field below it down is how a form flickers
          while somebody types into it. */}
      <span
        className="t-caption mt-1 block min-h-[1.2em]"
        style={{ color: invalid ? 'var(--danger-fg)' : 'var(--text-tertiary)' }}
      >
        {hint ?? ''}
      </span>
    </label>
  );
}
