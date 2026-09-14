'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconLogout } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { useToast } from '@/components/primitives/Toast';
import { AuditLine, AuditNote } from '@/components/console/profile/shared';
import {
  revokeConsoleSession,
  revokeOtherConsoleSessions,
} from '@/app/(platform)/platform/(console)/profile-actions';

/**
 * The two controls that can end a session, and the only client code in the
 * device list.
 *
 * ⚠ THE ROWS ARE SERVER COMPONENTS AND THESE BUTTONS ARE NOT. Same split as
 * the overview's `QueueAction`: a row's device string, address, badge and
 * timestamp render once and ship as HTML, and only the control crosses the
 * boundary — because only the control owns a dialog, a pending state and a
 * toast. Making the ROW a client component would push every session's markup
 * through serialisation to gain a button.
 *
 * ⚠ THE THREE OUTCOMES GO TO THREE DIFFERENT SURFACES.
 *
 *   WHILE IT RUNS — the button. A spinner where the reader is already looking.
 *   ON FAILURE    — inline, in the dialog, which stays open. A refusal reported
 *                   by a toast as the dialog closes takes the explanation away
 *                   from the thing that caused it.
 *   ON SUCCESS    — a toast, because the row they pressed has just been
 *                   revalidated out of existence. That is the asynchronous
 *                   outcome 03 §20 reserves toasts for, and it is the opposite
 *                   of the name form on this same page, where the reader is
 *                   still looking at the field. 18 §6.
 */

/** One device. */
export function EndSessionButton({
  sessionId,
  device,
  when,
  support,
  live,
}: {
  sessionId: string;
  device: string;
  when: string;
  support?: boolean;
  /** False on the preview path: the control is inert with a stated reason. */
  live: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await revokeConsoleSession(sessionId);
      if (result.ok) {
        setOpen(false);
        toast({
          tone: 'success',
          title: support ? 'Support session ended' : 'Session ended',
          description: `${device} is signed out. It takes effect on that device's next request.`,
        });
        router.refresh();
      } else {
        /* ⚠ INCLUDING "it had already ended". The action reports a zero-row
           revoke as a failure rather than a success, so a stale row cannot be
           pressed and quietly do nothing. The dialog stays open to say so, and
           the list behind it has already been revalidated. */
        setError(result.error);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        variant="quiet"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={pending || !live}
        title={live ? undefined : 'Sign in again to end a session.'}
        style={{ color: 'var(--danger-fg)' }}
      >
        End session
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          /* A dialog that closes mid-flight leaves the reader unable to see how
             the thing they started turned out. */
          if (pending) return;
          setOpen(next);
          if (!next) setError(null);
        }}
        title={support ? `End this support session?` : `Sign ${device} out?`}
        consequence={
          support
            ? 'The session closes on its next request, and the customer sees it end in their own activity log.'
            : `That device stops being signed in on its next request. Anyone using it will need your password and second factor to get back in.`
        }
        details={
          <AuditNote>
            <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
              {device} &middot; last active {when}. Recorded in the same transaction:
            </p>
            <ul className="mt-1.5 grid gap-1">
              <AuditLine>
                this platform&rsquo;s audit log, as a session revoked by the account holder
              </AuditLine>
              <AuditLine>
                the session row itself keeps the reason, so an expiry and a revocation are never
                confused later
              </AuditLine>
            </ul>
          </AuditNote>
        }
        confirmLabel="End session"
        tone="destructive"
        onConfirm={confirm}
        loading={pending}
        error={error}
      />
    </>
  );
}

/**
 * Every device except this one.
 *
 * ⚠ "OTHER DEVICES", NOT "EVERYWHERE", AND THE DISTINCTION IS THE DESIGN. A
 * control that also signs YOU out is one nobody presses in the situation it
 * exists for — the suspicion that something else is signed in — because
 * pressing it costs them their own session at the moment they most want to
 * keep looking.
 */
export function RevokeOthersButton({ others, live }: { others: number; live: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await revokeOtherConsoleSessions();
      if (result.ok) {
        setOpen(false);
        toast({
          tone: 'success',
          title: result.ended === 0 ? 'Nothing else was signed in' : 'Other devices signed out',
          description:
            result.ended === 0
              ? 'This is the only session on your account.'
              : `${result.ended} ${result.ended === 1 ? 'session' : 'sessions'} ended. This device is still signed in.`,
        });
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        disabled={pending || others === 0 || !live}
        icon={<IconLogout aria-hidden />}
        /* ⚠ THE REASON, NOT JUST THE DISABLING. 17 §6.4 applies to a control
           that is temporarily dead as much as to one that is permanently dead —
           and here the reason is also the reassurance. */
        title={
          !live
            ? 'Sign in again to end other sessions.'
            : others === 0
              ? 'Nothing else is signed in to this account.'
              : `Ends ${others} other ${others === 1 ? 'session' : 'sessions'}.`
        }
      >
        Sign out other devices
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) setError(null);
        }}
        title={`Sign out ${others} other ${others === 1 ? 'device' : 'devices'}?`}
        consequence="Every session except this one ends on its next request. You stay signed in here."
        details={
          <AuditNote>
            <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
              Recorded in the same transaction:
            </p>
            <ul className="mt-1.5 grid gap-1">
              <AuditLine>
                one entry in this platform&rsquo;s audit log, carrying how many were ended
              </AuditLine>
              <AuditLine>
                any support session in the list ends too, and the customer sees that in their own
                activity log
              </AuditLine>
            </ul>
          </AuditNote>
        }
        confirmLabel="Sign them out"
        tone="destructive"
        onConfirm={confirm}
        loading={pending}
        error={error}
      />
    </>
  );
}
