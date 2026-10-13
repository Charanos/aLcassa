'use client';

import { useMemo, useState, useTransition } from 'react';
import { IconBroadcast, IconPencil, IconStack2, IconUpload } from '@tabler/icons-react';
import { publishMasterRulesAction } from '@/app/(platform)/platform/(console)/rules-actions';
import { ConsoleDialog, DialogActions, DialogFact } from '@/components/primitives/ConsoleDialog';
import { runConsoleMutation } from '@/lib/console/mutation';
import { useToast } from '@/components/primitives/Toast';
import type { MasterRuleField } from '@/lib/console/data';

const NOTE_MIN = 8;

/** Edit structured shared guidance with a required change note and an expected-version check. */
export function RuleEditor({
  fields,
  versionNumber,
  workspaceCount,
}: {
  fields: MasterRuleField[];
  versionNumber: number;
  workspaceCount: number;
}) {
  const pushToast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  /* Keyed by field key, seeded from what is published. The dialog is mounted
     only while open, so re-opening after a cancel starts from the live values
     rather than from an abandoned edit. */
  const initial = useMemo(
    () => Object.fromEntries(fields.map((f) => [f.key, f.value])) as Record<string, string>,
    [fields],
  );
  const [draft, setDraft] = useState<Record<string, string>>(initial);
  const [note, setNote] = useState('');

  const changed = useMemo(
    () => fields.filter((f) => (draft[f.key] ?? '') !== f.value),
    [draft, fields],
  );

  const ready = changed.length > 0 && note.trim().length >= NOTE_MIN;

  function reset() {
    setDraft(initial);
    setNote('');
    setError(null);
  }

  function submit() {
    if (!ready || pending) return;
    setError(null);

    startTransition(async () => {
      const result = await runConsoleMutation(
        () =>
          publishMasterRulesAction({
            fields: {
              tone: draft.tone ?? '',
              responseGuidelines: draft.responseGuidelines ?? '',
              businessInformation: draft.businessInformation ?? '',
              escalationInstructions: draft.escalationInstructions ?? '',
              prohibitedTopics: draft.prohibitedTopics ?? '',
              customInstructions: draft.customInstructions ?? '',
            },
            changeNote: note,
            expectedVersionNumber: versionNumber,
            /* The lock set travels with the version rather than being inferred on
           read. `01 D-08`: a field is master-authoritative unless explicitly
           opened, and these two are the floor. */
            lockedFields: fields.filter((f) => f.locked).map((f) => f.key),
          }),
        'Rule publication',
      );

      if (result.ok) {
        setOpen(false);
        reset();
        pushToast({
          tone: 'success',
          title: `Published v${result.versionNumber}`,
          description: `The shared platform guidance has been updated.`,
        });
        return;
      }
      setError(result.error);
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
        className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-panel px-3 transition-colors hover:bg-[var(--surface-inset)]"
        style={{
          border: '1px solid var(--border-strong)',
          background: 'var(--surface-raised)',
          color: 'var(--text-primary)',
          font: '500 var(--type-compact)/1 var(--font-ui)',
        }}
      >
        <IconPencil size={13} stroke={1.5} aria-hidden />
        {versionNumber === 0 ? 'Create shared guidance' : 'Edit rules'}
      </button>

      <ConsoleDialog
        open={open}
        onOpenChange={(n) => {
          setOpen(n);
          if (n) reset();
        }}
        dismissible={!pending}
        eyebrow="Master AI rules"
        title="Edit the rules every workspace inherits"
        /* Give prose fields enough width for readable paragraph editing. */
        width="xl"
        operation="rules.published"
        description={`Publish a new shared rule version for ${workspaceCount} workspaces. Previous versions remain available to restore.`}
        facts={
          <>
            <DialogFact icon={IconStack2}>
              Earlier instructions remain available in version history.
            </DialogFact>
            <DialogFact icon={IconBroadcast}>
              Review the shared instructions carefully before publishing. Existing replies are
              unchanged.
            </DialogFact>
          </>
        }
        error={error}
        actions={
          <DialogActions
            confirmLabel="Publish rules"
            confirmIcon={IconUpload}
            onConfirm={submit}
            disabled={!ready}
            loading={pending}
          />
        }
      >
        {/*
          Two columns at xl. Six fields in one column is a scroll; six in two is
          a document an operator can read the shape of.
        */}
        <div className="grid gap-5 lg:grid-cols-2">
          {fields.map((f) => {
            const value = draft[f.key] ?? '';
            const isChanged = value !== f.value;
            const isList = f.key === 'prohibitedTopics';
            return (
              <label key={f.key} className={isList ? 'block lg:col-span-2' : 'block'}>
                <span className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="t-label" style={{ color: 'var(--text-primary)' }}>
                    {f.label}
                  </span>
                  <span
                    className="shrink-0 whitespace-nowrap"
                    style={{
                      font: '500 var(--type-micro)/1 var(--font-mono)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: isChanged ? 'var(--accent-mark-text)' : 'var(--text-tertiary)',
                    }}
                  >
                    {isChanged ? 'changed' : f.locked ? 'required' : 'default'}
                  </span>
                </span>
                <textarea
                  value={value}
                  rows={isList ? 4 : 3}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  placeholder={
                    isList
                      ? 'One topic per line. Leave empty to say nothing here.'
                      : 'Leave empty to say nothing here — each workspace then decides alone.'
                  }
                  className="t-body w-full rounded-chip px-3 py-2.5 transition-colors outline-none"
                  style={{
                    border: `1px solid ${isChanged ? 'var(--blue-500)' : 'var(--border-strong)'}`,
                    background: 'var(--surface-raised)',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                    lineHeight: 1.55,
                  }}
                />
              </label>
            );
          })}

          <label className="block lg:col-span-2">
            <span className="t-label mb-1.5 block" style={{ color: 'var(--text-primary)' }}>
              What changed{' '}
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>
                · required, and it goes in the platform log
              </span>
            </span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tightened escalation: anything mentioning a refund goes to a human."
              className="t-body w-full rounded-chip px-3 transition-colors outline-none"
              style={{
                height: 38,
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }}
            />
            <span
              className="t-caption mt-1.5 block"
              style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
            >
              {changed.length === 0
                ? 'Explain why these instructions are changing. This note is kept with the published version.'
                : `${changed.length} ${changed.length === 1 ? 'field' : 'fields'} changed: ${changed.map((f) => f.label.toLowerCase()).join(', ')}.`}
            </span>
          </label>
        </div>
      </ConsoleDialog>
    </>
  );
}
