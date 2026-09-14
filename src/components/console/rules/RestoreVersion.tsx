'use client';

import { useState, useTransition } from 'react';
import { rollbackMasterRulesAction } from '@/app/(platform)/platform/(console)/rules-actions';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { useToast } from '@/components/primitives/Toast';

/**
 * Restore an earlier version of the master rules.
 *
 * ⚠ THE RAIL COULD SHOW THE HISTORY AND NOT USE IT, which made the
 * append-only design a claim rather than a capability. Its own header said
 * *"a rollback is a pointer move rather than a data restore"* — and there was
 * no control anywhere that moved the pointer.
 *
 * ⚠ IT CONFIRMS, AND IT IS NOT A `DestructiveConfirm` BY HABIT. Restoring
 * changes the floor every workspace inherits on its next reply, in one click,
 * from a narrow rail where the rows sit two-and-a-half pixels apart. The gate
 * is a misclick gate as much as a decision gate — and the reason field is what
 * makes the platform log readable afterwards, since "rules.rolled_back" alone
 * does not say what went wrong with the version being abandoned.
 */
export function RestoreVersion({
  versionId,
  versionNumber,
  currentVersionNumber,
  workspaceCount,
}: {
  versionId: string;
  versionNumber: number;
  currentVersionNumber: number;
  workspaceCount: number;
}) {
  const pushToast = useToast();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await rollbackMasterRulesAction({ versionId, reason });
      if (result.ok) {
        setOpen(false);
        setReason('');
        pushToast({
          tone: 'success',
          title: `v${result.versionNumber} is live again`,
          description: 'Nothing was deleted — the versions after it are still there.',
        });
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="shrink-0 rounded-md px-2 py-0.5 transition-colors hover:bg-[var(--surface-inset)]"
        style={{ font: '500 10.5px/1.6 var(--font-mono)', color: 'var(--text-tertiary)' }}
      >
        restore
      </button>

      <ConfirmDialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
        title={`Restore v${versionNumber}`}
        consequence="The rules every workspace inherits change on their next generated reply."
        details={
          <>
            <ul
              className="grid list-none gap-2 border-t p-0 pt-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <li className="t-compact" style={{ color: 'var(--text-primary)' }}>
                v{versionNumber} becomes live; v{currentVersionNumber} stops being the floor.
              </li>
              <li className="t-compact" style={{ color: 'var(--text-primary)' }}>
                All {workspaceCount} workspaces pick it up on their next generated reply. Replies
                already sent are unaffected.
              </li>
              <li className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                {/* The reassurance that is actually true, because the table is
                    append-only: this is reversible in one click. */}
                Nothing is deleted. Every version between the two stays where it is, so restoring
                v{currentVersionNumber} afterwards is the same single action.
              </li>
            </ul>

            <div
              className="grid gap-1.5 border-t pt-4"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <label
                htmlFor="rollback-reason"
                className="t-label"
                style={{ color: 'var(--text-secondary)' }}
              >
                Why &middot; goes in the platform log
              </label>
              <textarea
                id="rollback-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder={`v${currentVersionNumber} escalated too aggressively; three workspaces reported it.`}
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
        confirmLabel={`Restore v${versionNumber}`}
        loading={pending}
        error={error}
        tone="destructive"
        onConfirm={submit}
      />
    </>
  );
}
