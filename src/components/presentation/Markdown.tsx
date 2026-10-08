import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React, { Children, createElement, isValidElement, type ReactNode } from 'react';
import { documentHeadingId, resolveDocumentLink } from '@/lib/presentation/documentLinks';

/** Render maintained Markdown with shared typography and published-route links. */

function nodeText(node: ReactNode): string {
  return Children.toArray(node)
    .map((child) => {
      if (typeof child === 'string' || typeof child === 'number') return String(child);
      return isValidElement<{ children?: ReactNode }>(child) ? nodeText(child.props.children) : '';
    })
    .join('');
}

const components: Components = {
  p: ({ children }) => (
    <p className="t-body my-3.5 [overflow-wrap:anywhere] text-[var(--text-secondary)]">
      {children}
    </p>
  ),

  a: ({ href, children }) => {
    const target = resolveDocumentLink(href);
    if (target.kind === 'unavailable')
      return (
        <span className="text-[var(--text-secondary)]">
          {children}{' '}
          <span className="t-caption text-[var(--text-tertiary)]">({target.reason})</span>
        </span>
      );
    return (
      <a
        href={target.href}
        className="[overflow-wrap:anywhere] text-[var(--blue-500)] underline decoration-[var(--blue-200)] underline-offset-2 hover:decoration-[var(--blue-500)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--border-focus)]"
      >
        {children}
      </a>
    );
  },

  ul: ({ children }) => <ul className="my-3.5 grid list-disc gap-1.5 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-3.5 grid list-decimal gap-1.5 pl-5">{children}</ol>,
  li: ({ children }) => <li className="t-body text-[var(--text-secondary)]">{children}</li>,

  // Preserve the design system's single-weight emphasis.
  strong: ({ children }) => (
    <strong className="font-normal text-[var(--text-primary)]">{children}</strong>
  ),
  em: ({ children }) => <em className="font-serif not-italic">{children}</em>,

  blockquote: ({ children }) => (
    <blockquote
      className="my-5 border-l-[3px] py-1 pl-4"
      style={{ borderColor: 'var(--blue-200)' }}
    >
      {children}
    </blockquote>
  ),

  hr: () => (
    <hr className="my-8 border-0 border-t" style={{ borderColor: 'var(--border-subtle)' }} />
  ),

  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) return <code className={className}>{children}</code>;

    return (
      <code
        className="t-code rounded-chip px-1.5 py-0.5"
        style={{ background: 'var(--surface-sunken)', color: 'var(--text-primary)' }}
      >
        {children}
      </code>
    );
  },

  pre: ({ children }) => (
    <pre
      className="t-code my-5 overflow-x-auto rounded-panel border p-4"
      tabIndex={0}
      aria-label="Code example"
      style={{
        background: 'var(--surface-sunken)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      {children}
    </pre>
  ),

  // Contain wide tables within a keyboard-accessible scroll region.
  table: ({ children }) => (
    <div
      className="my-5 overflow-x-auto rounded-panel border"
      tabIndex={0}
      role="region"
      aria-label="Document table"
      style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
    >
      <table className="w-full min-w-[720px] border-collapse text-left [overflow-wrap:normal]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ background: 'var(--surface-sunken)' }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th
      scope="col"
      className="t-micro border-b px-3.5 py-2.5 text-[var(--text-tertiary)]"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {children}
    </th>
  ),
  tr: ({ children }) => (
    <tr className="border-b last:border-b-0" style={{ borderColor: 'var(--ink-100)' }}>
      {children}
    </tr>
  ),
  td: ({ children }) => (
    <td className="t-compact px-3.5 py-2.5 align-top text-[var(--text-secondary)]">{children}</td>
  ),

  img: ({ src, alt }) =>
    typeof src === 'string' ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ''} className="my-5 max-w-full rounded-panel" />
    ) : null,
};

export function Markdown({ source }: { source: string }) {
  const ids = new Map<string, number>();
  const headings = Object.fromEntries(
    (['h1', 'h2', 'h3', 'h4'] as const).map((tag) => [
      tag,
      ({ children }: { children?: ReactNode }) => {
        const base = documentHeadingId(nodeText(children));
        const count = ids.get(base) ?? 0;
        ids.set(base, count + 1);
        const classes = {
          h1: 't-title mb-6 scroll-mt-24 text-[var(--text-primary)]',
          h2: 't-heading mt-12 mb-4 scroll-mt-24 border-t border-[var(--border-subtle)] pt-7 text-[var(--text-primary)]',
          h3: 't-panel mt-8 mb-3 scroll-mt-24 text-[var(--text-primary)]',
          h4: 't-micro mt-6 mb-2 scroll-mt-24 text-[var(--text-tertiary)]',
        };
        return createElement(
          tag,
          { id: count ? `${base}-${count}` : base, className: classes[tag] },
          children,
        );
      },
    ]),
  ) as Components;
  return (
    <div data-slot="markdown" className="min-w-0 [overflow-wrap:anywhere]">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ ...components, ...headings }}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
