import type { ReactNode } from 'react';

/** Settings pair a quiet explanatory column with a distinct working surface. */
export function SettingsSection({
  title,
  standfirst,
  action,
  children,
  flush,
  footer,
}: {
  title?: string;
  standfirst?: string;
  action?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  footer?: ReactNode;
}) {
  return (
    <section className="grid min-w-0 gap-4 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-8">
      <div className="min-w-0 lg:pt-5">
        {title ? (
          <h3
            className="text-md font-medium tracking-[-0.02em]"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
        ) : null}
        {standfirst ? (
          <p
            className="t-compact mt-2 leading-relaxed"
            style={{ color: 'var(--text-secondary)', textWrap: 'pretty' }}
          >
            {standfirst}
          </p>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
      <div
        className="min-w-0 overflow-hidden rounded-panel"
        style={{
          background: 'var(--surface-sunken)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--glass-highlight)',
        }}
      >
        <div className={flush ? '' : 'p-4 sm:p-5'}>{children}</div>
        {footer ? (
          <div
            className="px-4 py-3 sm:px-5"
            style={{
              background: 'transparent',
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );
}
