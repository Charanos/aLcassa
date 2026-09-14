import React from 'react';

/**
 * The profile surface's shared pieces.
 *
 * ⚠ THIS FILE CARRIES NO DIRECTIVE. Every export here is a server component or
 * a plain helper, so the four cards that compose them stay server-rendered and
 * only the two islands — the name form and the revoke controls — hydrate.
 *
 * 18 §13: a `'use client'` file must never become the home of a shared value,
 * because a server component importing one receives a reference proxy and
 * every read of it is `undefined` at runtime, silently. Nothing in here is
 * client-side, so nothing in here can spring that trap.
 */

/**
 * THE ROW. Used by the security checklist and by the device list.
 *
 * ⚠ THESE WERE TWO ROWS THAT WERE NEARLY THE SAME ROW, which 18 §12 names as
 * the first thing to look for. Both were: a glyph, a label over a detail line,
 * a control pinned right, `px-6 py-4` inside a `divide-y`. The differences
 * between the two copies were not decisions — one had a hover tint and the
 * other did not, one aligned its glyph to the centre and the other to the top,
 * one reserved a fixed control column and the other let the button size itself.
 * Read side by side, every difference was a defect in one of them.
 *
 * Extracting it first is what made the rest of this surface cheap: the paging,
 * the pending state and the reason line were each written once.
 */
export function RecordRow({
  glyph,
  label,
  detail,
  /**
   * Under the detail. Where a disabled control's reason goes, or a note about
   * what a row records — anything that needs the row's FULL width to finish a
   * sentence. 18 §12: a reason that truncates costs the full price of the
   * explanation and delivers none of it.
   */
  note,
  meta,
  control,
  interactive,
}: {
  glyph?: React.ReactNode;
  label: React.ReactNode;
  detail?: React.ReactNode;
  note?: React.ReactNode;
  /** Pinned right of the text, left of the control. A time, a count. */
  meta?: React.ReactNode;
  control?: React.ReactNode;
  /**
   * ⚠ ONLY WHEN THE WHOLE ROW DOES SOMETHING. A hover tint on a row whose only
   * interactive element is a button inside it tells the reader the row is
   * clickable, and it is not — 03 §20 lists that as an anti-pattern, and the
   * device list had it.
   */
  interactive?: boolean;
}) {
  return (
    <div
      className={`flex items-start gap-6 px-6 py-6 ${
        interactive ? 'transition-colors duration-200 hover:bg-[var(--surface-sunken)]' : ''
      }`}
    >
      {glyph ? <div className="flex shrink-0 pt-0.5">{glyph}</div> : null}

      <div className="min-w-0 flex-1">
        <div className="t-body" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {label}
        </div>
        {detail ? (
          <div
            className="mt-1 text-[13px] leading-relaxed"
            style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
          >
            {detail}
          </div>
        ) : null}
        {note ? <div className="mt-2">{note}</div> : null}
      </div>

      {meta ? <div className="shrink-0 pt-0.5 text-right">{meta}</div> : null}
      {control ? <div className="flex shrink-0 justify-end pt-px">{control}</div> : null}
    </div>
  );
}

/**
 * Re-exported so the profile's own call sites keep importing from the folder
 * they live in. The definition moved to the surface vocabulary because the
 * tenant tabs need the same note, and `BandLink` set the precedent: one
 * definition in `Surface`, a re-export in the folder that first needed it.
 */
export { ReasonNote } from '@/components/console/Surface';

/**
 * The round glyph a record row leads with.
 *
 * One size, one border, one radius, and the tone carried as tokens rather than
 * as a per-caller background — the four copies of this that existed used
 * `#f8fafc`, `bg-slate-50`, `var(--success-bg)` and a bare border, which is
 * four answers to a question with one answer.
 */
export function RowGlyph({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'muted';
}) {
  return (
    <span
      className="grid size-[40px] place-items-center rounded-full"
      style={{
        background: tone === 'success' ? 'var(--badge-success-bg)' : 'var(--surface-sunken)',
        color:
          tone === 'success'
            ? 'var(--success-fg)'
            : tone === 'muted'
              ? 'var(--text-tertiary)'
              : 'var(--text-tertiary)',
        border: `1px solid ${tone === 'success' ? 'var(--badge-success-edge)' : 'var(--border-subtle)'}`,
      }}
      aria-hidden
    >
      {children}
    </span>
  );
}

/**
 * The helper line under a field, and the one above a value.
 *
 * Both were `text-[12px]` / `text-[13px]` inline with a colour, six times over.
 * They are one thing: small print that qualifies the control above or below it.
 */
export function Hint({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    <span
      id={id}
      className="t-caption mt-2 block"
      style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
    >
      {children}
    </span>
  );
}

/** A field's label. Paired with `Hint` above. */
export function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="t-label mb-2 block"
      style={{ color: 'var(--text-primary)' }}
    >
      {children}
    </label>
  );
}

/**
 * The list of what an action writes, shown BEFORE it runs.
 *
 * 18 §6: "state what gets audited, before it runs." The overview's plan change
 * does this inside its confirm dialog; on this surface the same contract has to
 * hold for a control with no dialog at all — renaming yourself writes a row to
 * the platform audit log, and the moment to say so is while the reader still
 * has the option not to.
 */
export function AuditNote({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-panel px-5 py-4 ${className ?? ''}`}
      /* ⚠ `--surface-sunken`, NOT `#f8fafc`. 03 §2: a raw hex in a component
         file is a defect — it is the one value in the system that cannot follow
         a theme, a tier change or a ground swap, and this block sits on a card
         whose ground is itself a token. The two would drift the first time
         either moved. The padding and radius here are a deliberate change from
         the front-end pass and are kept. */
      style={{ background: 'var(--surface-sunken)' }}
    >
      {children}
    </div>
  );
}

/** One destination in an `AuditNote`. */
export function AuditLine({ children }: { children: React.ReactNode }) {
  return (
    <li className="t-caption flex gap-2" style={{ color: 'var(--text-secondary)' }}>
      <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>
        ·
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}

/**
 * The rail's eyebrow. Uppercase, tracked, mono.
 *
 * ⚠ IT IS `font-medium`, NOT `font-medium`. The two rail headings shipped at
 * 600, which 03 §5 forbids outright — the console's weight ceiling is 500 and
 * the whole reason it exists is that a cream ground turns 600 into something
 * that reads as bold at 11px. Both are corrected here, once.
 */
export function RailEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-4 font-mono text-[10.5px] uppercase"
      style={{ color: 'var(--text-tertiary)', fontWeight: 500, letterSpacing: '0.15em' }}
    >
      {children}
    </p>
  );
}
