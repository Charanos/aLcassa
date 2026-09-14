'use client';

import { useState, useTransition } from 'react';
import { IconAlertTriangle, IconLock } from '@tabler/icons-react';
import { Badge } from '@/components/feedback/Badge';
import { Button } from '@/components/primitives/Button';
import { publishAiRules } from '@/app/(tenant)/app/actions';
import type { RuleField, RulesVersion } from '@/lib/tenant/data';

/**
 * 08 §4. `/app/settings/ai-rules`. Owner and admin.
 *
 * ⚠ FIELD BY FIELD, NEVER ONE TEXTAREA. "The compiled document has structure,
 * and a blob would make provenance meaningless." Each field states, in one
 * line, whether it is this tenant's own value, master's default, a locked
 * platform value, or the combined case — the exact vocabulary 08 §4's
 * precedence model defines.
 *
 * A field locked by master renders READ-ONLY with the platform value shown,
 * never hidden. "A tenant should see what is being applied on their behalf."
 */
export function AiRulesEditor({
  fields,
  currentVersion,
  versions,
  versionsRetained,
  versionsLimit,
}: {
  fields: RuleField[];
  currentVersion: number;
  versions: RulesVersion[];
  versionsRetained: number;
  versionsLimit: number | null;
}) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fields.map((f) => [f.key, f.tenantValue])),
  );
  const [changeNote, setChangeNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = fields.some((f) => values[f.key] !== f.tenantValue) || changeNote.trim() !== '';

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPublished(false);
    startTransition(async () => {
      const result = await publishAiRules({ changeNote });
      if (result.ok) setPublished(true);
      else setError(result.error);
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
      <form onSubmit={submit} className="grid gap-5">
        <div className="grid gap-5">
          {fields.map((field) => (
            <RuleFieldEditor
              key={field.key}
              field={field}
              value={values[field.key] ?? ''}
              onChange={(v) => setValues((prev) => ({ ...prev, [field.key]: v }))}
            />
          ))}
        </div>

        <label className="grid gap-1.5 border-t pt-5" style={{ borderColor: 'var(--ink-100)' }}>
          <span className="t-label text-[var(--text-secondary)]">Change note</span>
          <input
            value={changeNote}
            onChange={(e) => setChangeNote(e.target.value)}
            placeholder="What changed and why — this becomes the version history entry."
            className="field-sunken t-body h-10 rounded-chip border px-3 text-[var(--text-primary)]"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-sunken)' }}
          />
          <span className="t-caption min-h-[18px] text-[var(--text-tertiary)]">
            Required. One field, and it is what makes this readable six months later.
          </span>
        </label>

        {error ? (
          <p
            role="alert"
            className="t-compact flex items-start gap-1.5"
            style={{ color: 'var(--red-500)' }}
          >
            <IconAlertTriangle size={14} stroke={1.5} className="mt-px shrink-0" aria-hidden />
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" loading={pending} disabled={!dirty || pending}>
            Publish v{currentVersion + 1}
          </Button>
          {published ? (
            <span className="t-compact" style={{ color: 'var(--green-500)' }}>
              Published
            </span>
          ) : null}
        </div>
      </form>

      <aside className="grid gap-4">
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
            {versions.map((v) => (
              <li
                key={v.version}
                className="border-t pt-3 first:border-t-0 first:pt-0"
                style={{ borderColor: 'var(--ink-100)' }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="t-data text-[var(--text-primary)]">v{v.version}</span>
                  <span className="t-caption text-[var(--text-tertiary)]">{v.publishedAt}</span>
                </div>
                <p className="t-caption mt-0.5 text-[var(--text-secondary)]">{v.changeNote}</p>
                <p className="t-caption text-[var(--text-tertiary)]">{v.publishedBy}</p>
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
}

function RuleFieldEditor({
  field,
  value,
  onChange,
}: {
  field: RuleField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="t-label text-[var(--text-secondary)]">{field.label}</span>
        {field.lockedByMaster ? <Badge tone="support">Locked by platform</Badge> : null}
        <span className="t-caption text-[var(--text-tertiary)]">{field.provenance}</span>
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
