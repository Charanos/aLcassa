import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_DOCS, type ProjectDoc } from './documents';

/** Read maintained sources at build time, with an explicit audience boundary. */

const DOCS_DIR = path.join(process.cwd(), 'project-docs');

export function findDoc(slug: string): ProjectDoc | undefined {
  return PROJECT_DOCS.find((doc) => doc.slug === slug);
}

export async function readDoc(slug: string): Promise<string | null> {
  const doc = findDoc(slug);
  if (!doc || doc.audience !== 'client') return null;

  const resolved = path.resolve(DOCS_DIR, `${slug}.md`);
  if (path.dirname(resolved) !== DOCS_DIR) return null;

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
