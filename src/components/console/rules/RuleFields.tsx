import { IconLock, IconLockOpen } from '@tabler/icons-react';
import { Panel } from '../Surface';
import { RuleEditor } from './RuleEditor';
import type { MasterRuleField } from '@/lib/console/data';

/**
 * THE MASTER RULE SET, AS THE DATABASE HOLDS IT. `15 C47`.
 *
 * ⚠ THIS REPLACED A TOGGLE EDITOR FOR A MODEL THAT WAS NEVER IN THE SCHEMA.
 *
 * The console used to draw three groups of boolean switches with per-rule
 * locks. `master_ai_rule_versions.content` is six fields, five prose and one a
 * list. The tenant-side editor has spoken that vocabulary since M2, so the
 * platform and the workspace now describe the same rules the same way — which
 * is the entire point of an inheritance boundary.
 *
 * ⚠ `locked` AND "HAS A VALUE" ARE DIFFERENT PROPERTIES, and the surface must
 * not conflate them. That distinction is the one genuinely good idea the
 * toggle model carried, and it survives the shape change.
 *
 *   A LOCKED field is a floor. A workspace may tighten it and may never
 *   loosen it, and it renders with a closed lock and a solid left rule.
 *   `01 D-08`, confirmed 24 Aug 2026: master wins on conflict, and a field is
 *   master-authoritative unless explicitly opened.
 *
 *   An EMPTY field is not "off". It means the platform says nothing here and
 *   the workspace decides alone. Rendering it as a disabled control would tell
 *   an operator the platform had made a choice it has not made.
 *
 * ⚠ IT WAS READ-ONLY AND SAID SO, AND THE SENTENCE IT SAID IT WITH WAS AN
 *   ARGUMENT FOR BUILDING THIS PROPERLY RATHER THAN FOR NOT BUILDING IT:
 *   "an audited operation with a blast radius, not a form submit."
 *
 * Every clause of that survived into `RuleEditor`. The publish appends a
 * version rather than overwriting one, the change note is required, the audit
 * row is written before the work, and the radius — all N workspaces, on their
 * next generated reply — is on screen before the submit is reachable. What
 * none of it justified was the platform owner being unable to change the rules
 * he owns. The display below stays exactly as it was; the editing happens in a
 * dialog, so this file is still a READER.
 */

/** The two states, and what each one means to a workspace. */
const AUTHORITY = {
  locked: {
    label: 'floor',
    note: 'A workspace may tighten this and may never loosen it.',
    icon: IconLock,
    ink: 'var(--text-primary)',
    rule: 'var(--blue-500)',
  },
  open: {
    label: 'default',
    note: 'A workspace may replace this entirely.',
    icon: IconLockOpen,
    ink: 'var(--text-tertiary)',
    rule: 'var(--border-strong)',
  },
} as const;

