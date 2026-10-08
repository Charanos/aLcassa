import type { Metadata } from 'next';
import Link from 'next/link';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { IconArrowLeft, IconArrowUpRight } from '@tabler/icons-react';
import { Markdown } from '@/components/presentation/Markdown';

export const metadata: Metadata = {
  title: 'Dependency security record',
  description: 'The maintained dependency remediation reference and its verification boundary.',
  robots: { index: false, follow: false },
};

export default async function SecurityRecordPage() {
  const source = await readFile(
    path.join(process.cwd(), 'verification/security/README.md'),
    'utf8',
  );
  return (
    <main id="main" className="mx-auto w-full max-w-[1200px] px-5 py-12 pb-24 md:px-8">
      <Link
        href="/project-tracker#documents"
        className="t-caption inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-action)]"
      >
        <IconArrowLeft size={16} aria-hidden /> Project documents
      </Link>
      <header className="mt-10 mb-8 border-b border-[var(--border-subtle)] pb-8">
        <p className="t-eyebrow text-[var(--text-tertiary)]">
          PHASE ONE · MAINTAINED SECURITY REFERENCE
        </p>
        <p className="t-body mt-4 text-[var(--text-secondary)]">
          This source explains the reviewed dependency remediation. Exact release checks and
          remaining acceptance gates are recorded separately; it is not a claim of comprehensive
          security certification.
        </p>
        <Link
          href="/project-tracker/verification"
          className="t-compact mt-5 inline-flex items-center gap-2 text-[var(--text-action)] underline underline-offset-4"
        >
          Current verification record <IconArrowUpRight size={16} aria-hidden />
        </Link>
      </header>
      <article className="rounded-card border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-8">
        <Markdown source={source} />
      </article>
    </main>
  );
}
