'use client';

import { useState, useTransition } from 'react';
import { rollbackMasterRulesAction } from '@/app/(platform)/platform/(console)/rules-actions';
import { IconArrowBackUp, IconStack2 } from '@tabler/icons-react';
import { ConsoleDialog, DialogActions, DialogFact } from '@/components/primitives/ConsoleDialog';
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
        className="shrink-0 rounded-panel px-2 py-0.5 transition-colors hover:bg-[var(--surface-inset)]"
        style={{
          font: '500 var(--type-micro)/1.6 var(--font-mono)',
          color: 'var(--text-tertiary)',
        }}
      >
        restore
      </button>

      <ConsoleDialog
        open={open}
        onOpenChange={(next) => setOpen(next)}
        dismissible={!pending}
        eyebrow="Master AI rules"
        title={`Restore v${versionNumber}`}
        width="md"
        operation="rules.rolled_back"
        description="The rules every workspace inherits change on their next generated reply. Replies already sent are unaffected."
        facts={
          <>
            <DialogFact icon={IconArrowBackUp}>
              v{versionNumber} becomes live; <em>v{currentVersionNumber}</em> stops being the floor
              for all {workspaceCount} workspaces.
            </DialogFact>
            <DialogFact icon={IconStack2}>
              {/* The reassurance that is actually true, because the table is
                  append-only: this is reversible in one click. */}
              Nothing is deleted. Every version between the two stays where it is, so restoring v
              {currentVersionNumber} afterwards is <em>the same single action</em>.
            </DialogFact>
          </>
        }
        error={error}
        actions={
          <DialogActions
            confirmLabel={`Restore v${versionNumber}`}
            confirmIcon={IconArrowBackUp}
            onConfirm={submit}
            disabled={reason.trim().length < 8}
            loading={pending}
            tone="destructive"
          />
        }
      >
        <label className="block">
          <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
            Why{' '}
            <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
              · required, and it goes in the platform log
            </span>
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder={`v${currentVersionNumber} escalated too aggressively; three workspaces reported it.`}
            className="t-body w-full rounded-chip px-3 py-2.5 transition-colors outline-none"
            style={{
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
              resize: 'vertical',
              lineHeight: 1.55,
            }}
          />
          <span className="t-caption mt-1.5 block" style={{ color: 'var(--text-tertiary)' }}>
            &ldquo;rules.rolled_back&rdquo; alone does not say what went wrong with the version
            being abandoned.
          </span>
        </label>
      </ConsoleDialog>
    </>
  );
}
