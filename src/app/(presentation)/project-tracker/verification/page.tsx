import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { IconArrowLeft, IconArrowUpRight, IconCheck, IconFileDownload } from '@tabler/icons-react';
import record from '@/lib/presentation/verificationRecord.json';
import { MILESTONES, MILESTONE_PROGRESS_REVIEW } from '@/lib/presentation/engagement';

export const metadata: Metadata = {
  title: 'Verification record · aLcassa',
  description:
    'Recorded test results, release checks, browser evidence and remaining Phase One gates.',
  robots: { index: false, follow: false },
};

export default function VerificationRecordPage() {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-[1200px] px-5 py-10 pb-24 text-[var(--text-primary)] md:px-8 md:py-14"
    >
      <Link
        href="/project-tracker"
        className="t-compact inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-action)]"
      >
        <IconArrowLeft size={16} aria-hidden /> Project tracker
      </Link>
      <header className="mt-10 border-b border-[var(--border-subtle)] pb-10">
        <p className="t-eyebrow text-[var(--text-tertiary)]">Phase One · {record.date}</p>
        <h1 className="display display-lg mt-3 tracking-tight">Verification record</h1>
        <p className="t-body mt-5 text-[var(--text-secondary)]">
          Current local verification and the qualified CI reference checkpoint, with the work still
          required for acceptance. Each result identifies its environment and source; browser images
          come from disposable test data.
        </p>
        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
          <Link
            href="/docs/26-phase-one-verification-ledger"
            className="t-compact inline-flex items-center gap-2 text-[var(--text-action)] underline underline-offset-4"
          >
            Full verification ledger <IconArrowUpRight size={16} aria-hidden />
          </Link>
          <Link
            href="/docs/25-phase-one-completion-plan"
            className="t-compact inline-flex items-center gap-2 text-[var(--text-action)] underline underline-offset-4"
          >
            Completion plan <IconArrowUpRight size={16} aria-hidden />
          </Link>
          <a
            href="/verification/2026-10-08/manifest.json"
            download
            className="t-compact inline-flex items-center gap-2 text-[var(--text-action)] underline underline-offset-4"
          >
            Download evidence index <IconFileDownload size={16} aria-hidden />
          </a>
        </div>
      </header>

      <section aria-labelledby="checkpoint-title" className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="checkpoint-title" className="t-heading">
            Verification checkpoints
          </h2>
          <p className="t-compact text-[var(--text-secondary)]">
            Development and disposable CI environments
          </p>
        </div>
        <dl className="surface-sunken mt-5 grid gap-px overflow-hidden rounded-panel border border-[var(--border-subtle)] sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            value={`${record.localCandidate.passed}`}
            label="Current local cases passed"
            detail={`${record.localCandidate.files} files · no failures or skips`}
          />
          <Metric
            value={`${record.service.databaseCases}`}
            label="Service database cases"
            detail={`${record.service.unitCases} additional unit / schema cases`}
          />
          <Metric
            value={`${record.service.bridgeChecks + record.service.propagationChecks}`}
            label="Checks across both runtimes"
            detail="5 credential checks · 12 publish / restore samples"
          />
          <Metric
            value={`${record.service.maximumPropagationMs} ms`}
            label="Slowest CI propagation sample"
            detail="12 samples · five-second budget · not load p95"
          />
        </dl>
        <div className="mt-6 rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-5 md:p-6">
          <h3 className="t-heading">Current local regression</h3>
          <p className="t-compact mt-3 text-[var(--text-secondary)]">
            {record.localCandidate.environment}. The tracker/evidence follow-up adds five checks for
            redaction, reconciled totals, safe paths, revoked fixtures and published fingerprints,
            plus eight document navigation checks. Verified before publication on baseline{' '}
            <code>{record.localCandidate.baseCommit.slice(0, 7)}</code>.
          </p>
          <div className="t-compact mt-4">
            <EvidenceDownload
              href={record.localCandidate.results.path}
              label={`${record.localCandidate.passed}-case local catalogue`}
            />
            <Digest value={record.localCandidate.results.sha256} />
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Release
            title="Application CI reference"
            commit={record.application.commit}
            ci={record.application.ci}
            jobs={record.application.jobs}
          >
            <p>
              Cache-disabled results include tenancy, account flows, subscriptions, credentials,
              rules and safe Activity projections.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              <EvidenceDownload
                href={record.application.results.path}
                label="506-case test catalogue"
              />
              <a
                href={record.application.deployment}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-action)] underline underline-offset-4"
              >
                Verified deployment
              </a>
            </div>
            <Digest value={record.application.results.sha256} />
          </Release>
          <Release
            title="FastAPI service"
            commit={record.service.commit}
            ci={record.service.ci}
            jobs={record.service.jobs}
          >
            <p>
              Pinned to application {record.service.pinnedApplicationCommit.slice(0, 7)}. Actual
              credential, scope, revocation, conditional-read and publication checks run against the
              restricted database role.
            </p>
            <p className="mt-3">
              Runtime audit: {record.service.audit.dependencies} dependencies,{' '}
              {record.service.audit.vulnerableDependencies} vulnerable dependencies. Hosted topology
              remains an open gate.
            </p>
            <div className="mt-4">
              <EvidenceDownload
                href={record.service.results.path}
                label="Measured service samples"
              />
            </div>
            <Digest value={record.service.results.sha256} />
          </Release>
        </div>
      </section>

      <section
        aria-labelledby="progress-title"
        className="mt-14 border-t border-[var(--border-subtle)] pt-10"
      >
        <h2 id="progress-title" className="t-heading text-right">
          Milestone reassessment
        </h2>
        <p className="t-body mt-3 text-[var(--text-secondary)]">
          Implementation estimates now reflect the verified work below. These percentages describe
          engineering progress; a milestone remains in progress until its outstanding gates and
          demonstration are complete.
        </p>
        <div className="mt-6 grid gap-4">
          {Object.entries(MILESTONE_PROGRESS_REVIEW).map(([id, review]) => {
            const milestone = MILESTONES.find((item) => item.id === id)!;
            return (
              <article
                key={id}
                id={`milestone-${id}`}
                className="scroll-mt-8 rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-7"
              >
                <header className="flex flex-wrap items-baseline justify-between gap-3">
                  <h3 className="t-heading">{milestone.name}</h3>
                  <p className="numeric text-[var(--text-secondary)]">
                    {review.previous}% →{' '}
                    <span className="text-[var(--text-primary)]">{milestone.progress}%</span>
                  </p>
                </header>
                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="t-eyebrow text-[var(--success-fg)]">Verified work</h4>
                    <ul className="t-compact mt-3 grid gap-3 text-[var(--text-secondary)]">
                      {review.evidence.map((item) => (
                        <li key={item} className="flex gap-2">
                          <IconCheck
                            size={16}
                            className="mt-0.5 shrink-0 text-[var(--success-fg)]"
                            aria-hidden
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-overlay bg-[var(--surface-inset)] p-4">
                    <h4 className="t-eyebrow text-[var(--text-secondary)]">
                      Remaining for acceptance
                    </h4>
                    <ul className="t-compact mt-3 grid gap-3 text-[var(--text-secondary)]">
                      {review.remaining.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section
        aria-labelledby="browser-title"
        className="mt-14 border-t border-[var(--border-subtle)] pt-10"
      >
        <h2 id="browser-title" className="t-heading">
          Browser evidence
        </h2>
        <p className="t-body mt-3 text-[var(--text-secondary)]">
          {record.browser.environment}. Publication, comparison, restore/cancel, stale-draft
          preservation, keyboard focus and desktop/phone layout were replayed against recorded
          state.
        </p>
        <p className="t-compact mt-3 text-[var(--text-secondary)]">{record.browser.cleanup}</p>
        <div className="t-compact mt-4 text-[var(--text-secondary)]">
          <EvidenceDownload
            href={record.browser.credentials.path}
            label="Credential lifecycle and focus readbacks"
          />
          <p className="mt-2">
            Creation, replacement grace and revocation were independently checked against the
            database and live service. Clipboard readback remains open.
          </p>
          <Digest value={record.browser.credentials.sha256} />
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {record.browser.images.map((item) => (
            <figure
              key={item.path}
              className="min-w-0 overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)]"
            >
              <a
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open full image: ${item.title}`}
                className="block bg-[var(--surface-inset)] p-3 focus-visible:outline-2 focus-visible:outline-[var(--border-focus)]"
              >
                <Image
                  src={item.path}
                  alt={item.title}
                  width={item.width}
                  height={item.height}
                  sizes="(max-width: 767px) 100vw, 50vw"
                  className="h-64 w-full object-contain"
                />
              </a>
              <figcaption className="p-5">
                <h3 className="t-compact font-medium">{item.title}</h3>
                <p className="t-compact mt-1 text-[var(--text-secondary)]">
                  {item.context} · open to inspect at full size
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <footer className="mt-14 border-t border-[var(--border-subtle)] pt-7">
        <p className="t-body text-[var(--text-secondary)]">
          Phase One remains in verification. Shared rate budgets, usage persistence, hosted service,
          full surface/accessibility coverage, provider delivery, monitoring, load, backup
          restoration and final handover still require evidence.
        </p>
        <p className="t-compact mt-4 text-[var(--text-tertiary)]">
          Downloads contain selected test metadata and measured outcomes. Raw logs, account
          credentials, private fixtures and provider secrets are excluded.
        </p>
      </footer>
    </main>
  );
}

function Metric({ value, label, detail }: { value: string; label: string; detail: string }) {
  return (
    <div className="min-w-0 bg-[var(--surface-inset)] p-5 md:p-6">
      <dt className="t-compact text-[var(--text-secondary)]">{label}</dt>
      <dd className="numeric mt-3 text-3xl tracking-tight">{value}</dd>
      <dd className="t-compact mt-3 text-[var(--text-tertiary)]">{detail}</dd>
    </div>
  );
}
function Release({
  title,
  commit,
  ci,
  jobs,
  children,
}: {
  title: string;
  commit: string;
  ci: string;
  jobs: number;
  children: React.ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5 md:p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="t-heading">{title}</h3>
        <a
          href={ci}
          target="_blank"
          rel="noopener noreferrer"
          className="t-compact inline-flex items-center gap-1 text-[var(--text-action)] underline underline-offset-4"
        >
          {jobs} CI jobs passed <IconArrowUpRight size={15} aria-hidden />
        </a>
      </header>
      <p className="t-compact mt-3 text-[var(--text-tertiary)]">
        Verified source <code>{commit.slice(0, 7)}</code>
      </p>
      <div className="t-compact mt-4 text-[var(--text-secondary)]">{children}</div>
    </article>
  );
}
function EvidenceDownload({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 text-[var(--text-action)] underline underline-offset-4"
    >
      {label} <IconFileDownload size={16} aria-hidden />
    </a>
  );
}
function Digest({ value }: { value: string }) {
  return (
    <details className="t-compact mt-4 text-[var(--text-tertiary)]">
      <summary className="cursor-pointer">File fingerprint</summary>
      <p className="mt-2 font-mono text-xs break-all">SHA-256 · {value}</p>
    </details>
  );
}
