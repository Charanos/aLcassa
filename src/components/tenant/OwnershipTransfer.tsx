'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconArrowsExchange, IconShieldCheck, IconAlertTriangle } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';
import { PasswordField } from '@/components/primitives/Field';
import type { Member } from '@/lib/tenant/data';
import { requestOwnershipTransfer, type OwnershipOutcome } from '@/lib/tenant/ownershipTransfer';

/** Ownership is reviewed separately from routine role changes and never retried after an uncertain write. */
export function OwnershipTransfer({
  members,
  disabled,
  onTransferred,
  onUnconfirmed,
  returnFocusRef,
}: {
  members: Member[];
  disabled: boolean;
  onTransferred: (member: Member) => void;
  onUnconfirmed: () => void;
  returnFocusRef: RefObject<HTMLElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [outcome, setOutcome] = useState<OwnershipOutcome | null>(null);
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const confirmed = useRef(false);
  const password = useRef<HTMLInputElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const radioName = useId();
  const candidates = members.filter(
    (member) => member.role !== 'owner' && member.status === 'active',
  );
  const successor = candidates.find((member) => member.id === memberId);
  const blocked =
    outcome?.kind === 'unconfirmed' || (outcome?.kind === 'refused' && outcome.reloadRequired);

  useEffect(() => {
    if (!pending && outcome?.kind === 'refused' && outcome.passwordError) password.current?.focus();
  }, [pending, outcome]);

  function changeOpen(next: boolean) {
    if (submitting.current) return;
    if (password.current) password.current.value = '';
    setOpen(next);
    if (next) {
      setMemberId('');
      setOutcome(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!successor || blocked || submitting.current || !password.current?.value) return;
    submitting.current = true;
    setPending(true);
    setOutcome(null);
    try {
      const response = requestOwnershipTransfer(successor.id, password.current.value);
      password.current.value = '';
      const result = await response;
      if (password.current) password.current.value = '';
      setOutcome(result);
      if (result.kind === 'confirmed') {
        confirmed.current = true;
        onTransferred(successor);
        setOpen(false);
      } else if (result.kind === 'unconfirmed' || result.reloadRequired) {
        onUnconfirmed();
      }
    } finally {
      if (password.current) password.current.value = '';
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="ownership-title" className="grid gap-4">
      <div>
        <h2 id="ownership-title" className="t-heading">
          Workspace ownership
        </h2>
        <p className="t-compact mt-2 text-[var(--text-secondary)]">
          One owner holds final responsibility for this workspace.
        </p>
      </div>
      <div className="surface-sunken flex flex-wrap items-center gap-5 rounded-panel border border-[var(--border-subtle)] p-5 md:p-6">
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] text-[var(--text-secondary)]"
        >
          <IconShieldCheck size={23} stroke={1.4} />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <p className="t-body">Pass ownership to a teammate</p>
          <p className="t-compact mt-1 text-[var(--text-secondary)]">
            They become the owner. You remain an administrator, and only the new owner can transfer
            it back.
          </p>
          {!candidates.length ? (
            <p className="t-caption mt-2 text-[var(--text-tertiary)]">
              Invite a teammate first. They must join before you can choose them.
            </p>
          ) : null}
        </div>
        <Dialog.Root open={open} onOpenChange={changeOpen}>
          <Dialog.Trigger asChild>
            <Button variant="secondary" disabled={disabled || !candidates.length}>
              <IconArrowsExchange size={16} stroke={1.5} aria-hidden /> Transfer ownership
            </Button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="console-modal-backdrop fixed inset-0 z-[150]" />
            <Dialog.Content
              onCloseAutoFocus={(event) => {
                if (confirmed.current && returnFocusRef.current) {
                  event.preventDefault();
                  returnFocusRef.current.focus();
                }
              }}
              onOpenAutoFocus={(event) => {
                event.preventDefault();
                cancel.current?.focus();
              }}
              onEscapeKeyDown={(event) => {
                if (submitting.current) event.preventDefault();
              }}
              onPointerDownOutside={(event) => {
                if (submitting.current) event.preventDefault();
              }}
              className="fixed top-1/2 left-1/2 z-[150] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-overlay border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-overlay)] sm:p-7"
            >
              <Dialog.Title className="t-panel">Transfer workspace ownership</Dialog.Title>
              <Dialog.Description className="t-compact mt-2 text-[var(--text-secondary)]">
                Choose an active teammate to become the owner. You will remain an administrator.
              </Dialog.Description>
              <form
                onSubmit={(event) => {
                  void submit(event);
                }}
                className="mt-5 grid gap-5"
                aria-busy={pending}
              >
                <fieldset disabled={pending || blocked} className="min-w-0">
                  <legend className="t-label mb-2 text-[var(--text-secondary)]">New owner</legend>
                  <div className="surface-sunken max-h-52 overflow-y-auto rounded-panel border border-[var(--border-subtle)] px-3">
                    {candidates.map((member) => (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-3 border-t border-[var(--border-subtle)] py-3 first:border-t-0"
                      >
                        <input
                          type="radio"
                          name={radioName}
                          value={member.id}
                          checked={memberId === member.id}
                          onChange={() => {
                            setMemberId(member.id);
                            setOutcome(null);
                          }}
                          className="size-4 shrink-0 accent-[var(--blue-500)]"
                          required
                        />
                        <span className="min-w-0 flex-1">
                          <span className="t-body block break-words">{member.name}</span>
                          <span className="t-caption mt-0.5 block break-all text-[var(--text-secondary)]">
                            {member.email || 'Email unavailable'}
                          </span>
                        </span>
                        <span className="t-caption text-[var(--text-tertiary)]">
                          {member.role === 'admin' ? 'Administrator' : 'Agent'}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                {successor ? (
                  <p className="t-compact text-[var(--text-secondary)]">
                    <strong className="font-medium text-[var(--text-primary)]">
                      {successor.name}
                    </strong>{' '}
                    will control ownership and your workspace role. Your sign-in stays active.
                  </p>
                ) : null}
                <PasswordField
                  ref={password}
                  label="Your current password"
                  name="password"
                  autoComplete="current-password"
                  required
                  disabled={pending || blocked}
                  helper="Confirms this request belongs to you."
                  error={
                    outcome?.kind === 'refused' && outcome.passwordError
                      ? outcome.message
                      : undefined
                  }
                />
                {outcome?.kind === 'refused' && !outcome.passwordError ? (
                  <p role="alert" className="t-compact text-[var(--red-500)]">
                    {outcome.message}
                  </p>
                ) : null}
                {outcome?.kind === 'unconfirmed' ? (
                  <div
                    role="alert"
                    className="surface-sunken grid gap-2 rounded-panel border border-[var(--border-subtle)] p-4"
                  >
                    <p className="t-label flex items-center gap-2">
                      <IconAlertTriangle size={17} aria-hidden /> Check the current owner
                    </p>
                    <p className="t-compact text-[var(--text-secondary)]">
                      The response could not be confirmed. Reload the team and check Activity before
                      trying again; the transfer may already have completed.
                    </p>
                    <p className="t-caption break-all text-[var(--text-tertiary)]">
                      Reference: {outcome.requestId}
                    </p>
                  </div>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2.5 border-t border-[var(--border-subtle)] pt-4">
                  <Dialog.Close asChild>
                    <Button ref={cancel} type="button" variant="secondary" disabled={pending}>
                      {blocked ? 'Close review' : 'Cancel'}
                    </Button>
                  </Dialog.Close>
                  {blocked ? (
                    <Button type="button" onClick={() => location.reload()}>
                      Reload team
                    </Button>
                  ) : (
                    <Button type="submit" disabled={!successor || pending} loading={pending}>
                      Transfer ownership
                    </Button>
                  )}
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </section>
  );
}