function Field({ field }: { field: MasterRuleField }) {
  const authority = field.locked ? AUTHORITY.locked : AUTHORITY.open;
  const Icon = authority.icon;
  const empty = field.value.trim().length === 0;
  /* A list field arrives newline-joined from the reader, which is the one
     place the document's array shape shows through. Rendering it as lines
     rather than as a paragraph is what keeps "four prohibited topics" legible
     as four things. */
  const lines = field.value.split('\n').filter((l) => l.trim().length > 0);
  return (
    <div className="grid gap-3 border-t border-[color-mix(in_srgb,var(--border-subtle)_30%,transparent)] py-5 first:border-0 first:pt-2">
      <div className="mb-1 flex items-center justify-between gap-4">
        <span className="t-label" style={{ color: 'var(--text-primary)' }}>
          {field.label}
        </span>
        <span
          className="inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2.5"
          style={{
            background: 'var(--surface-inset)',
            color: authority.ink,
            font: '500 var(--type-micro)/1 var(--font-mono)',
            letterSpacing: '0.06em',
          }}
          title={authority.note}
        >
          <Icon size={11} stroke={1.75} aria-hidden />
          {authority.label}
        </span>
      </div>

      {empty ? (
        <p className="t-compact mt-1" style={{ color: 'var(--text-tertiary)' }}>
          The platform sets nothing here. Each workspace decides on its own.
        </p>
      ) : (
        <div
          className="relative overflow-hidden rounded-card px-5 py-4"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid color-mix(in srgb, var(--border-subtle) 15%, transparent)',
            boxShadow: 'var(--shadow-md), var(--glass-highlight)',
          }}
        >
          <div className="absolute inset-y-0 left-0 w-1" style={{ background: authority.rule }} />
          {lines.length > 1 ? (
            <ul className="grid gap-1.5">
              {lines.map((line) => (
                <li
                  key={line}
                  className="t-compact flex gap-2"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>
                    ·
                  </span>
                  <span className="min-w-0">{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="t-compact" style={{ color: 'var(--text-primary)', textWrap: 'pretty' }}>
              {field.value}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function RuleFields({
  fields,
  versionNumber,
  status,
  savedAt,
  workspaceCount,
}: {
  fields: MasterRuleField[];
  versionNumber: number;
  status: string;
  savedAt: string;
  /** For the editor's blast-radius sentence. Read on the server, passed down. */
  workspaceCount: number;
}) {
  const floors = fields.filter((f) => f.locked).length;
  const set = fields.filter((f) => f.value.trim().length > 0).length;

  return (
    <Panel
      title="The rule set"
      variant="elevated"
      action={
        <span className="flex items-center gap-3">
          <span
            className="whitespace-nowrap"
            style={{
              font: '400 var(--type-chip)/1 var(--font-mono)',
              color: 'var(--text-tertiary)',
            }}
          >
            v{versionNumber} · {status} · {savedAt}
          </span>
          <RuleEditor
            fields={fields}
            versionNumber={versionNumber}
            workspaceCount={workspaceCount}
          />
        </span>
      }
    >
      <p className="t-compact mb-4" style={{ color: 'var(--text-secondary)', maxWidth: '68ch' }}>
        <span className="numeric">{set}</span> of {fields.length} fields carry a value;{' '}
        <span className="numeric">{floors}</span> of them are floors a workspace cannot loosen.
      </p>

      {/*
        ⚠ THE TWO WORDS THE CHIPS USE, DEFINED ON THE PAGE.

        Each field carries a `floor` or `default` chip, and what those mean to a
        workspace was written into a `title` attribute — so the distinction this
        whole screen is built on was reachable by hovering a mouse over a badge,
        and by nothing else. A reader on a keyboard, on a phone, or with a
        screen reader got two words with no definition anywhere.

        Stated once here rather than six times below: the chips repeat, the
        meaning does not. The `title`s stay as an addition.
      */}
      <div
        className="mb-5 flex flex-col gap-2 rounded-panel px-3.5 py-3 sm:flex-row sm:gap-6"
        style={{ background: 'var(--surface-sunken)' }}
      >
        {(['locked', 'open'] as const).map((key) => {
          const a = AUTHORITY[key];
          const Icon = a.icon;
          return (
            <p key={key} className="t-caption flex items-start gap-2 sm:flex-1">
              <Icon
                size={12}
                stroke={1.75}
                aria-hidden
                style={{ color: a.ink, marginTop: '2px', flexShrink: 0 }}
              />
              <span className="min-w-0" style={{ color: 'var(--text-tertiary)' }}>
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    font: '500 var(--type-micro)/1 var(--font-mono)',
                    letterSpacing: '0.06em',
                  }}
                >
                  {a.label}
                </span>{' '}
                &mdash; {a.note}
              </span>
            </p>
          );
        })}
      </div>

      <div className="grid">
        {fields.map((field) => (
          <Field key={field.key} field={field} />
        ))}
      </div>

      <p
        className="t-caption mt-4 border-t pt-3.5"
        style={{
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-tertiary)',
          maxWidth: '72ch',
        }}
      >
        Publishing appends a version and moves a pointer on an append-only table, so nothing is
        overwritten and any earlier version is one click from being restored. It changes what every
        workspace inherits on its next generated reply, which is why the change note is required and
        why the whole operation lands in the platform log before it is applied.
      </p>
    </Panel>
  );
}
