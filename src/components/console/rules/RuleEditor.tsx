'use client';

import { useMemo, useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconLoader2, IconPencil, IconX } from '@tabler/icons-react';
import { publishMasterRulesAction } from '@/app/(platform)/platform/(console)/rules-actions';
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
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
    <Dialog.Root
      open={open}
      onOpenChange={(n) => {
        if (pending) return;
        setOpen(n);
        if (n) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-panel px-3 text-[12.5px] font-medium transition-colors hover:bg-[var(--surface-inset)]"
          style={{
            border: '1px solid var(--border-strong)',
            background: 'var(--surface-raised)',
            color: 'var(--text-primary)',
          }}
        >
          <IconPencil size={13} stroke={1.5} aria-hidden />
          Edit rules
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[150]"
          style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(4px)' }}
        />
        {/* Centring on the wrapper, never on a transform. */}
        <div className="pointer-events-none fixed inset-0 z-[150] grid place-items-center p-4">
          <Dialog.Content className="surface-glass-strong pointer-events-auto flex max-h-[90vh] w-full max-w-[760px] flex-col overflow-hidden rounded-3xl">
            <form onSubmit={submit} className="flex min-h-0 flex-col">
              <div
                className="flex items-start justify-between gap-4 px-7 pt-7 pb-4"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <div className="min-w-0">
                  <Dialog.Title
                    className="text-[19px] tracking-tight"
                    style={{ color: 'var(--text-primary)', fontWeight: 500 }}
                  >
                    Edit the master rules
                  </Dialog.Title>
                  {/*
                    The blast radius, stated before the submit is reachable —
                    the same call the suspend dialog makes. This is the only
                    screen in the product whose save reaches every customer at
                    once, and a reader who does not know that cannot weigh it.
                  */}
                  <Dialog.Description
                    className="mt-2 text-[13px] leading-relaxed"
                    style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
                  >
                    Publishing appends v{versionNumber + 1} and points the platform at it. All{' '}
                    {workspaceCount} workspaces inherit the change on their next generated reply.
                    Nothing is overwritten &mdash; v{versionNumber} stays, and restoring it is one
                    click.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close"
                    className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-[var(--surface-inset)]"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    <IconX size={16} stroke={1.5} />
                  </button>
                </Dialog.Close>
              </div>

              <div className="scrollbar-slim grid min-h-0 flex-1 gap-5 overflow-y-auto px-7 py-5">
                {fields.map((f) => {
                  const value = draft[f.key] ?? '';
                  const isChanged = value !== f.value;
                  const isList = f.key === 'prohibitedTopics';
                  return (
                    <div key={f.key} className="grid gap-1.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <label
                          htmlFor={`rule-${f.key}`}
                          className="t-label"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {f.label}
                        </label>
                        <span
                          className="shrink-0 whitespace-nowrap"
                          style={{
                            font: '500 10.5px/1 var(--font-mono)',
                            letterSpacing: '0.06em',
                            color: isChanged ? 'var(--accent-mark-text)' : 'var(--text-tertiary)',
                          }}
                        >
                          {isChanged ? 'changed' : f.locked ? 'floor' : 'default'}
                        </span>
                      </div>
                      <textarea
                        id={`rule-${f.key}`}
                        value={value}
                        rows={isList ? 4 : 3}
                        onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                        placeholder={
                          isList
                            ? 'One topic per line. Leave empty to say nothing here.'
                            : 'Leave empty to say nothing here — each workspace then decides alone.'
                        }
                        className="w-full rounded-chip px-3 py-2.5 outline-none transition-colors focus:border-[var(--blue-500)]"
                        style={{
                          border: `1px solid ${isChanged ? 'var(--blue-500)' : 'var(--border-strong)'}`,
                          background: 'var(--surface-raised)',
                          boxShadow: 'var(--neu-inset)',
                          color: 'var(--text-primary)',
                          font: '400 var(--text-sm)/1.5 var(--font-ui)',
                          resize: 'vertical',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              <div
                className="grid gap-1.5 px-7 pt-4"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <label
                  htmlFor="rule-note"
                  className="t-label"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  What changed &middot; goes in the platform log
                </label>
                <input
                  id="rule-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Tightened escalation: anything mentioning a refund goes to a human."
                  className="h-[38px] w-full rounded-chip px-3 outline-none"
                  style={{
                    border: '1px solid var(--border-strong)',
                    background: 'var(--surface-raised)',
                    boxShadow: 'var(--neu-inset)',
                    color: 'var(--text-primary)',
                    font: '400 var(--text-sm)/1 var(--font-ui)',
                  }}
                />
                <p className="t-caption" style={{ color: 'var(--text-tertiary)' }}>
                  Required. In six months this sentence is the only explanation of why v
                  {versionNumber + 1} differs from v{versionNumber}.
                </p>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="mx-7 mt-4 rounded-panel px-3.5 py-3 text-[13px] leading-relaxed"
                  style={{
                    background: 'var(--badge-danger-bg)',
                    border: '1px solid var(--badge-danger-edge)',
                    color: 'var(--danger-fg)',
                  }}
                >
                  {error}
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-4 px-7 py-5">
                <p className="t-caption min-w-0" style={{ color: 'var(--text-tertiary)' }}>
                  {changed.length === 0
                    ? 'No changes yet.'
                    : `${changed.length} ${changed.length === 1 ? 'field' : 'fields'} changed: ${changed.map((f) => f.label.toLowerCase()).join(', ')}.`}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      disabled={pending}
                      className="h-[34px] rounded-lg px-4 text-[13px] font-medium transition-colors hover:bg-[var(--surface-inset)]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    disabled={!ready || pending}
                    className="inline-flex h-[34px] items-center gap-2 rounded-lg px-4 text-[13px] font-medium transition-all"
                    style={{
                      background: ready && !pending ? 'var(--blue-500)' : 'var(--surface-sunken)',
                      color: ready && !pending ? 'var(--text-inverse)' : 'var(--text-disabled)',
                      cursor: ready && !pending ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {pending ? (
                      <>
                        <IconLoader2 size={15} stroke={1.5} className="animate-spin" aria-hidden />
                        Publishing
                      </>
                    ) : (
                      `Publish v${versionNumber + 1}`
                    )}
                  </button>
                </div>
              </div>
            </form>
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
