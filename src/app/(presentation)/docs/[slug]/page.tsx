import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { IconArrowLeft, IconArrowRight, IconArrowNarrowLeft } from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
import { Markdown } from '@/components/presentation/Markdown';
import { ThemeToggle } from '@/components/primitives/ThemeToggle';
import { getThemePreference, resolveTheme } from '@/lib/theme';
import { clientDocs, findDoc, neighbours, readDoc } from '@/lib/presentation/readDoc';

export const dynamicParams = false;

export function generateStaticParams() {
  return clientDocs().map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = findDoc(slug);
  if (!doc) return { title: 'Not found' };

  return {
    title: `${doc.n} · ${doc.title}`,
    description: doc.settles,
    robots: { index: false, follow: false },
  };
}

/**
 * A document, rendered from the same markdown file the team edits. See
 * src/lib/presentation/readDoc.ts for why there is no copy of it anywhere.
 *
 * The layout is a drawing sheet: a fixed index down the left, the document in a
 * single measured column, and a title block above. Prose caps at 62 characters
 * per sheet 02, so the reading measure holds regardless of viewport width.
 */
export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const doc = findDoc(slug);
  const source = await readDoc(slug);

  if (!doc || !source) notFound();

  const theme = await resolveTheme(await getThemePreference());
  const { previous, next } = neighbours(slug);
  const all = clientDocs();

  return (
    <div style={{ background: 'var(--surface-page)' }}>
      <header
        className="sticky top-0 z-30 border-b"
        style={{ background: 'var(--surface-page)', borderColor: 'var(--rule-base)' }}
      >
        <div
          className="mx-auto flex h-14 items-center gap-4 px-5 md:px-8"
          style={{ maxWidth: 'var(--surface-width)' }}
        >
          <Link href="/project-tracker" className="flex items-center gap-2.5">
            <Mark size={20} />
            <span className="t-chip text-[var(--ink-primary)]">aLcassa</span>
          </Link>

          <Link
            href="/project-tracker#documents"
            className="t-eyebrow ml-2 flex items-center gap-1.5 text-[var(--ink-tertiary)] hover:text-[var(--copper-ink)]"
          >
            <IconArrowNarrowLeft size={14} stroke={1.5} aria-hidden />
            Documentation set
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <span className="t-eyebrow hidden text-[var(--ink-faint)] md:block">
              Document {doc.n}
            </span>
            <ThemeToggle theme={theme} />
          </div>
        </div>
      </header>

      <div
        className="mx-auto flex gap-10 px-5 pb-24 md:px-8"
        style={{ maxWidth: 'var(--surface-width)' }}
      >
        {/* The index, fixed. A reader in a review meeting jumps between
            documents constantly, and a back-and-forth through the hub would
            lose their place every time. */}
        <nav
          aria-label="Documentation set"
          className="sticky top-20 hidden h-fit w-56 shrink-0 self-start py-10 lg:block"
        >
          <h2 className="t-eyebrow text-[var(--ink-faint)]">Documents</h2>
          <ul className="mt-3 grid gap-0.5">
            {all.map((entry) => {
              const current = entry.slug === slug;
              return (
                <li key={entry.slug}>
                  <Link
                    href={`/docs/${entry.slug}`}
                    aria-current={current ? 'page' : undefined}
                    className="t-caption flex gap-2 rounded-chip px-2 py-1.5 transition-colors duration-[var(--motion-fade)] hover:bg-[var(--surface-hover)]"
                    style={{
                      color: current ? 'var(--copper-ink)' : 'var(--ink-secondary)',
                      background: current ? 'var(--copper-tint)' : undefined,
                    }}
                  >
                    <span className="t-data shrink-0 text-[var(--ink-faint)]">{entry.n}</span>
                    <span className="min-w-0">{entry.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main id="main" className="min-w-0 flex-1 py-10">
          <div className="flex items-baseline gap-3">
            <span className="t-eyebrow text-[var(--copper-ink)]">{doc.source}</span>
            <span className="t-eyebrow text-[var(--ink-faint)]">{doc.band}</span>
          </div>
          <p
            className="t-lede mt-3 text-[var(--ink-secondary)]"
            style={{ maxWidth: 'var(--measure-prose)' }}
          >
            {doc.settles}
          </p>

          <hr className="my-8 border-0 border-t" style={{ borderColor: 'var(--rule-strong)' }} />

          <article>
            <Markdown source={source} />
          </article>

          <nav
            aria-label="Adjacent documents"
            className="mt-14 flex flex-wrap gap-3 border-t pt-6"
            style={{ borderColor: 'var(--rule-strong)' }}
          >
            {previous ? (
              <Link
                href={`/docs/${previous.slug}`}
                className="t-compact flex flex-1 items-center gap-3 rounded-panel border p-4 transition-colors duration-[var(--motion-fade)] hover:border-[var(--copper-rule)] hover:bg-[var(--copper-tint)]"
                style={{ borderColor: 'var(--rule-base)', minWidth: '240px' }}
              >
                <IconArrowLeft size={16} stroke={1.5} aria-hidden className="text-[var(--ink-faint)]" />
                <span>
                  <span className="t-eyebrow block text-[var(--ink-faint)]">Previous</span>
                  <span className="text-[var(--ink-primary)]">
                    {previous.n} · {previous.title}
                  </span>
                </span>
              </Link>
            ) : null}

            {next ? (
              <Link
                href={`/docs/${next.slug}`}
                className="t-compact flex flex-1 items-center justify-end gap-3 rounded-panel border p-4 text-right transition-colors duration-[var(--motion-fade)] hover:border-[var(--copper-rule)] hover:bg-[var(--copper-tint)]"
                style={{ borderColor: 'var(--rule-base)', minWidth: '240px' }}
              >
                <span>
                  <span className="t-eyebrow block text-[var(--ink-faint)]">Next</span>
                  <span className="text-[var(--ink-primary)]">
                    {next.n} · {next.title}
                  </span>
                </span>
                <IconArrowRight size={16} stroke={1.5} aria-hidden className="text-[var(--ink-faint)]" />
              </Link>
            ) : null}
          </nav>
        </main>
      </div>
    </div>
  );
}
