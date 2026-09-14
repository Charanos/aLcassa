import { IconLock, IconLockOpen } from '@tabler/icons-react';
import { Panel } from '../Surface';
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
 * ⚠ IT IS READ-ONLY, AND SAYS SO. Publishing a version moves a pointer on an
 * append-only table and changes the floor every workspace inherits on the next
 * generated reply. That is an audited operation with a blast radius, not a
 * form submit, and it is not built yet. A textarea that accepted edits and
 * discarded them would be the settings panel's mistake on a screen where it
 * costs more.
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
    <div
      className="grid gap-3 py-5 border-t border-[color-mix(in_srgb,var(--border-subtle)_30%,transparent)] first:border-0 first:pt-2"
    >
      <div className="flex items-center justify-between gap-4 mb-1">
        <span className="t-label" style={{ color: 'var(--text-primary)' }}>
          {field.label}
        </span>
        <span
          className="inline-flex h-[22px] shrink-0 items-center gap-1.5 rounded-full px-2.5"
          style={{
            background: 'var(--surface-inset)',
            color: authority.ink,
            font: '500 10.5px/1 var(--font-mono)',
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
          className="rounded-[16px] px-5 py-4 relative overflow-hidden"
          style={{
            background: 'white',
            border: '1px solid color-mix(in srgb, var(--border-subtle) 15%, transparent)',
            boxShadow: '0 8px 32px -12px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.6) inset'
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
}: {
  fields: MasterRuleField[];
  versionNumber: number;
  status: string;
  savedAt: string;
}) {
  const floors = fields.filter((f) => f.locked).length;
  const set = fields.filter((f) => f.value.trim().length > 0).length;

  return (
    <Panel
      title="The rule set"
      variant="elevated"
      action={
        <span
          className="whitespace-nowrap"
          style={{ font: '400 11.5px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
        >
          v{versionNumber} · {status} · {savedAt}
        </span>
      }
    >
      <p className="t-compact mb-4" style={{ color: 'var(--text-secondary)', maxWidth: '68ch' }}>
        <span className="numeric">{set}</span> of {fields.length} fields carry a value;{' '}
        <span className="numeric">{floors}</span> of them are floors a workspace cannot loosen.
      </p>

      <div className="grid">
        {fields.map((field) => (
          <Field key={field.key} field={field} />
        ))}
      </div>

      <p
        className="t-caption mt-4 border-t pt-3.5"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)', maxWidth: '72ch' }}
      >
        Read-only here. Publishing a version moves a pointer on an append-only table and changes
        what every workspace inherits on its next generated reply — an audited operation with a
        blast radius, not a form submit. It is not built yet, and an editor that accepted changes
        and discarded them would be worse than this.
      </p>
    </Panel>
  );
}
