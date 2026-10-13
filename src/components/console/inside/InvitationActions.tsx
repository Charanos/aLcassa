'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IconHistory, IconMailForward, IconX } from '@tabler/icons-react';
import { ConsoleDialog, DialogActions, DialogFact } from '@/components/primitives/ConsoleDialog';
import { useToast } from '@/components/primitives/Toast';
import { runConsoleMutation } from '@/lib/console/mutation';
import {
  resendInvitationInside,
  revokeInvitationInside,
} from '@/app/(platform)/platform/(console)/inside-actions';

/** Confirms invitation changes under the current support grant and attributes them to the customer activity log. */
export function InvitationActions({
  id,
  email,
  tenantName,
}: {
  id: string;
  email: string;
  tenantName: string;
}) {
  const router = useRouter();
  const pushToast = useToast();
  const [intent, setIntent] = useState<'resend' | 'revoke' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    if (!intent) return;
    setError(null);
    startTransition(async () => {
      const result = await runConsoleMutation(
        () => (intent === 'resend' ? resendInvitationInside(id) : revokeInvitationInside(id)),
        'Invitation update',
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIntent(null);
      pushToast({
        tone: 'success',
        title: intent === 'resend' ? 'Resent' : 'Revoked',
        description: result.message,
      });
      router.refresh();
    });
  }

  return (
    <span className="flex shrink-0 gap-1.5">
      <button
        type="button"
        onClick={() => setIntent('resend')}
        className="t-caption inline-flex h-8 items-center gap-1.5 rounded-panel px-2.5 transition-colors hover:bg-[var(--surface-inset)]"
        style={{ border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
      >
        <IconMailForward size={14} stroke={1.5} aria-hidden />
        Resend
      </button>
      <button
        type="button"
        onClick={() => setIntent('revoke')}
        className="t-caption inline-flex h-8 items-center gap-1.5 rounded-panel px-2.5 transition-colors hover:bg-[var(--surface-inset)]"
        style={{ border: '1px solid var(--border-strong)', color: 'var(--danger-fg)' }}
      >
        <IconX size={14} stroke={1.5} aria-hidden />
        Revoke
      </button>

      <ConsoleDialog
        open={intent !== null}
        onOpenChange={(n) => {
          if (!n && !pending) setIntent(null);
        }}
        dismissible={!pending}
        eyebrow={`Inside ${tenantName}`}
        title={
          intent === 'resend'
            ? `Resend the invitation to ${email}?`
            : `Revoke the invitation to ${email}?`
        }
        operation={intent === 'resend' ? 'invitation.resent' : 'invitation.revoked'}
        description={
          intent === 'resend'
            ? 'Creates a new link and attempts email delivery. The previous link stops working.'
            : 'The link stops working. They can be invited again later.'
        }
        facts={
          <DialogFact icon={IconHistory}>
            Recorded in <em>{tenantName}</em>&rsquo;s activity log as a support action, under your
            name.
          </DialogFact>
        }
        error={error}
        actions={
          <DialogActions
            confirmLabel={intent === 'resend' ? 'Resend' : 'Revoke'}
            onConfirm={run}
            loading={pending}
            tone={intent === 'revoke' ? 'destructive' : 'primary'}
          />
        }
      />
    </span>
  );
}
