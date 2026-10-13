'use client';

import { useId, useRef, useState, useTransition } from 'react';
import { IconCircleX, IconRefresh } from '@tabler/icons-react';
import {
  fetchSuspensionImpact,
  suspendWorkspace,
  type SuspensionImpact,
} from '@/app/(platform)/platform/(console)/actions';
import { DestructiveConfirm } from '@/components/primitives/ConfirmDialog';
import { useToast } from '@/components/primitives/Toast';
import type { WorkspaceStatus } from '@/lib/console/data';

/** Both workspace entry points use the same confirmed, audited status change. */
export function WorkspaceStatusControl({
  workspace,
  status,
  onChanged,
  onReviewOpenChange,
}: {
  workspace: { id: string; name: string; slug: string };
  status: WorkspaceStatus;
  onChanged?: () => void;
  onReviewOpenChange?: (open: boolean) => void;
}) {
  const pushToast = useToast();
  const trigger = useRef<HTMLButtonElement>(null);
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [impact, setImpact] = useState<SuspensionImpact | null>(null);
  const [preview, setPreview] = useState<'loading' | 'done' | 'failed'>('loading');
  const reactivate = status === 'suspended';
  const verb = reactivate ? 'Reactivate' : 'Suspend';

  function show() {
    setReason('');
    setError(null);
    setImpact(null);
    setPreview('loading');
    setOpen(true);
    onReviewOpenChange?.(true);
    void fetchSuspensionImpact(workspace.id)
      .then((result) => {
        if (result.ok) {
          setImpact(result.impact);
          setPreview('done');
        } else setPreview('failed');
      })
      .catch(() => setPreview('failed'));
  }

  function submit(typed: string) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await suspendWorkspace({
          tenantId: workspace.id,
          slug: workspace.slug,
          confirmSlug: typed,
          reason,
          status: reactivate ? 'active' : 'suspended',
        });
        if (!result.ok) return setError(result.error);
        setOpen(false);
        onReviewOpenChange?.(false);
        pushToast({
          tone: 'success',
          title: `${workspace.name} is ${reactivate ? 'active' : 'suspended'}`,
          description: reactivate
            ? 'Workspace changes are available again. The reason is recorded in Activity.'
            : 'The team retains read access. Workspace changes are paused.',
        });
        onChanged?.();
      } catch {
        setError(
          'The change could not be confirmed. Check the workspace status before trying again.',
        );
      }
    });
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={show}
        className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
        style={{
          border: '1px solid var(--border-strong)',
          background: 'var(--surface-raised)',
          color: reactivate ? 'var(--success-fg)' : 'var(--danger-fg)',
        }}
      >
        {reactivate ? (
          <IconRefresh size={15} stroke={1.5} aria-hidden />
        ) : (
          <IconCircleX size={15} stroke={1.5} aria-hidden />
        )}
        {verb}
      </button>
      <DestructiveConfirm
        open={open}
        onOpenChange={(next) => {
          if (!pending) {
            setOpen(next);
            onReviewOpenChange?.(next);
          }
        }}
        returnFocusRef={trigger}
        title={`${verb} ${workspace.name}`}
        consequence={
          reactivate
            ? 'Restore workspace changes while preserving the team, data and subscription.'
            : 'Pause workspace changes. The team keeps read access, and all data is retained.'
        }
        irreversible={false}
        details={
          <div className="grid gap-4">
            {impact ? (
              <p className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                {impact.activeMembers.toLocaleString('en-GB')} active{' '}
                {impact.activeMembers === 1 ? 'member' : 'members'}.
                {!reactivate && impact.openSupportSessions > 0
                  ? ` ${impact.openSupportSessions} open support ${impact.openSupportSessions === 1 ? 'visit' : 'visits'}. Workspace changes will also be paused for operators.`
                  : ''}
              </p>
            ) : null}
            <p className="t-caption" role="status" style={{ color: 'var(--text-tertiary)' }}>
              {preview === 'loading'
                ? 'Checking workspace impact…'
                : preview === 'failed'
                  ? 'The impact check is unavailable. Member and support-visit counts could not be confirmed.'
                  : 'Impact checked when this review opened. The change is recorded in both activity logs.'}
            </p>
            <div className="grid gap-1.5">
              <label
                htmlFor={reasonId}
                className="t-label"
                style={{ color: 'var(--text-secondary)' }}
              >
                Reason · the customer sees this
              </label>
              <textarea
                id={reasonId}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={2}
                maxLength={2000}
                className="t-compact rounded-panel border px-3 py-2"
                style={{
                  borderColor: 'var(--border-subtle)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
        }
        confirmValue={workspace.slug}
        confirmFieldLabel={`Type "${workspace.slug}" to confirm`}
        confirmLabel={`${verb} workspace`}
        loading={pending}
        error={error}
        onConfirm={submit}
      />
    </>
  );
}
