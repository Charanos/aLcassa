'use client';

import { useMemo, useState, useTransition } from 'react';
import { IconBroadcast, IconPencil, IconStack2, IconUpload } from '@tabler/icons-react';
import { publishMasterRulesAction } from '@/app/(platform)/platform/(console)/rules-actions';
import {
  ConsoleDialog,
  DialogActions,
  DialogFact,
} from '@/components/primitives/ConsoleDialog';
import { useToast } from '@/components/primitives/Toast';
import type { MasterRuleField } from '@/lib/console/data';

const NOTE_MIN = 8;

/**
 * The master rule set, editable by the platform owner.
 *
 * ⚠ THE SCREEN USED TO SAY THIS COULD NOT BE BUILT, AND GAVE THE REASON IT
 *   SHOULD BE: *"an audited operation with a blast radius, not a form submit."*
 *
 * That is an argument about HOW to build it. Publishing appends a version and
 * moves a pointer, the change note is required and lands in the platform log,
 * the blast radius is stated before the submit is reachable, and every previous
 * version stays one click from being restored. What it is not is a reason for
 * the person who owns these rules to be unable to change them.
 *
 * ⚠ THE FIELDS ARE TEXTAREAS BECAUSE THE DOCUMENT IS PROSE. `15 C47` replaced a
 * toggle editor for a model that was never in the schema —
 * `master_ai_rule_versions.content` is six fields, five prose and one a list.
 * The tenant-side editor has spoken that vocabulary since M2; this now writes
 * in it.
 */
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
      const result = await publishMasterRulesAction({
        fields: {
          tone: draft.tone ?? '',
          responseGuidelines: draft.responseGuidelines ?? '',
          businessInformation: draft.businessInformation ?? '',
          escalationInstructions: draft.escalationInstructions ?? '',
          prohibitedTopics: draft.prohibitedTopics ?? '',
          customInstructions: draft.customInstructions ?? '',
        },
        changeNote: note,
        /* The lock set travels with the version rather than being inferred on
           read. `01 D-08`: a field is master-authoritative unless explicitly
           opened, and these two are the floor. */
        lockedFields: fields.filter((f) => f.locked).map((f) => f.key),
      });

      if (result.ok) {
        setOpen(false);
        reset();
        pushToast({
          tone: 'success',
          title: `Published v${result.versionNumber}`,
          description: `Every workspace inherits this on its next generated reply.`,
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
          font: '500 12.5px/1 var(--font-ui)',
        }}
      >
        <IconPencil size={13} stroke={1.5} aria-hidden />
        Edit rules
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
        /* ⚠ `xl`, AND THE WIDTH IS THE POINT. Six prose fields at 600px is a
           column of three-word lines that reads like a receipt — the operator
           is editing PARAGRAPHS an assistant will speak, and they have to be
           able to see the shape of what they are writing. */
        width="xl"
        operation="rules.published"
        description={`Publishing appends v${versionNumber + 1} and points the platform at it. All ${workspaceCount} workspaces inherit the change on their next generated reply — nothing is overwritten, and restoring v${versionNumber} is one click.`}
        facts={
          <>
            <DialogFact icon={IconStack2}>
              Versions are <em>append-only</em>. Publishing moves a pointer, so every earlier set
              stays readable and a rollback restores rather than rebuilds.
            </DialogFact>
            <DialogFact icon={IconBroadcast}>
              It reaches every workspace on their <em>next generated reply</em>. Replies already
              sent are unaffected.
            </DialogFact>
          </>
        }
        error={error}
        actions={
          <DialogActions
            confirmLabel={`Publish v${versionNumber + 1}`}
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
                      font: '500 10.5px/1 var(--font-mono)',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: isChanged ? 'var(--accent-mark-text)' : 'var(--text-tertiary)',
                    }}
                  >
                    {isChanged ? 'changed' : f.locked ? 'floor' : 'default'}
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
                  className="t-body w-full rounded-chip px-3 py-2.5 outline-none transition-colors"
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
              className="t-body w-full rounded-chip px-3 outline-none transition-colors"
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
                ? `In six months this sentence is the only explanation of why v${versionNumber + 1} differs from v${versionNumber}.`
                : `${changed.length} ${changed.length === 1 ? 'field' : 'fields'} changed: ${changed.map((f) => f.label.toLowerCase()).join(', ')}.`}
            </span>
          </label>
        </div>
      </ConsoleDialog>
    </>
  );
}
