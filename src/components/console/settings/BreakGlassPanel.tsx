'use client';

import { runConsoleMutation } from '@/lib/console/mutation';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconLock, IconLockOpen } from '@tabler/icons-react';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { useToast } from '@/components/primitives/Toast';
import { toggleBreakGlass } from '@/app/(platform)/platform/(console)/actions';

/**
 * The break-glass panel.
 *
 * ⚠ THE ONLY DESTRUCTIVE ACTION ON THIS SCREEN GETS A CONFIRMATION THE
 * DESIGN DID NOT DRAW. `Settings.dc.html` wires the button directly with no
 * dialog. Locking every platform admin out of every workspace — including the
 * owner, mid-support-session — is the highest-blast-radius action in the
 * console, one tier above suspend (C8) because it has no per-workspace scope
 * at all. It gets the same discipline: a dialog that states the consequence
 * before it lands, matching the pattern already set for suspend and the plan
 * blast radius. Reversible by a second admin is why it stops at a plain
 * confirm rather than suspend's type-to-confirm gate.
 */
export function BreakGlassPanel({
  initialActive,
  lockedBy,
  lockedAt,
  lockedReason,
}: {
  initialActive: boolean;
  lockedBy?: string | null;
  lockedAt?: string | null;
  lockedReason?: string | null;
}) {
  const pushToast = useToast();
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await runConsoleMutation(
        () => toggleBreakGlass({ lock: !active, reason }),
        'Support access update',
      );
      if (result.ok) {
        setActive(result.locked);
        /* The strip at the top of the page, and who/when/why under the
           button, are read on the server. */
        router.refresh();
        setConfirmOpen(false);
        setReason('');
        /*
          ⚠ THE TOAST REPORTS THE SIDE EFFECT, WHICH IS THE POINT OF THE
          CONTROL. Engaging the lock revokes every open support session — a
          colleague may have been inside a workspace a second ago — and a
          confirmation that says only "locked" hides the thing the operator
          most needs to know they just did.
        */
        pushToast({
          tone: result.locked ? 'attention' : 'success',
          title: result.locked
            ? 'Support access locked platform-wide'
            : 'Support access re-enabled',
          description: result.locked
            ? result.revoked > 0
              ? `${result.revoked} open ${result.revoked === 1 ? 'session was' : 'sessions were'} ended immediately.`
              : 'No sessions were open. New ones are refused until this is released.'
            : 'Support sessions can be opened again, with the usual reason and 30-minute cap.',
        });
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section
      className="overflow-hidden rounded-overlay"
      style={{
        border: '1px solid var(--border-subtle)',
        background: 'var(--surface-raised)',
        boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
      }}
    >
      <div
        className="flex items-center gap-3 px-5 pt-5 sm:px-6"
        style={{
          color: 'var(--text-primary)',
        }}
      >
        <span
          className="grid size-10 place-items-center rounded-panel"
          style={{
            background: active ? 'var(--warning-bg)' : 'var(--surface-sunken)',
            color: active ? 'var(--warning-fg)' : 'var(--text-secondary)',
          }}
        >
          {active ? (
            <IconLock size={20} stroke={1.5} aria-hidden />
          ) : (
            <IconLockOpen size={20} stroke={1.5} aria-hidden />
          )}
        </span>
        <div>
          <h3 className="text-md font-medium">Emergency support lock</h3>
          <p className="t-caption mt-1" style={{ color: 'var(--text-secondary)' }}>
            {active ? 'Support access is locked' : 'Support access is available'}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-5 px-5 py-5 sm:flex-row sm:items-start sm:px-6">
        <span className="min-w-0 flex-1">
          <p className="t-compact" style={{ color: 'var(--text-primary)' }}>
            {active
              ? 'Support-session access is suspended platform-wide'
              : 'Pause operator access to every workspace'}
          </p>
          <p
            className="t-caption mt-1.5"
            style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
          >
            {active
              ? 'No admin, including you, can open a workspace until this is released.'
              : 'Blocks every platform admin from entering any workspace, and ends any session already open. Use during a suspected credential compromise. Customers see it in their own activity log.'}
          </p>
          {/*
            ⚠ WHO, WHEN AND WHY — WHICH THE OLD PANEL COULD NOT SHOW.

            It rendered a boolean and nothing else, because a boolean was all
            it had. The lock is now the latest audit event rather than a flag,
            so the record and the state are the same row and this comes for
            free: an operator arriving at a locked platform can see whose
            decision it was and what it was about, rather than having to go and
            search the log to find out whether it is safe to release.
          */}
          {active && lockedAt ? (
            <p
              className="t-caption mt-2 rounded-panel px-3 py-2"
              style={{
                background: 'var(--surface-sunken)',
                color: 'var(--text-tertiary)',
                textWrap: 'pretty',
              }}
            >
              Locked by {lockedBy ?? 'a platform admin'} · {lockedAt}
              {lockedReason ? (
                <>
                  <br />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    &ldquo;{lockedReason}&rdquo;
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </span>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="t-compact h-11 shrink-0 rounded-panel px-4 whitespace-nowrap transition-colors"
          style={{
            border: `1px solid ${active ? 'var(--border-strong)' : 'var(--danger-fg)'}`,
            background: 'var(--surface-raised)',
            color: active ? 'var(--text-primary)' : 'var(--danger-fg)',
            fontWeight: 500,
          }}
        >
          {active ? 'Restore support access' : 'Lock support access'}
        </button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!pending) {
            setConfirmOpen(next);
            if (!next) setError(null);
          }
        }}
        title={
          active ? 'Re-enable support-session access?' : 'Lock every admin out of every workspace?'
        }
        consequence={
          active
            ? 'Platform admins will be able to open support sessions again, subject to the usual reason and 30-minute cap.'
            : 'This ends any open support session immediately and blocks new ones, for every admin, including you. It does not affect customer sign-ins.'
        }
        details={
          <div
            className="grid gap-1.5 border-t pt-4"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {/*
              ⚠ REQUIRED IN BOTH DIRECTIONS, AND THE RELEASE IS THE ONE PEOPLE
              SKIP. "We locked support at 14:02" with no matching account of
              why it was safe to reopen at 15:40 is half a record, and the
              missing half is the half a security review asks about.
            */}
            <label
              htmlFor="break-glass-reason"
              className="t-label"
              style={{ color: 'var(--text-secondary)' }}
            >
              {active ? 'Why it is safe to reopen' : 'What happened'} &middot; goes in the platform
              log
            </label>
            <textarea
              id="break-glass-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={
                active
                  ? 'Credential rotated and the compromised session confirmed closed.'
                  : 'Possible credential compromise on the support account; rotating now.'
              }
              className="rounded-panel border px-3 py-2"
              style={{
                borderColor: 'var(--border-subtle)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
                font: '400 var(--type-compact)/1.5 var(--font-ui)',
              }}
            />
          </div>
        }
        confirmLabel={active ? 'Restore support access' : 'Lock support access'}
        tone={active ? 'primary' : 'destructive'}
        loading={pending}
        error={error}
        onConfirm={() => {
          /* The server enforces the minimum too; this keeps the button honest
             about whether pressing it can succeed. */
          if (reason.trim().length >= 8) submit();
          else setError(active ? 'Say why it is safe to reopen.' : 'Say what happened.');
        }}
      />
    </section>
  );
}
