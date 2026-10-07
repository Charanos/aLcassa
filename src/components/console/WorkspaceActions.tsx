'use client';

import { useState, useTransition } from 'react';
import { IconCircleX, IconExternalLink, IconAlertTriangle } from '@tabler/icons-react';
import { StartSessionDialog } from './StartSessionDialog';
import { DestructiveConfirm } from '@/components/primitives/ConfirmDialog';
import {
  fetchSuspensionImpact,
  suspendWorkspace,
  type SuspensionImpact,
} from '@/app/(platform)/platform/(console)/actions';
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
 * who reads "are you sure?" has only clicked.
 *
 * ⚠ THE COUNTS ARE READ WHEN THE DIALOG OPENS, NOT WHEN THE PAGE RENDERED.
 *
 * They used to arrive as a prop with the page, which made the whole idea
 * weaker than it reads: a tab left open over lunch confirmed against figures
 * from before lunch. Worse, the prop could not carry the one number that
 * actually changes minute to minute — whether a colleague is INSIDE the
 * workspace on a support session right now. Suspending underneath them drops
 * what they were doing and tells neither of them why.
 *
 * So the dialog asks the server on open (`fetchSuspensionImpact` →
 * `previewSuspension`, audited), and the prop stays as the value shown while
 * that read is in flight. The confirm is reachable throughout: a slow or
 * failed preview must not block a suspension somebody needs to make, and the
 * dialog says plainly which figures it is showing.
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

  /**
   * `null` while the preview is in flight or has failed — the rendered figures
   * fall back to the props, and the dialog says so. A failed preview is a
   * degraded dialog, never a blocked one.
   */
  const [live, setLive] = useState<SuspensionImpact | null>(null);
  const [previewState, setPreviewState] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');

  function openSuspend() {
    setSuspendError(null);
    setSuspendOpen(true);
    setLive(null);
    setPreviewState('loading');
    void fetchSuspensionImpact(workspace.id).then((r) => {
      if (r.ok) {
        setLive(r.impact);
        setPreviewState('done');
      } else {
        setPreviewState('failed');
      }
    });
  }

  const staffCount = live?.activeMembers ?? impact.staff;
  const openSessions = live?.openSupportSessions ?? 0;

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
          onClick={openSuspend}
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
                description:
                  'Thirty minutes, in their activity log, and the owner is emailed. Open it from Support sessions.',
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
        consequence="Suspension pauses workspace access. Data is retained, and reactivation restores access."
        irreversible={false}
        details={
          <>
            {/*
              ⚠ THE OPEN-SESSION WARNING SITS ABOVE THE COUNTS, NOT AMONG THEM.

              Everything in the list below is a consequence the operator INTENDS
              — that is what suspending means. This one is not: it says somebody
              is inside the workspace at this moment and is about to be cut off
              mid-task, which is a reason to wait ninety seconds rather than a
              cost of proceeding. Buried as a fourth bullet it reads as more of
              the same and gets skimmed with the rest.
            */}
            {openSessions > 0 ? (
              <div
                className="mt-4 flex items-start gap-3 rounded-panel px-3.5 py-3"
                style={{
                  background: 'var(--badge-warning-bg)',
                  border: '1px solid var(--badge-warning-edge)',
                }}
              >
                <IconAlertTriangle
                  size={16}
                  stroke={1.5}
                  style={{ color: 'var(--warning-fg)', marginTop: '1px', flexShrink: 0 }}
                  aria-hidden
                />
                <p className="t-compact" style={{ color: 'var(--text-primary)' }}>
                  {openSessions === 1
                    ? 'A support session is open inside this workspace right now.'
                    : `${openSessions} support sessions are open inside this workspace right now.`}{' '}
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Whoever is in there loses their session the moment this lands, mid-task and
                    without being told why. Ending it first costs a minute.
                  </span>
                </p>
              </div>
            ) : null}

            <ul
              className="grid list-none gap-2.5 border-t p-0 pt-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <Impact n={staffCount}>
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
              {/*
                ⚠ THE DIALOG SAYS WHICH FIGURES IT IS SHOWING.

                A confirmation built on counts has to be honest about where they
                came from, or the idea eats itself: an operator who learns once
                that the numbers can be stale stops reading them, and then the
                gate is "are you sure?" wearing a list.
              */}
              <li
                className="t-caption mt-0.5"
                style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
              >
                {previewState === 'loading'
                  ? 'Checking these against the database…'
                  : previewState === 'failed'
                    ? 'These are the figures from when this page loaded — the live check did not come back. Reload before relying on them.'
                    : 'Read from the database just now.'}
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
                  font: '400 var(--type-compact)/1.5 var(--font-ui)',
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
