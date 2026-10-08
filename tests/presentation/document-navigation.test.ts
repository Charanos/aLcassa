import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from '@/components/presentation/Markdown';
import { PROJECT_DOCS } from '@/lib/presentation/documents';
import { clientDocs, readDoc, neighbours } from '@/lib/presentation/readDoc';
import { documentHeadingId, resolveDocumentLink } from '@/lib/presentation/documentLinks';

describe('Published project document navigation', () => {
  it('publishes every registered client source and keeps source names unique', async () => {
    const docs = clientDocs();
    expect(new Set(PROJECT_DOCS.map((doc) => doc.slug)).size).toBe(PROJECT_DOCS.length);
    for (const doc of docs) expect(await readDoc(doc.slug)).toMatch(/^#/);
    expect(docs.some((doc) => doc.slug === '25-phase-one-completion-plan')).toBe(true);
    expect(docs.some((doc) => doc.slug === '26-phase-one-verification-ledger')).toBe(true);
  });
  it('refuses private documents, unregistered files and path traversal', async () => {
    expect(await readDoc('01-brief-and-decisions')).toBeNull();
    expect(await readDoc('../.env.local')).toBeNull();
    expect(await readDoc('missing')).toBeNull();
    expect(clientDocs().every((doc) => doc.audience === 'client')).toBe(true);
  });
  it('keeps previous and next navigation in the published audience', () => {
    expect(neighbours('00-INDEX').next?.slug).toBe('02-information-architecture');
    expect(neighbours('26-phase-one-verification-ledger').next).toBeNull();
    expect(neighbours('01-brief-and-decisions')).toEqual({ previous: null, next: null });
  });
  it('resolves maintained Markdown links and their fragment to actual document routes', () => {
    expect(
      resolveDocumentLink(
        '26-phase-one-verification-ledger.md#11-execution-evidence-6-october-2026',
      ),
    ).toEqual({
      kind: 'link',
      href: '/docs/26-phase-one-verification-ledger#11-execution-evidence-6-october-2026',
    });
    expect(resolveDocumentLink('../verification/security/README.md')).toEqual({
      kind: 'link',
      href: '/project-tracker/security',
    });
  });
  it('labels unavailable historical artifacts without exposing fake download links', () => {
    const html = renderToStaticMarkup(
      createElement(Markdown, {
        source:
          '[Readback](../.test-report/private.json) and [Internal](01-brief-and-decisions.md)',
      }),
    );
    expect(html).toContain('Historical local artifact; not published');
    expect(html).toContain('Internal working document');
    expect(html).not.toContain('href=');
  });
  it('refuses unsafe protocols and unregistered source links', () => {
    for (const href of [
      'javascript:alert(1)',
      'file:///private',
      '//untrusted.invalid',
      '../private.md',
      '/docs/private',
    ])
      expect(resolveDocumentLink(href).kind).toBe('unavailable');
  });
  it('gives formatted and repeated headings stable, unique anchor targets', () => {
    expect(documentHeadingId('11. Execution evidence — 6 October 2026')).toBe(
      '11-execution-evidence--6-october-2026',
    );
    const html = renderToStaticMarkup(
      createElement(Markdown, { source: '# First\n\n## **Repeated** title\n\n## Repeated title' }),
    );
    expect(html).toContain('id="repeated-title"');
    expect(html).toContain('id="repeated-title-1"');
  });
  it('resolves the complete maintained client document link graph', async () => {
    const pages = new Map<string, string>();
    for (const doc of clientDocs())
      pages.set(
        doc.slug,
        renderToStaticMarkup(createElement(Markdown, { source: (await readDoc(doc.slug))! })),
      );
    for (const html of pages.values()) {
      for (const match of html.matchAll(/href="\/docs\/([\w-]+)(?:#([^"<>]+))?"/g)) {
        const target = pages.get(match[1]!);
        expect(target, `Missing published route ${match[1]}`).toBeDefined();
        if (match[2])
          expect(target, `Missing heading ${match[1]}#${match[2]}`).toContain(`id="${match[2]}"`);
      }
      expect(html).not.toMatch(/href="[^"<>]*(?:\.md|\.test-report|\.screenshots)/);
    }
  });
});
