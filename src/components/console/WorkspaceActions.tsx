'use client';

import { useState, useTransition } from 'react';
import { IconCircleX, IconExternalLink } from '@tabler/icons-react';
import { StartSessionDialog } from './StartSessionDialog';
import { DestructiveConfirm } from '@/components/primitives/ConfirmDialog';
import { suspendWorkspace } from '@/app/(platform)/platform/(console)/actions';
import { useToast } from '@/components/primitives/Toast';
import type { ConsoleWorkspace } from './types';

/**
 * The two destructive controls on a workspace: open a support session, and
 * suspend.
 *
 * ⚠ THE SUSPEND DIALOG STATES ITS CONSEQUENCES IN PEOPLE.
 *
 * This is the best idea in the whole design set and it is worth naming. The
 * default confirm dialog asks "are you sure?", which is a question about the
 * operator's confidence and tells them nothing they did not already know. This
 * one answers a different question — what will happen — in three counts:
 *
 *     247   staff lose access at their next request
 *   1,284   open conversations stop receiving replies
 *       4   channels go quiet, including the WhatsApp number
 *
 * An operator who reads that and proceeds has genuinely decided. An operator
 * who reads "are you sure?" has only clicked. The counts come from the read
 * model rather than the component, so they cannot drift into being wrong.
 *
 * Type-to-confirm on the slug is the second gate. It exists because suspend
 * sits next to "Support session" in the header, and the cost of a misclick is
 * measured in the numbers above.
 */
export function WorkspaceActions({
  workspace,
  impact,
  onStartSession,
}: {
  workspace: ConsoleWorkspace;
  impact: { staff: number; conversations: number; channels: number };
  onStartSession: (input: {
    tenantId: string;
    tenantName: string;
    reason: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const pushToast = useToast();
  const [sessionOpen, setSessionOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [suspendError, setSuspendError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  function submitSuspend(typed: string) {
    setSuspendError(null);
    startTransition(async () => {
      const result = await suspendWorkspace({
        tenantId: workspace.id,
        slug: workspace.slug,
        confirmSlug: typed,
        reason,
      });
      if (result.ok) {
        setSuspendOpen(false);
        setReason('');
        pushToast({
          tone: 'success',
          title: `${workspace.name} is suspended`,
          description: 'Their team keeps read access and can still fix the cause.',
        });
      } else {
        setSuspendError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setSessionOpen(true)}
          className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
          style={{
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
          }}
        >
          <IconExternalLink size={15} stroke={1.5} aria-hidden />
          Support session
        </button>
        <button
          type="button"
          onClick={() => {
            setSuspendError(null);
            setSuspendOpen(true);
          }}
          className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
          style={{
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-raised)',
            color: 'var(--danger-fg)',
          }}
        >
          <IconCircleX size={15} stroke={1.5} aria-hidden />
          Suspend
        </button>
      </div>

      {sessionOpen ? (
        <StartSessionDialog
          workspace={workspace}
          onCancel={() => setSessionOpen(false)}
          onConfirm={async (reason) => {
            const result = await onStartSession({
              tenantId: workspace.id,
              tenantName: workspace.name,
              reason,
            });
            if (result.ok) {
              setSessionOpen(false);
              pushToast({
                title: `Support session started in ${workspace.name}`,
                description: 'Read-only, expires in 30 minutes.',
                tone: 'success',
              });
            }
            return result;
          }}
        />
      ) : null}

      <DestructiveConfirm
        open={suspendOpen}
        onOpenChange={(next) => {
          if (!pending) setSuspendOpen(next);
        }}
        title={`Suspend ${workspace.name}`}
        consequence="Stated in numbers, because a suspension is felt by people who did not choose it."
        details={
          <>
            <ul
              className="grid list-none gap-2.5 border-t p-0 pt-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <Impact n={impact.staff}>
                staff lose access at their next request. Sessions are not waited out.
              </Impact>
              <Impact n={impact.conversations}>
                open conversations stop receiving replies. Inbound messages queue but nothing sends.
              </Impact>
              <Impact n={impact.channels}>
                connected channels go quiet, including the WhatsApp number their customers reply to.
              </Impact>
              <li className="t-compact mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                Data is retained. Reactivation restores access immediately and is a single action.
              </li>
            </ul>

            <div
              className="grid gap-1.5 border-t pt-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/*
                ⚠ REQUIRED, AND THE CUSTOMER READS IT.

                09 §7: suspension lands in the tenant's own activity log. A
                customer whose writes start failing with no explanation cannot
                tell a billing decision from an outage, so the sentence written
                here is the one that tells them which. The server requires it
                too — a check living only in this dialog is one that a direct
                call to the Server Action skips entirely.
              */}
              <label
                htmlFor="suspend-reason"
                className="t-label"
                style={{ color: 'var(--text-secondary)' }}
              >
                Reason · the customer sees this
              </label>
              <textarea
                id="suspend-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Payment overdue since 12 August; invoices sent 1 and 8 August."
                className="rounded-panel border px-3 py-2"
                style={{
                  borderColor: 'var(--border-subtle)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                  font: '400 var(--text-sm)/1.5 var(--font-ui)',
                }}
              />
            </div>
          </>
        }
        confirmValue={workspace.slug}
        confirmFieldLabel={`Type "${workspace.slug}" to confirm`}
        confirmLabel="Suspend workspace"
        loading={pending}
        error={suspendError}
        onConfirm={submitSuspend}
      />
    </>
  );
}

function Impact({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="t-compact flex items-start gap-3" style={{ color: 'var(--text-primary)' }}>
      <span
        className="numeric shrink-0 text-right"
        style={{ color: 'var(--danger-fg)', minWidth: '5ch' }}
      >
        {n.toLocaleString('en-GB')}
      </span>
      <span>{children}</span>
    </li>
  );
}
