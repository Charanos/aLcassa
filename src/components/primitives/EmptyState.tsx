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
      <Icon size={28} stroke={1.5} aria-hidden className="text-[var(--ink-faint)]" />
      <h3 className="t-panel mt-4 text-[var(--ink-primary)]">{title}</h3>
      <p className="t-compact mt-1.5 text-[var(--ink-tertiary)]" style={{ maxWidth: '38ch' }}>
        {body}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
