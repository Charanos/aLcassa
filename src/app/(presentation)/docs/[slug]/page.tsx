import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { IconArrowLeft, IconArrowRight, IconArrowNarrowLeft } from '@tabler/icons-react';
import { Mark } from '@/components/brand/Mark';
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
      <header
        className="sticky top-0 z-30 border-b"
        style={{ background: 'var(--surface-base)', borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="mx-auto flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 md:px-8"
          style={{ maxWidth: 'var(--surface-width)' }}
        >
          <Link href="/project-tracker" className="flex items-center gap-2.5">
            <Mark size={20} />
            <span className="t-chip text-[var(--text-primary)]">aLcassa</span>
          </Link>

          <Link
            href="/project-tracker#documents"
            className="t-eyebrow ml-2 flex items-center gap-1.5 text-[var(--text-tertiary)] hover:text-[var(--blue-500)]"
          >
            <IconArrowNarrowLeft size={14} stroke={1.5} aria-hidden />
            Documentation set
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/project-tracker/verification"
              className="t-caption text-[var(--text-action)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-4"
            >
              Verification record
            </Link>
            <span className="t-eyebrow hidden text-[var(--ink-300)] md:block">
              Document {doc.n}
            </span>
          </div>
        </div>
      </header>

      <div
        className="mx-auto flex gap-10 px-5 pb-24 md:px-8"
        style={{ maxWidth: 'var(--surface-width)' }}
      >
        {/* Keep the published document index available while reading. */}
        <nav
          aria-label="Documentation set"
          className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] w-56 shrink-0 self-start overflow-y-auto py-5 lg:block"
        >
          <h2 className="t-eyebrow text-[var(--ink-300)]">Documents</h2>
          <ul className="mt-3 grid gap-0.5">
            {all.map((entry) => {
              const current = entry.slug === slug;
              return (
                <li key={entry.slug}>
                  <Link
                    href={`/docs/${entry.slug}`}
                    aria-current={current ? 'page' : undefined}
                    className="t-caption flex gap-2 rounded-chip px-2 py-1.5 transition-colors duration-[var(--motion-fade)] hover:bg-[var(--surface-inset)]"
                    style={{
                      color: current ? 'var(--blue-500)' : 'var(--text-secondary)',
                      background: current ? 'var(--blue-50)' : undefined,
                    }}
                  >
                    <span className="t-data shrink-0 text-[var(--ink-300)]">{entry.n}</span>
                    <span className="min-w-0">{entry.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main id="main" className="min-w-0 flex-1 py-10">
          <details className="mb-8 rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-4 lg:hidden">
            <summary className="t-compact cursor-pointer text-[var(--text-primary)]">
              Browse documents · {all.length}
            </summary>
            <nav aria-label="Mobile documentation set" className="mt-4 grid gap-1">
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
          <div className="flex items-baseline gap-3">
            <span className="t-eyebrow text-[var(--blue-500)]">{doc.source}</span>
            <span className="t-eyebrow text-[var(--ink-300)]">{doc.band}</span>
          </div>
          <p className="t-lede mt-3 text-[var(--text-secondary)]">{doc.settles}</p>

          <hr className="my-8 border-0 border-t" style={{ borderColor: 'var(--border-strong)' }} />

          <article className="rounded-card border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-8">
            <Markdown source={source} />
          </article>

          <nav
            aria-label="Adjacent documents"
            className="mt-14 flex flex-wrap gap-3 border-t pt-6"
            style={{ borderColor: 'var(--border-strong)' }}
          >
            {previous ? (
              <Link
                href={`/docs/${previous.slug}`}
                className="t-compact flex flex-1 items-center gap-3 rounded-panel border p-4 transition-colors duration-[var(--motion-fade)] hover:border-[var(--blue-200)] hover:bg-[var(--blue-50)]"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <IconArrowLeft
                  size={16}
                  stroke={1.5}
                  aria-hidden
                  className="text-[var(--ink-300)]"
                />
                <span>
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
                className="t-compact flex flex-1 items-center justify-end gap-3 rounded-panel border p-4 text-right transition-colors duration-[var(--motion-fade)] hover:border-[var(--blue-200)] hover:bg-[var(--blue-50)]"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span>
                  <span className="t-eyebrow block text-[var(--ink-300)]">Next</span>
                  <span className="text-[var(--text-primary)]">
                    {next.n} · {next.title}
                  </span>
                </span>
                <IconArrowRight
                  size={16}
                  stroke={1.5}
                  aria-hidden
                  className="text-[var(--ink-300)]"
                />
              </Link>
            ) : null}
          </nav>
        </main>
      </div>
    </div>
  );
}
