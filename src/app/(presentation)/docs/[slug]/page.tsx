import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react';
import { TrackerNavigation } from '@/components/presentation/TrackerNavigation';
import { Markdown } from '@/components/presentation/Markdown';
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
  if (!doc || doc.audience !== 'client') return { title: 'Not found' };

  return {
    title: `${doc.n} · ${doc.title}`,
    description: doc.settles,
    robots: { index: false, follow: false },
  };
}

/** Render the maintained Markdown source in the shared documentation layout. */
export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const doc = findDoc(slug);
  const source = await readDoc(slug);

  if (!doc || !source) notFound();

  const { previous, next } = neighbours(slug);
  const all = clientDocs();

  return (
    <div style={{ background: 'var(--surface-base)' }}>
      <div className="mx-auto w-full max-w-[1080px] px-5 pt-10 md:px-8">
        <TrackerNavigation current="documents" />
      </div>

      <div className="mx-auto px-5 pb-24 md:px-8" style={{ maxWidth: 1080 }}>
        <main id="main" className="min-w-0 flex-1 py-10">
          <details className="mb-8 border-b border-[var(--border-subtle)] pb-5">
            <summary className="t-compact cursor-pointer text-[var(--text-primary)]">
              Browse documents · {all.length}
            </summary>
            <nav
              aria-label="Documentation set"
              className="mt-4 grid gap-1 sm:grid-cols-2 lg:grid-cols-3"
            >
              {all.map((entry) => (
                <Link
                  key={entry.slug}
                  href={`/docs/${entry.slug}`}
                  aria-current={entry.slug === slug ? 'page' : undefined}
                  className="t-caption flex gap-3 rounded-chip px-2 py-2 hover:bg-[var(--surface-inset)] focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  <span className="t-data text-[var(--text-tertiary)]">{entry.n}</span>
                  <span>{entry.title}</span>
                </Link>
              ))}
            </nav>
          </details>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
            <span className="t-eyebrow text-[var(--blue-500)]">
              Document {doc.n} · {doc.source}
            </span>
            <span className="t-eyebrow text-[var(--ink-300)]">{doc.band}</span>
          </div>
          <p className="t-lede mt-3 text-[var(--text-secondary)]">{doc.settles}</p>

          <hr className="my-8 border-0 border-t" style={{ borderColor: 'var(--border-strong)' }} />

          <article className="rounded-card border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-8">
            <Markdown source={source} />
          </article>

          <nav
            aria-label="Adjacent documents"
            className="mt-10 grid gap-4 border-t pt-6 sm:grid-cols-2"
            style={{ borderColor: 'var(--border-strong)' }}
          >
            {previous ? (
              <Link
                href={`/docs/${previous.slug}`}
                className="t-compact flex min-w-0 items-center gap-3 py-3 hover:text-[var(--text-action)] focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <IconArrowLeft
                  size={16}
                  stroke={1.5}
                  aria-hidden
                  className="shrink-0 text-[var(--ink-300)]"
                />
                <span className="min-w-0">
                  <span className="t-eyebrow block text-[var(--ink-300)]">Previous</span>
                  <span className="text-[var(--text-primary)]">
                    {previous.n} · {previous.title}
                  </span>
                </span>
              </Link>
            ) : null}

            {next ? (
              <Link
                href={`/docs/${next.slug}`}
                className="t-compact flex min-w-0 items-center justify-end gap-3 py-3 text-right hover:text-[var(--text-action)] focus-visible:outline-2 focus-visible:outline-offset-4"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span className="min-w-0">
                  <span className="t-eyebrow block text-[var(--ink-300)]">Next</span>
                  <span className="text-[var(--text-primary)]">
                    {next.n} · {next.title}
                  </span>
                </span>
                <IconArrowRight
                  size={16}
                  stroke={1.5}
                  aria-hidden
                  className="shrink-0 text-[var(--ink-300)]"
                />
              </Link>
            ) : null}
          </nav>
        </main>
      </div>
    </div>
  );
}
