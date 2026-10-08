import { PROJECT_DOCS } from './documents';

export type DocumentLink = { kind: 'link'; href: string } | { kind: 'unavailable'; reason: string };

/** Resolve only published routes; retain private and local artifacts as labelled references. */
export function resolveDocumentLink(href: string | undefined): DocumentLink {
  if (!href) return { kind: 'unavailable', reason: 'Reference only' };
  if (/^https?:\/\//i.test(href) || href.startsWith('#')) return { kind: 'link', href };
  if (href.startsWith('/project-tracker') || href.startsWith('/verification/'))
    return { kind: 'link', href };
  if (href === '../verification/security/README.md')
    return { kind: 'link', href: '/project-tracker/security' };
  if (/^\.\.\/\.(?:test-report|screenshots)\//.test(href))
    return { kind: 'unavailable', reason: 'Historical local artifact; not published' };
  const match = /^(?:\.\/|\.\.\/project-docs\/|\/docs\/)?([\w-]+)(?:\.md)?(#[^?]*)?$/.exec(href);
  if (match) {
    const doc = PROJECT_DOCS.find((entry) => entry.slug === match[1]);
    if (doc?.audience === 'client')
      return { kind: 'link', href: `/docs/${doc.slug}${match[2] ?? ''}` };
    if (doc) return { kind: 'unavailable', reason: 'Internal working document' };
  }
  return { kind: 'unavailable', reason: 'Source reference; not published' };
}

/** Stable heading identifiers follow the Markdown anchor convention. */
export function documentHeadingId(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}
