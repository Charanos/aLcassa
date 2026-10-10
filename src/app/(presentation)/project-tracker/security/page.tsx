import type { Metadata } from 'next';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { TrackerNavigation } from '@/components/presentation/TrackerNavigation';
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
    <main id="main" className="mx-auto w-full max-w-[1080px] px-5 py-12 pb-24 md:px-8">
      <TrackerNavigation current="security" />
      <header className="mt-10 mb-8 border-b border-[var(--border-subtle)] pb-8">
        <p className="t-eyebrow text-[var(--text-tertiary)]">
          PHASE ONE · MAINTAINED SECURITY REFERENCE
        </p>
        <h1
          id="dependency-security-verification"
          className="display display-lg mt-3 tracking-tight"
        >
          Dependency review
        </h1>
        <p className="t-body mt-4 text-[var(--text-secondary)]">
          This source explains the reviewed dependency remediation. Exact release checks and
          remaining acceptance gates are recorded separately; it is not a claim of comprehensive
          security certification.
        </p>
      </header>
      <dl className="mb-8 grid divide-y divide-[var(--border-subtle)] rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-inset)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {[
          [
            'Reviewed scope',
            'Application dependencies',
            'Package audit, installed patch and adversarial regression checks.',
          ],
          [
            'Maintained remediation',
            'One local security patch',
            'The upstream advisory remains visible; it is not dismissed.',
          ],
          [
            'Acceptance boundary',
            'Release checks still apply',
            'A dependency review does not certify the entire platform.',
          ],
        ].map(([label, value, detail]) => (
          <div key={label} className="min-w-0 p-5">
            <dt className="t-caption text-[var(--text-tertiary)]">{label}</dt>
            <dd className="t-compact mt-3">{value}</dd>
            <dd className="t-caption mt-2 text-[var(--text-secondary)]">{detail}</dd>
          </div>
        ))}
      </dl>
      <h2 className="t-heading mb-5">Maintained verification notes</h2>
      <article className="rounded-card border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-8">
        <Markdown source={source.replace(/^# [^\n]+\n/, '')} />
      </article>
    </main>
  );
}
