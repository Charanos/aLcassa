import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  IconArrowUpRight,
  IconCheck,
  IconFileDownload,
  IconChevronRight,
} from '@tabler/icons-react';
import record from '@/lib/presentation/verificationRecord.json';
import membership from '@/lib/presentation/membershipVerification.json';
import account from '@/lib/presentation/accountVerification.json';
import ownership from '@/lib/presentation/ownershipVerification.json';
import navigation from '@/lib/presentation/authNavigationVerification.json';
import devices from '@/lib/presentation/deviceSessionsVerification.json';
import hardening from '@/lib/presentation/accountHardeningVerification.json';
import usage from '@/lib/presentation/serviceUsageVerification.json';
import budget from '@/lib/presentation/serviceBudgetVerification.json';
import operational from '@/lib/presentation/operationalGatesVerification.json';
import followup from '@/lib/presentation/operationalFollowupVerification.json';
import workflows from '@/lib/presentation/accountWorkflowsVerification.json';
import evidenceIndex from '@/lib/presentation/phaseOneEvidenceIndex.json';
import { TrackerNavigation } from '@/components/presentation/TrackerNavigation';
import { MILESTONES, MILESTONE_PROGRESS_REVIEW } from '@/lib/presentation/engagement';

export const metadata: Metadata = {
  title: 'Verification record',
  description:
    'Recorded test results, release checks, browser evidence and remaining Phase One gates.',
  robots: { index: false, follow: false },
};

