'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { IconAlertTriangle, IconLock } from '@tabler/icons-react';
import { Badge } from '@/components/primitives/Badge';
import { Button } from '@/components/primitives/Button';
import { ConfirmDialog } from '@/components/primitives/ConfirmDialog';
import { publishAiRules, restoreAiRules } from '@/app/(tenant)/app/actions';
import type { RulesFields, RulesRevision } from '@/modules/aiRules';
import type { RuleField, RulesVersion } from '@/lib/tenant/data';
import { compareRuleLines } from '@/lib/tenant/ruleDiff';

/** Structured instructions, visible platform safeguards and recorded version history. */
type EditorModel = {
  revision: RulesRevision | null;
  canWrite: boolean;
  fields: RuleField[];
  currentVersion: number;
  versions: RulesVersion[];
  versionsRetained: number;
  versionsLimit: number | null;
};

export function AiRulesEditor(initial: EditorModel) {
  const [confirmed, setConfirmed] = useState<EditorModel | null>(null);
  const timestamp = (value: string | null | undefined) => (value ? Date.parse(value) : 0);
  // Prefer the committed readback over an older route refresh; newer external snapshots stay visible.
  const model =
    confirmed &&
    timestamp(confirmed.revision?.updatedAt) >= timestamp(initial.revision?.updatedAt) &&
    timestamp(confirmed.revision?.masterUpdatedAt) >= timestamp(initial.revision?.masterUpdatedAt)
      ? confirmed
      : initial;
  const { revision, canWrite, fields, currentVersion, versions, versionsRetained, versionsLimit } =
    model;
  const heading = useRef<HTMLHeadingElement>(null);
  const publicationError = useRef<HTMLParagraphElement>(null);
  const restoreTrigger = useRef<HTMLButtonElement>(null);
  const [baseline, setBaseline] = useState({ fields, revision });
  const [restoreComplete, setRestoreComplete] = useState(false);
  const [values, setValues] = useState<RulesFields>(
    Object.fromEntries(fields.map((f) => [f.key, f.tenantValue])) as RulesFields,
  );
  const [changeNote, setChangeNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [pending, startTransition] = useTransition();
  const [restore, setRestore] = useState<RulesVersion | null>(null);
  const [restoreNote, setRestoreNote] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [compare, setCompare] = useState<string>('');
  const [visibleVersions, setVisibleVersions] = useState(5);
  useEffect(() => {
    if (error && !pending) publicationError.current?.focus();
  }, [error, pending]);
  const orderedVersions = [
    ...versions.filter((version) => version.id === revision?.currentVersionId),
    ...versions.filter((version) => version.id !== revision?.currentVersionId),
  ];

  const stale = JSON.stringify(baseline.revision) !== JSON.stringify(revision);
  function acknowledge(saved: EditorModel) {
    setConfirmed(saved);
    setBaseline({ fields: saved.fields, revision: saved.revision });
    setValues(
      Object.fromEntries(
        saved.fields.map((field) => [field.key, field.tenantValue]),
      ) as RulesFields,
    );
    setChangeNote('');
  }
  const dirty = baseline.fields.some((f) => !f.lockedByMaster && values[f.key] !== f.tenantValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPublished(false);
    startTransition(async () => {
      try {
        const result = await publishAiRules({
          fields: values,
          changeNote,
          revision: baseline.revision,
        });
        if (result.ok) {
          setPublished(true);
          acknowledge(result.model);
          heading.current?.focus();
        } else setError(result.error);
      } catch {
        setError(
          'The outcome could not be confirmed. Reload the version history before trying again.',
        );
      }
    });
  }

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
      <form
        onSubmit={submit}
        className="grid gap-6 rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-5">
          <h2 ref={heading} tabIndex={-1} className="t-panel">
            Workspace instructions
          </h2>
          <span className="t-caption text-[var(--text-secondary)]">
            {currentVersion ? `v${currentVersion} is live` : 'Platform defaults apply'}
          </span>
        </div>
        {!canWrite ? (
          <p className="t-compact text-[var(--text-secondary)]">
            You can review these instructions. Publishing requires an authorized role and an active
            instruction allowance.
          </p>
        ) : null}
        {stale && !pending ? (
          <p role="status" className="t-compact text-[var(--text-secondary)]">
            The live instructions changed while you were editing. Your draft is still here. Reload
            to review the latest version before publishing.
          </p>
        ) : null}
        <div className="grid gap-6">
          {fields.map((field) => (
            <RuleFieldEditor
              key={field.key}
              field={field}
              disabled={pending || !canWrite}
              value={values[field.key] ?? ''}
              onChange={(v) => {
                setPublished(false);
                setValues((prev) => ({ ...prev, [field.key]: v }));
              }}
            />
          ))}
        </div>

        <label className="grid gap-1.5 border-t pt-5" style={{ borderColor: 'var(--ink-100)' }}>
          <span className="t-label text-[var(--text-secondary)]">Change note</span>
          <input
            value={changeNote}
            required
            minLength={8}
            maxLength={500}
            disabled={pending || !canWrite}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder="Describe what changed and why."
            className="field-sunken t-body h-10 rounded-chip border px-3 text-[var(--text-primary)]"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
          />
          <span className="t-caption min-h-[18px] text-[var(--text-tertiary)]">
            Add 8–500 characters. This note is saved in version history and Activity.
          </span>
        </label>

        {error ? (
          <p
            ref={publicationError}
            tabIndex={-1}
            role="alert"
            className="t-compact flex items-start gap-1.5"
            style={{ color: 'var(--red-500)' }}
          >
            <IconAlertTriangle size={14} stroke={1.5} className="mt-px shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            loading={pending}
            disabled={!dirty || pending || !canWrite || !revision || changeNote.trim().length < 8}
          >
            Publish instructions
          </Button>
          {published ? (
            <span role="status" className="t-compact" style={{ color: 'var(--green-500)' }}>
              Your instructions are live.
            </span>
          ) : null}
        </div>
      </form>

      <aside className="grid gap-4 rounded-panel bg-[var(--surface-sunken)] p-2">
        <div
          className="rounded-panel border p-4"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="t-label text-[var(--text-tertiary)]">Version history</h2>
            <span className="t-caption text-[var(--text-tertiary)]">
              {versionsRetained}
              {versionsLimit === null ? '' : ` / ${versionsLimit}`} retained
            </span>
          </div>
          <ol className="mt-3 grid gap-3">
            {!versions.length ? (
              <li className="t-compact py-4 text-[var(--text-secondary)]">
                No workspace version has been published yet.
              </li>
            ) : null}
            {orderedVersions.slice(0, visibleVersions).map((v) => (
              <li
                key={v.version}
                className="border-t pt-3 first:border-t-0 first:pt-0"
                style={{ borderColor: 'var(--ink-100)' }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="t-data text-[var(--text-primary)]">v{v.version}</span>
                  {v.id === revision?.currentVersionId ? (
                    <Badge tone="active">Live</Badge>
                  ) : v.status === 'archived' ? (
                    <span className="t-caption text-[var(--text-tertiary)]">Archived</span>
                  ) : null}
                  <span className="t-caption text-[var(--text-tertiary)]">{v.publishedAt}</span>
                </div>
                <p className="t-caption mt-0.5 break-words text-[var(--text-secondary)]">
                  {v.changeNote}
                </p>
                <p className="t-caption text-[var(--text-tertiary)]">{v.publishedBy}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setCompare(compare === v.id ? '' : v.id)}
                  >
                    Compare with live
                  </Button>
                  {canWrite && v.id !== revision?.currentVersionId ? (
                    <Button
                      variant="quiet"
                      size="sm"
                      disabled={pending}
                      onClick={(event) => {
                        restoreTrigger.current = event.currentTarget;
                        setRestoreComplete(false);
                        setRestoreNote('');
                        setRestoreError(null);
                        setRestore(v);
                      }}
                    >
                      Restore
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
          {versions.length > visibleVersions ? (
            <Button
              variant="quiet"
              size="sm"
              className="mt-4"
              onClick={() => setVisibleVersions((count) => count + 5)}
            >
              Show earlier versions
            </Button>
          ) : null}
        </div>
        {compare ? (
          <div className="rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4">
            <h3 className="t-panel">Version comparison</h3>
            <p className="t-caption mt-1 text-[var(--text-secondary)]">
              Selected version → live workspace instructions. Platform safeguards apply to both.
            </p>
            {fields.map((field) => {
              const old =
                versions.find((version) => version.id === compare)?.fields[field.key] ?? '';
              const live = field.tenantValue;
              return old !== live ? (
                <div key={field.key} className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                  <h4 className="t-label">{field.label}</h4>
                  <div className="t-data mt-2 grid gap-1 break-words whitespace-pre-wrap">
                    {compareRuleLines(old, live).map((line, index) => (
                      <div key={index} className="grid grid-cols-[1rem_minmax(0,1fr)] gap-1">
                        <span aria-hidden className="text-[var(--text-tertiary)]">
                          {line.kind === 'added' ? '+' : line.kind === 'removed' ? '−' : ' '}
                        </span>
                        {line.kind === 'removed' ? (
                          <del className="text-[var(--text-secondary)]">
                            <span className="sr-only">Removed: </span>
                            {line.text || ' '}
                          </del>
                        ) : line.kind === 'added' ? (
                          <ins className="text-[var(--text-primary)]">
                            <span className="sr-only">Added: </span>
                            {line.text || ' '}
                          </ins>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">{line.text || ' '}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })}
            {fields.every(
              (field) =>
                (versions.find((version) => version.id === compare)?.fields[field.key] ?? '') ===
                field.tenantValue,
            ) ? (
              <p className="t-compact mt-3">These instructions match.</p>
            ) : null}
          </div>
        ) : null}
      </aside>
      <ConfirmDialog
        returnFocusRef={restoreComplete ? heading : restoreTrigger}
        open={restore !== null}
        onOpenChange={(open) => {
          if (!pending && !open) setRestore(null);
        }}
        title={`Restore v${restore?.version ?? ''}?`}
        consequence="Your assistant will use this workspace version with the current platform safeguards. Later versions remain in history."
        confirmLabel="Restore instructions"
        loading={pending}
        disabled={restoreNote.trim().length < 8}
        error={restoreError}
        details={
          <label className="grid gap-2">
            <span className="t-label">Reason for restoring</span>
            <input
              aria-label="Reason for restoring"
              className="field-sunken t-body w-full rounded-chip border border-[var(--border-subtle)] p-3"
              value={restoreNote}
              minLength={8}
              maxLength={500}
              disabled={pending}
              onChange={(event) => setRestoreNote(event.target.value)}
            />
            <span className="t-caption text-[var(--text-secondary)]">
              Add 8–500 characters. Your reason is recorded in Activity.
            </span>
          </label>
        }
        onConfirm={() =>
          startTransition(async () => {
            if (!restore || !revision) return;
            try {
              const result = await restoreAiRules({
                versionId: restore.id,
                revision: baseline.revision,
                changeNote: restoreNote,
              });
              if (result.ok) {
                setRestoreComplete(true);
                setRestore(null);
                acknowledge(result.model);
                setPublished(true);
              } else setRestoreError(result.error);
            } catch {
              setRestoreError(
                'The outcome could not be confirmed. Reload the version history before trying again.',
              );
            }
          })
        }
      />
    </div>
  );
}

function RuleFieldEditor({
  field,
  value,
  onChange,
  disabled,
}: {
  field: RuleField;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="border-b border-[var(--border-subtle)] pb-6 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        {field.lockedByMaster ? (
          <span className="t-label text-[var(--text-secondary)]">{field.label}</span>
        ) : (
          <label htmlFor={`rule-${field.key}`} className="t-label text-[var(--text-secondary)]">
            {field.label}
          </label>
        )}
        {field.lockedByMaster ? <Badge tone="support">Locked by platform</Badge> : null}
        <span className="t-caption text-[var(--text-tertiary)]">
          {field.provenance === 'master (locked)'
            ? 'Platform safeguard'
            : field.provenance === 'master + tenant (combined)'
              ? 'Combined with platform guidance'
              : field.provenance === 'master (default)'
                ? 'Platform default'
                : 'Workspace preference'}
        </span>
      </div>

      {field.lockedByMaster ? (
        <div
          className="mt-1.5 flex items-start gap-2.5 rounded-panel border p-3.5"
          style={{ borderColor: 'var(--blue-200)', background: 'var(--blue-50)' }}
        >
          <IconLock
            size={15}
            stroke={1.5}
            className="mt-0.5 shrink-0"
            style={{ color: 'var(--blue-500)' }}
            aria-hidden
          />
          <p className="t-body" style={{ color: 'var(--text-primary)' }}>
            {field.masterValue}
          </p>
        </div>
      ) : (
        <textarea
          id={`rule-${field.key}`}
          disabled={disabled}
          maxLength={field.key === 'tone' ? 1000 : 10000}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder={field.provenance === 'master (default)' ? field.masterValue : undefined}
          className="field-sunken t-body mt-1.5 w-full rounded-chip border p-3 text-[var(--text-primary)]"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
        />
      )}
      {field.provenance === 'master + tenant (combined)' ? (
        <p className="t-caption mt-1 text-[var(--text-tertiary)]">
          Your assistant reads this together with the platform default, not instead of it.
        </p>
      ) : null}
    </div>
  );
}
