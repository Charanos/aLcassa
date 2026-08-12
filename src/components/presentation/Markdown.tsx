import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders a project document in the aLcassa type system.
 *
 * WHY react-markdown RATHER THAN A STRING OF HTML: 04 §7 forbids
 * `dangerouslySetInnerHTML` anywhere in Phase 1. A markdown-to-HTML pipeline
 * would need it. react-markdown builds React elements directly, so the rule
 * holds and there is no sanitiser to get wrong.
 *
 * Every element below maps to a token from sheets 01 and 02. Nothing here
 * introduces a size, a colour or a spacing value of its own, which is why these
 * documents read as part of the same drawing as the rest of the surface.
 */

const components: Components = {
  h1: ({ children }) => (
    <h1 className="t-title mt-10 mb-4 text-[var(--ink-primary)] first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2
      className="t-heading mt-10 mb-3 border-t pt-6 text-[var(--ink-primary)]"
      style={{ borderColor: 'var(--rule-soft)' }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="t-panel mt-7 mb-2 text-[var(--ink-primary)]">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="t-micro mt-6 mb-2 text-[var(--ink-tertiary)]">{children}</h4>
  ),

  p: ({ children }) => (
    <p
      className="t-body my-3.5 text-[var(--ink-secondary)]"
      style={{ maxWidth: 'var(--measure-prose)' }}
    >
      {children}
    </p>
  ),

  a: ({ href, children }) => (
    <a
      href={href}
      className="text-[var(--copper-ink)] underline decoration-[var(--copper-rule)] underline-offset-2 hover:decoration-[var(--copper-ink)]"
    >
      {children}
    </a>
  ),

  ul: ({ children }) => (
    <ul
      className="my-3.5 grid list-disc gap-1.5 pl-5"
      style={{ maxWidth: 'var(--measure-prose)' }}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol
      className="my-3.5 grid list-decimal gap-1.5 pl-5"
      style={{ maxWidth: 'var(--measure-prose)' }}
    >
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="t-body text-[var(--ink-secondary)]">{children}</li>,

  // Emphasis is a FAMILY SWITCH or a step of ink, never a weight change and
  // never an oblique. There is no weight axis in this system. 03 §5.
  strong: ({ children }) => (
    <strong className="font-normal text-[var(--ink-primary)]">{children}</strong>
  ),
  em: ({ children }) => <em className="font-serif not-italic">{children}</em>,

  blockquote: ({ children }) => (
    <blockquote
      className="my-5 border-l-[3px] py-1 pl-4"
      style={{ borderColor: 'var(--copper-rule)' }}
    >
      {children}
    </blockquote>
  ),

  hr: () => <hr className="my-8 border-0 border-t" style={{ borderColor: 'var(--rule-base)' }} />,

  code: ({ className, children }) => {
    const isBlock = Boolean(className);
    if (isBlock) return <code className={className}>{children}</code>;

    return (
      <code
        className="t-code rounded-chip px-1.5 py-0.5"
        style={{ background: 'var(--surface-sunken)', color: 'var(--ink-primary)' }}
      >
        {children}
      </code>
    );
  },

  pre: ({ children }) => (
    <pre
      className="t-code my-5 overflow-x-auto rounded-panel border p-4"
      style={{
        background: 'var(--surface-sunken)',
        borderColor: 'var(--rule-base)',
        color: 'var(--ink-primary)',
      }}
    >
      {children}
    </pre>
  ),

  // Tables carry most of the load in this document set. They scroll inside
  // their own container so the page body never scrolls sideways.
  table: ({ children }) => (
    <div
      className="my-5 overflow-x-auto rounded-panel border"
      style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-raised)' }}
    >
      <table className="w-full border-collapse text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ background: 'var(--surface-sunken)' }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th
      scope="col"
      className="t-micro border-b px-3.5 py-2.5 text-[var(--ink-tertiary)]"
      style={{ borderColor: 'var(--rule-base)' }}
    >
      {children}
    </th>
  ),
  tr: ({ children }) => (
    <tr className="border-b last:border-b-0" style={{ borderColor: 'var(--rule-soft)' }}>
      {children}
    </tr>
  ),
  td: ({ children }) => (
    <td className="t-compact px-3.5 py-2.5 align-top text-[var(--ink-secondary)]">{children}</td>
  ),

  img: ({ src, alt }) =>
    typeof src === 'string' ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt ?? ''} className="my-5 max-w-full rounded-panel" />
    ) : null,
};

export function Markdown({ source }: { source: string }) {
  return (
    <div data-slot="markdown">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
