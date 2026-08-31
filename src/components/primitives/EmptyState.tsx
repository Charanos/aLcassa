import type { Icon as TablerIcon } from '@tabler/icons-react';

/**
 * 03 §9 · §16. "Icon, one-line explanation, one action." In a product whose
 * main surface does not exist yet (01 D-05), empty states ARE most of what a
 * new user sees, so this is a designed surface rather than a fallback.
 *
 * Copy rule from 10 §12: never "nothing here". Say what appears and when, or
 * what the reader can do about it. The `body` prop is required for that
 * reason; there is no version of this component with just a heading.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: TablerIcon;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <Icon size={28} stroke={1.5} aria-hidden className="text-[var(--ink-300)]" />
      <h3 className="t-panel mt-4 text-[var(--text-primary)]">{title}</h3>
      <p className="t-compact mt-1.5 text-[var(--text-tertiary)]" style={{ maxWidth: '38ch' }}>
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/**
 * Sheet 12's other two empty tokens. `EmptyState` above covers
 * `empty.first_run` and `empty.filtered` — a plain surface, because nothing
 * is wrong with the region itself. These two mark a region that IS
 * deliberately different, and the hatch is what carries that: "a plain
 * surface with a sentence marks one that is simply new. Confusing the two is
 * how a working system comes to look broken."
 *
 * `.hatch-slate` / `.hatch-oxide` and their tokens already existed in
 * globals.css with no consumer; these are that consumer.
 */

/** `empty.seam` — a feature boundary, not a failure. Nothing is wrong; this
 *  region simply is not built yet. Slate, because slate informs. */
export function EmptyStateSeam({
  icon: Icon,
  title,
  body,
}: {
  icon: TablerIcon;
  title: string;
  body: string;
}) {
  return (
    <div
      className="hatch-slate flex flex-col items-center rounded-panel px-6 py-14 text-center"
      style={{ border: '1px dashed var(--border-strong)' }}
    >
      <Icon size={28} stroke={1.5} aria-hidden style={{ color: 'var(--ink-600)' }} />
      <h3 className="t-panel mt-4" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="t-compact mt-1.5" style={{ color: 'var(--text-secondary)', maxWidth: '38ch' }}>
        {body}
      </p>
    </div>
  );
}

/** `empty.withheld` — the data exists; this reader cannot see it here. Oxide,
 *  because oxide refuses and the reader must ask someone (usually: open a
 *  support session). */
export function EmptyStateWithheld({
  icon: Icon,
  title,
  body,
}: {
  icon: TablerIcon;
  title: string;
  body: string;
}) {
  return (
    <div
      className="hatch-oxide flex flex-col items-center rounded-panel px-6 py-14 text-center"
      style={{ border: '1px solid color-mix(in oklab, var(--red-500) 38%, var(--surface-base))' }}
    >
      <Icon size={28} stroke={1.5} aria-hidden style={{ color: 'var(--red-500)' }} />
      <h3 className="t-panel mt-4" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="t-compact mt-1.5" style={{ color: 'var(--text-secondary)', maxWidth: '38ch' }}>
        {body}
      </p>
    </div>
  );
}