export default function VerificationRecordPage() {
  return (
    <main
      id="main"
      className="mx-auto w-full max-w-[1080px] px-5 py-10 pb-24 text-[var(--text-primary)] md:px-8 md:py-14"
    >
      <TrackerNavigation current="verification" />
      <header className="mt-10 border-b border-[var(--border-subtle)] pb-10">
        <p className="t-eyebrow text-[var(--text-tertiary)]">Phase One · {followup.date}</p>
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
            href={evidenceIndex.manifest.path}
            download
            className="t-compact inline-flex items-center gap-2 text-[var(--text-action)] underline underline-offset-4"
          >
            Download evidence index <IconFileDownload size={16} aria-hidden />
          </a>
          <a
            href="/verification/2026-10-12/google-admin-access-results.json"
            download
            className="t-compact inline-flex items-center gap-2 text-[var(--text-action)] underline underline-offset-4"
          >
            Google acceptance and admin entry <IconFileDownload size={16} aria-hidden />
          </a>
        </div>
        <aside
          aria-label="Qualified reference release"
          className="mt-7 rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-5"
        >
          <p className="t-compact">Qualified reference · 10 October 2026</p>
          <p className="t-caption mt-2 text-[var(--text-secondary)]">
            Application <code>6f086a8</code> passed all six CI jobs. Service <code>8163e03</code>,
            pinned to that application release, passed both jobs, including account workflows,
            monitoring, surface checks and tracker navigation. This is a reference checkpoint;
            subsequent changes require their own release checks.
          </p>
          <div className="t-caption mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <a
              href="https://github.com/Charanos/aLcassa/actions/runs/38013994579"
              className="text-[var(--text-action)] underline underline-offset-4"
            >
              Application checks
            </a>
            <a
              href="https://github.com/Charanos/alcassa-service/actions/runs/38014104785"
              className="text-[var(--text-action)] underline underline-offset-4"
            >
              Service and browser checks
            </a>
          </div>
        </aside>
      </header>

      <section
        aria-labelledby="progress-title"
        className="mt-14 border-t border-[var(--border-subtle)] pt-10"
      >
        <h2 id="progress-title" className="t-heading">
          Milestone acceptance
        </h2>
        <p className="t-body mt-3 text-[var(--text-secondary)]">
          Review what is verified and what remains for each milestone. Progress measures
          implementation; acceptance also requires its outstanding checks and demonstration.
        </p>
        <div className="mt-6 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
          {MILESTONES.filter((milestone) => MILESTONE_PROGRESS_REVIEW[milestone.id]).map(
            (milestone) => {
              const id = milestone.id;
              const review = MILESTONE_PROGRESS_REVIEW[id]!;
              return (
                <details key={id} id={`milestone-${id}`} className="group scroll-mt-8 py-4">
                  <summary className="flex cursor-pointer list-none items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden">
                    <IconChevronRight
                      size={15}
                      aria-hidden
                      className="shrink-0 text-[var(--text-tertiary)] group-open:rotate-90"
                    />
                    <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-3">
                      <span className="t-compact">
                        {id} · {milestone.name}
                      </span>
                      <span className="numeric t-compact text-[var(--text-secondary)]">
                        <span className="text-[var(--text-primary)]">{milestone.progress}%</span>
                      </span>
                    </span>
                  </summary>
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
                </details>
              );
            },
          )}
        </div>
      </section>

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
            value={`${followup.applicationCases}`}
            label="Recorded application cases"
            detail={`${followup.applicationFiles} files · no failures or skips`}
          />
          <Metric
            value={`${usage.databaseCases}`}
            label="Service database cases"
            detail={`${budget.serviceCases - budget.databaseCases} additional unit / schema cases · local`}
          />
          <Metric
            value={`${record.service.bridgeChecks + record.service.propagationChecks}`}
            label="Checks across both runtimes"
            detail="5 credential checks · 12 publish / restore samples"
          />
          <Metric
            value={`${usage.maximumPropagationMs} ms`}
            label="Slowest local propagation sample"
            detail="12 samples · five-second budget · not load p95"
          />
        </dl>
        <details className="mt-6">
          <summary className="t-compact cursor-pointer py-3 text-[var(--text-secondary)] focus-visible:outline-2 focus-visible:outline-offset-4">
            Earlier release records and downloads
          </summary>
          <div className="mt-3 rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-inset)] p-5 md:p-6">
            <h3 className="t-heading">Historical tracker checkpoint</h3>
            <p className="t-compact mt-3 text-[var(--text-secondary)]">
              {record.localCandidate.environment}. The tracker/evidence follow-up adds five checks
              for redaction, reconciled totals, safe paths, revoked fixtures and published
              fingerprints, plus eight document navigation checks. Verified before publication on
              baseline <code>{record.localCandidate.baseCommit.slice(0, 7)}</code>.
            </p>
            <div className="t-compact mt-4">
              <EvidenceDownload
                href={record.localCandidate.results.path}
                label={`${record.localCandidate.passed}-case local catalogue`}
              />
              <Digest value={record.localCandidate.results.sha256} />
              <div className="mt-3">
                <EvidenceDownload
                  href="/verification/2026-10-08/manifest.json"
                  label="Earlier tracker evidence index"
                />
              </div>
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
                credential, scope, revocation, conditional-read and publication checks run against
                the restricted database role.
              </p>
              <p className="mt-3">
                Runtime audit: {record.service.audit.dependencies} dependencies,{' '}
                {record.service.audit.vulnerableDependencies} vulnerable dependencies. Service
                hosting is verified locally under the agreed sandbox scope.
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
        </details>
      </section>

      <section
        id="colleague-workflows-checkpoint"
        aria-labelledby="colleague-workflows-title"
        className="mt-12 border-t border-[var(--border-subtle)] pt-8"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="colleague-workflows-title" className="t-heading inline">
              Password and colleague workflows
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">{workflows.scope}</p>
            <dl className="mt-6 grid gap-5 border-y border-[var(--border-subtle)] py-5 sm:grid-cols-2">
              <Metric
                value={`${workflows.workflowChecks}`}
                label="Complete browser workflows"
                detail="Actual provider, membership, session and seat readback"
                plain
              />
              <Metric
                value={`${workflows.layoutWidths.length}`}
                label="Activity widths verified"
                detail="Clear timestamps · Reference disclosure works by keyboard"
                plain
              />
            </dl>
            <p className="t-compact mt-5 text-[var(--text-secondary)]">{workflows.limits}</p>
            <div className="mt-5 flex flex-wrap gap-5">
              <EvidenceDownload
                href={workflows.results.path}
                label="Account and Activity layout results"
              />
              <EvidenceDownload
                href={workflows.manifest.path}
                label="Account workflow evidence index"
              />
            </div>
            <Digest value={workflows.results.sha256} />
          </div>
        </details>
      </section>

      <section
        id="monitoring-checkpoint"
        aria-labelledby="monitoring-title"
        className="mt-12 border-t border-[var(--border-subtle)] pt-8"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="monitoring-title" className="t-heading inline">
              Monitoring and browser coverage
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">{followup.scope}</p>
            <dl className="mt-6 grid gap-5 border-y border-[var(--border-subtle)] py-5 sm:grid-cols-3">
              <Metric
                value={`${followup.monitorDeliveredEvents}`}
                label="Notifications delivered"
                detail="Correlated outages and recoveries · failed delivery retried"
                plain
              />
              <Metric
                value={`${followup.surfaceCount}`}
                label="Application surfaces"
                detail="Platform, workspace details and tenant settings"
                plain
              />
              <Metric
                value={`${followup.surfaceVisits}`}
                label="Browser visits passed"
                detail="1440, 390 and 320px · no document overflow"
                plain
              />
            </dl>
            <p className="t-body mt-5 text-[var(--text-secondary)]">
              Real database failures were refused safely by both runtimes. Three failed probes
              opened each incident; two healthy probes recovered it. The notification queue survived
              a failed delivery and emptied without duplicate accepted events. The monitor is ready
              for a configured scheduler and destination; continuous external monitoring is not yet
              claimed.
            </p>
            <p className="t-body mt-4 text-[var(--text-secondary)]">
              The browser review found and corrected the missing-plan Activity error. It also
              verified retained versus expired events, workspace separation, and an actual company
              save with reload, database and audit readback. Initial failed checks remain in the
              downloadable record. Complete CRUD and accessibility acceptance remain separate.
            </p>
            <p className="t-compact mt-4 text-[var(--text-secondary)]">{followup.limits}</p>
            <div className="mt-5 flex flex-wrap gap-5">
              <EvidenceDownload
                href={followup.results.path}
                label="Monitoring and browser results"
              />
              <EvidenceDownload
                href={followup.qualifiedRelease.path}
                label="Qualified preceding release · both repositories"
              />
              <EvidenceDownload href={followup.manifest.path} label="Follow-up evidence index" />
            </div>
            <Digest value={followup.results.sha256} />
          </div>
        </details>
      </section>

      <section
        id="operational-gates-checkpoint"
        aria-labelledby="operational-gates-title"
        className="mt-12 border-t border-[var(--border-subtle)] pt-8"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="operational-gates-title" className="t-heading inline">
              Operational verification
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">{operational.scope}</p>
            <dl className="mt-6 grid gap-5 border-y border-[var(--border-subtle)] py-5 sm:grid-cols-3">
              <Metric
                value="2"
                label="Technical gates verified"
                detail="G06 request limits · G07 resource reconciliation"
                plain
              />
              <Metric
                value={`${operational.restoredTables}`}
                label="Tables restored"
                detail="Data, policies, grants and ownership matched"
                plain
              />
              <Metric
                value="50"
                label="Authenticated load sessions"
                detail="Latency target remains open"
                plain
              />
            </dl>
            <p className="t-body mt-5 text-[var(--text-secondary)]">
              Subscriptions has reached 100% technical readiness in the agreed local hosting scope;
              demonstration and final acceptance remain separate. All 639 application cases pass.
              Recovery restored 61 tables, 52 policies and 17 context functions into a separate
              target, followed by actual application and service checks.
            </p>
            <p className="t-compact mt-4 text-[var(--text-secondary)]">
              Performance has not passed. The repeat recorded dashboard and settings p95 between
              13.2 and 14.4 seconds against the 400 ms target, with no server errors or counter
              drift. Both the original sample and the repeat are retained for review. Independent
              Auth-process and stored-object recovery remain additional checks.
            </p>
            <p className="t-compact mt-4 text-[var(--text-secondary)]">{operational.limits}</p>
            <div className="mt-5 flex flex-wrap gap-5">
              <EvidenceDownload
                href={operational.results.path}
                label="Operational results and load samples"
              />
              <EvidenceDownload
                href={operational.manifest.path}
                label="Operational evidence index"
              />
              <EvidenceDownload
                href={operational.qualifiedRelease.path}
                label="Preceding release qualification"
              />
            </div>
            <Digest value={operational.results.sha256} />
          </div>
        </details>
      </section>

      <section
        id="shared-budget-checkpoint"
        aria-labelledby="shared-budget-title"
        className="surface-sunken mt-12 rounded-panel border border-[var(--border-subtle)] p-5 md:p-7"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="shared-budget-title" className="t-heading inline">
              Shared request budgets and database safeguards
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">{budget.scope}</p>
            <dl className="mt-6 grid gap-5 border-y border-[var(--border-subtle)] py-5 sm:grid-cols-3">
              <Metric
                value="6 / 10"
                label="Requests admitted"
                detail="4 refused · one shared tenant window"
                plain
              />
              <Metric
                value={`${budget.budgetScenarios}`}
                label="Redis scenarios passed"
                detail="Restart, expiry, limits and outages"
                plain
              />
              <Metric
                value={`${budget.repairedFunctionWarnings}`}
                label="Function warnings resolved"
                detail={`${budget.remainingSecurityWarnings} extension warnings remain`}
                plain
              />
            </dl>
            <p className="t-compact mt-5 text-[var(--text-secondary)]">{budget.limits}</p>
            <div className="mt-5 flex flex-wrap gap-5">
              <EvidenceDownload
                href={budget.results.path}
                label="Request budget and security results"
              />
              <EvidenceDownload href={budget.manifest.path} label="Current evidence index" />
              <EvidenceDownload
                href={budget.priorRelease.path}
                label="Previous release qualification"
              />
            </div>
            <Digest value={budget.results.sha256} />
          </div>
        </details>
      </section>

      <section
        id="service-usage-checkpoint"
        aria-labelledby="service-usage-title"
        className="mt-14 border-t border-[var(--border-subtle)] pt-10"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="service-usage-title" className="t-heading text-right">
              Durable credential last-use
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">
              {usage.scope} The local checkpoint passes {usage.serviceCases} service cases,{' '}
              {usage.bridgeChecks} Node-to-HTTP checks and {usage.propagationSamples}{' '}
              publish/restore samples. All {usage.applicationCases} application cases still pass
              with the new policies.
            </p>
            <p className="t-compact mt-3 text-[var(--text-secondary)]">{usage.limits}</p>
            <div className="mt-5 flex flex-wrap gap-5">
              <EvidenceDownload href={usage.results.path} label="Service usage results" />
              <EvidenceDownload href={usage.manifest.path} label="Service usage evidence index" />
            </div>
            <Digest value={usage.results.sha256} />
          </div>
        </details>
      </section>

      <section
        id="account-hardening-checkpoint"
        aria-labelledby="account-hardening-title"
        className="surface-sunken mt-10 rounded-panel border border-[var(--border-subtle)] p-5 md:p-7"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="account-hardening-title" className="t-heading inline">
              Account identity and credential safeguards
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">
              {hardening.scope} All {hardening.passed} cases in {hardening.files} files passed in
              the disposable local environment.
            </p>
            <p className="t-compact mt-3 text-[var(--text-secondary)]">{hardening.limits}</p>
            <div className="mt-5 flex flex-wrap gap-5">
              <EvidenceDownload href={hardening.results.path} label="626-case local catalogue" />
              <EvidenceDownload
                href={hardening.manifest.path}
                label="Account safeguards evidence index"
              />
            </div>
            <Digest value={hardening.results.sha256} />
          </div>
        </details>
      </section>

      <section
        id="device-sessions-checkpoint"
        aria-labelledby="device-sessions-title"
        className="mt-14 border-t border-[var(--border-subtle)] pt-10"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="device-sessions-title" className="t-heading inline">
              Review and end device sessions
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">
              {devices.environment}. All {devices.passed} cases in {devices.files} files pass.
              Verified against baseline <code>{devices.baseCommit.slice(0, 7)}</code>.
            </p>
            <div className="surface-sunken mt-6 rounded-panel border border-[var(--border-subtle)] p-5 md:p-7">
              <h3 className="t-heading">Confirmed changes preserve this browser</h3>
              <p className="t-compact mt-3 text-[var(--text-secondary)]">
                Individual and bulk reviews begin on Cancel, use the shared background blur and
                return focus to the device heading. One session ends individually, then three others
                end together; the server updates the list without a reload. Independent database
                readback confirms four ended sessions, one remaining browser session and two
                matching audits. A fresh reload keeps this browser signed in. The 390px page fits
                without horizontal overflow. Owned identities and workspace data are removed
                afterwards.
              </p>
              <p className="t-compact mt-3 text-[var(--text-secondary)]">
                Actual provider verification first reproduces the global sign-out defect, then
                proves that local sign-out ends the current refresh session while another device can
                still refresh. Database cases cover foreign-session refusal, current-device
                preservation, recovery and expiry exclusions, concurrent duplicate ending, and
                rollback on audit failure. Action cases retain a committed outcome if the subsequent
                read or cache refresh fails.
              </p>
              <p className="t-compact mt-3 text-[var(--text-secondary)]">{devices.limits}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <EvidenceDownload href={devices.results.path} label="617-case local catalogue" />
                  <Digest value={devices.results.sha256} />
                </div>
                <div>
                  <EvidenceDownload href={devices.native.path} label="Bounded device outcomes" />
                  <Digest value={devices.native.sha256} />
                </div>
                <div>
                  <EvidenceDownload
                    href={devices.manifest.path}
                    label="Device session evidence index"
                  />
                  <Digest value={devices.manifest.sha256} />
                </div>
              </div>
            </div>
            <div className="mt-6 grid items-start gap-6 md:grid-cols-3">
              {devices.images.map((item) => (
                <figure key={item.path} className="min-w-0">
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${item.label}`}
                  >
                    <Image
                      src={item.path}
                      alt={item.label}
                      width={item.width}
                      height={item.height}
                      unoptimized
                      className="h-auto w-full rounded-panel border border-[var(--border-subtle)]"
                    />
                  </a>
                  <figcaption className="t-caption mt-2 text-[var(--text-secondary)]">
                    {item.label}
                  </figcaption>
                  <Digest value={item.sha256} />
                </figure>
              ))}
            </div>
          </div>
        </details>
      </section>

      <section
        id="auth-navigation-checkpoint"
        aria-labelledby="auth-navigation-title"
        className="mt-14 border-t border-[var(--border-subtle)] pt-10"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="auth-navigation-title" className="t-heading text-right">
              Sign in and return to your work
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">
              {navigation.environment}. All {navigation.passed} cases in {navigation.files} files
              pass. Verified against baseline <code>{navigation.baseCommit.slice(0, 7)}</code>.
            </p>
            <div className="surface-sunken mt-6 rounded-panel border border-[var(--border-subtle)] p-5 md:p-7">
              <h3 className="t-heading">Automatic navigation, including a refused retry</h3>
              <p className="t-compact mt-3 text-[var(--text-secondary)]">
                A protected Team link retains its page and query through missing or stale sessions
                and an incorrect-password retry. The correct password opens that exact page
                automatically. Sign-out returns to sign-in, and a fresh protected request is
                refused. Independent database readback confirms the owned sessions ended. The
                recovery form keeps its generic response and fits a 390px viewport; strict
                form-action protection remains in place with no browser violations. Owned accounts
                and workspace data are removed after verification.
              </p>
              <p className="t-compact mt-4 text-[var(--text-secondary)]">{navigation.limits}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <EvidenceDownload
                    href={navigation.results.path}
                    label="605-case local catalogue"
                  />
                  <Digest value={navigation.results.sha256} />
                </div>
                <div>
                  <EvidenceDownload
                    href={navigation.native.path}
                    label="Bounded navigation outcomes"
                  />
                  <Digest value={navigation.native.sha256} />
                </div>
                <div>
                  <EvidenceDownload
                    href={navigation.manifest.path}
                    label="Auth navigation evidence index"
                  />
                  <Digest value={navigation.manifest.sha256} />
                </div>
              </div>
            </div>
            <div className="mt-6 grid items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              {navigation.images.map((item) => (
                <figure key={item.path} className="min-w-0">
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${item.label}`}
                  >
                    <Image
                      src={item.path}
                      alt={item.label}
                      width={item.width}
                      height={item.height}
                      className="h-auto w-full rounded-panel border border-[var(--border-subtle)]"
                      unoptimized
                    />
                  </a>
                  <figcaption className="t-compact mt-3 text-[var(--text-secondary)]">
                    {item.label}
                    <Digest value={item.sha256} />
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </details>
      </section>

      <section
        id="ownership-checkpoint"
        aria-labelledby="ownership-checkpoint-title"
        className="mt-14 border-t border-[var(--border-subtle)] pt-10"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="ownership-checkpoint-title" className="t-heading inline">
              Ownership review and recovery recipients
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">
              {ownership.environment}. All {ownership.passed} cases in {ownership.files} files pass,
              including {ownership.ownershipRouteCases} ownership-route cases,{' '}
              {ownership.ownershipOutcomeCases} client outcome cases and{' '}
              {ownership.recoveryProviderCases} actual-provider account/recovery cases. Verified
              against baseline <code>{ownership.baseCommit.slice(0, 7)}</code>.
            </p>
            <div className="surface-sunken mt-6 rounded-panel border border-[var(--border-subtle)] p-5 md:p-7">
              <h3 className="t-heading">
                Browser actions agree with identity, membership and audit
              </h3>
              <p className="t-compact mt-3 text-[var(--text-secondary)]">
                The owner reviews an active successor and the consequences before entering their
                current password. An incorrect password leaves ownership unchanged. A confirmed
                transfer records one audit, leaves exactly one owner and makes the former owner an
                administrator without ending their original sign-in. Fresh permissions agree for
                both people; owner controls disappear immediately. Cancel and completion return
                keyboard focus, the refusal clears and focuses the password field, and the review
                fits a 390px viewport with an 8px backdrop blur. The owned workspace and identities
                are removed after verification.
              </p>
              <p className="t-compact mt-4 text-[var(--text-secondary)]">
                Recovery recipients resolve to matching Auth and application records. Unknown
                addresses and profiles without an Auth identity receive no reset link and create no
                account. Both JSON and form responses remain generic; identity and captured-mail
                reads independently verify the outcome.
              </p>
              <p className="t-compact mt-4 text-[var(--text-secondary)]">{ownership.limits}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <EvidenceDownload
                    href={ownership.results.path}
                    label="578-case local catalogue"
                  />
                  <Digest value={ownership.results.sha256} />
                </div>
                <div>
                  <EvidenceDownload href={ownership.native.path} label="Bounded browser outcomes" />
                  <Digest value={ownership.native.sha256} />
                </div>
                <div>
                  <EvidenceDownload
                    href={ownership.manifest.path}
                    label="Ownership evidence index"
                  />
                  <Digest value={ownership.manifest.sha256} />
                </div>
              </div>
            </div>
          </div>
        </details>
      </section>

      <section
        id="account-checkpoint"
        aria-labelledby="account-checkpoint-title"
        className="mt-14 border-t border-[var(--border-subtle)] pt-10"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="account-checkpoint-title" className="t-heading inline">
              Invitation acceptance and ownership sessions
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">
              {account.environment}. This {account.passed}-case checkpoint includes{' '}
              {account.membershipCases} membership cases, {account.ownershipRouteCases}{' '}
              ownership-route cases and an actual provider/database transfer. Verified on baseline{' '}
              <code>{account.baseCommit.slice(0, 7)}</code>; earlier release snapshots remain
              separate.
            </p>
            <div className="surface-sunken mt-6 rounded-panel border border-[var(--border-subtle)] p-5 md:p-7">
              <h3 className="t-heading">Rejoining and reauthentication preserve existing access</h3>
              <p className="t-compact mt-3 text-[var(--text-secondary)]">
                A removed teammate rejoins on the original membership with the invited role, one
                audit receipt and no additional seat. Expired, withdrawn, used and unknown links
                return their intended errors. Suspended memberships cannot be reactivated through
                outstanding invitations, and the sole owner remains protected. Ownership password
                verification binds the provider identity to the current owner, ends only its
                temporary refresh session and refuses transfer if cleanup fails. Both original
                provider sessions still refresh after the verified transfer; its disposable owner
                account is removed afterwards.
              </p>
              <p className="t-compact mt-4 text-[var(--text-secondary)]">{account.limits}</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <EvidenceDownload href={account.results.path} label="564-case local catalogue" />
                  <Digest value={account.results.sha256} />
                </div>
                <div>
                  <EvidenceDownload href={account.manifest.path} label="Account evidence index" />
                  <Digest value={account.manifest.sha256} />
                </div>
              </div>
            </div>
          </div>
        </details>
      </section>

      <section
        id="team-checkpoint"
        aria-labelledby="team-checkpoint-title"
        className="mt-14 border-t border-[var(--border-subtle)] pt-10"
      >
        <details className="group">
          <summary className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4">
            <h2 id="team-checkpoint-title" className="t-heading text-right">
              Team integrity and confirmed readback
            </h2>
            <span className="t-caption ml-3 text-[var(--text-tertiary)]">View record</span>
          </summary>
          <div className="mt-5">
            <p className="t-body mt-4 text-[var(--text-secondary)]">
              {membership.environment}. The earlier {membership.passed}-case regression includes{' '}
              {membership.databaseCases} real-database membership cases and {membership.actionCases}{' '}
              action-result cases. Concurrent writes share workspace and capacity locks, current
              permissions are checked inside each transaction, and accepted links are single use.
              This follow-up was verified on baseline{' '}
              <code>{membership.baseCommit.slice(0, 7)}</code>; the earlier CI references remain
              separate release snapshots.
            </p>
            <div className="surface-sunken mt-6 rounded-panel border border-[var(--border-subtle)] p-5 md:p-7">
              <h3 className="t-heading">Browser and database outcomes agree</h3>
              <p className="t-compact mt-3 text-[var(--text-secondary)]">
                Administrator-to-agent reduction, suspended teammate removal and expired invitation
                withdrawal were replayed in the browser. Removal kept the reserved capacity correct;
                withdrawal released one seat immediately without reloading. Keyboard focus returned
                to the relevant heading. The 390px page fits its viewport; the review starts on
                Cancel and uses an 8px backdrop blur. Owned fixtures and their temporary allowance
                were removed, preserving the original owner.
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <div>
                  <EvidenceDownload
                    href={membership.results.path}
                    label="545-case local catalogue"
                  />
                  <Digest value={membership.results.sha256} />
                </div>
                <div>
                  <EvidenceDownload
                    href={membership.native.path}
                    label="Browser, database and cleanup outcomes"
                  />
                  <Digest value={membership.native.sha256} />
                </div>
                <div>
                  <EvidenceDownload href={membership.manifest.path} label="Team evidence index" />
                  <Digest value={membership.manifest.sha256} />
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {membership.images.map((item) => (
                <figure key={item.path} className="min-w-0">
                  <a
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${item.label}`}
                  >
                    <Image
                      src={item.path}
                      alt={item.label}
                      width={item.width}
                      height={item.height}
                      className="h-auto w-full rounded-panel border border-[var(--border-subtle)]"
                      unoptimized
                    />
                  </a>
                  <figcaption className="t-compact mt-3 text-[var(--text-secondary)]">
                    {item.label}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </details>
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
          Phase One remains in verification. Open work includes configured Google onboarding,
          confirmation-required signup, complete action and accessibility checks, the load latency
          target, independent identity and stored-file restoration, setup and rollback rehearsals,
          and final handover. Hosting verification remains local; external email delivery must be
          qualified before launch.
        </p>
        <p className="t-compact mt-4 text-[var(--text-tertiary)]">
          Downloads contain selected test metadata and measured outcomes. Raw logs, account
          credentials, private fixtures and provider secrets are excluded.
        </p>
      </footer>
    </main>
  );
}

function Metric({
  value,
  label,
  detail,
  plain = false,
}: {
  value: string;
  label: string;
  detail: string;
  plain?: boolean;
}) {
  return (
    <div className={plain ? 'min-w-0' : 'min-w-0 bg-[var(--surface-inset)] p-5 md:p-6'}>
      <dt className="t-compact text-[var(--text-secondary)]">{label}</dt>
      <dd className="numeric mt-3 text-[1.75rem] leading-none tracking-tight">{value}</dd>
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
