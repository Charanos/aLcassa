import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_DOCS, type ProjectDoc } from './documents';

/**
 * Reads a document out of `project-docs/` at build time.
 *
 * The markdown is the SAME FILE the team edits. There is no copy, no export
 * step and no second version that can go stale, which matters because document
 * 12 makes documentation a contracted deliverable with an acceptance test: a
 * stale document is a failed gate rather than an inconvenience.
 *
 * The internal document is refused here as well as filtered from the index, so
 * that guessing its URL does not reach it either. A filter that only hides a
 * link is not a control.
 */

const DOCS_DIR = path.join(process.cwd(), 'project-docs');

export function findDoc(slug: string): ProjectDoc | undefined {
  return PROJECT_DOCS.find((doc) => doc.slug === slug);
}

export async function readDoc(slug: string): Promise<string | null> {
  const doc = findDoc(slug);
  if (!doc || doc.audience !== 'client') return null;

  // The slug comes from a static param generated from the list above, but the
  // resolved path is checked against the directory anyway: a path traversal
  // that cannot happen today is a path traversal that happens after the next
  // refactor.
  const resolved = path.resolve(DOCS_DIR, `${slug}.md`);
  if (!resolved.startsWith(path.resolve(DOCS_DIR))) return null;

  try {
    return await readFile(resolved, 'utf8');
  } catch {
    return null;
  }
}

export function clientDocs(): ProjectDoc[] {
  return PROJECT_DOCS.filter((doc) => doc.audience === 'client');
}

export function neighbours(slug: string): {
  previous: ProjectDoc | null;
  next: ProjectDoc | null;
} {
  const docs = clientDocs();
  const index = docs.findIndex((doc) => doc.slug === slug);
  if (index === -1) return { previous: null, next: null };

  return {
    previous: index > 0 ? (docs[index - 1] ?? null) : null,
    next: index < docs.length - 1 ? (docs[index + 1] ?? null) : null,
  };
}
