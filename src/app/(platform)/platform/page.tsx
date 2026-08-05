import type { Metadata } from 'next';
import { Badge } from '@/components/feedback/Badge';

export const metadata: Metadata = { title: 'Platform' };

/**
 * 09 §2. Four bands, in order of how often Brian will look at them:
 *
 *   1 Attention      past due, above 80% on any limit, credentials unused for
 *                    90 days, invitations expiring. If empty it says so plainly
 *                    and takes one line.
 *   2 Platform       tenant count by status, subscriptions by tier, active
 *                    sessions, service-door volume over 24 hours.
 *   3 Recent actions the last twenty platform_audit_log entries, with
 *                    support-mode entries in copper.
 *   4 Health         service dots and the most recent isolation suite result.
 *
 * Each band gets its OWN Suspense boundary (09 §8), so a slow metrics query
 * never holds up the attention band.
 */
export default function PlatformOverviewPage() {
  return (
    <div className="grid gap-6">
      <h1 className="t-title text-[var(--ink-primary)]">Overview</h1>

      <section
        aria-labelledby="attention"
        className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] p-5"
      >
        <h2 id="attention" className="t-micro text-[var(--ink-tertiary)]">
          Attention
        </h2>
        <p className="t-body mt-2 text-[var(--ink-secondary)]">Nothing needs attention.</p>
      </section>

      <section
        aria-labelledby="isolation"
        className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] p-5"
      >
        <h2 id="isolation" className="t-micro text-[var(--ink-tertiary)]">
          Isolation
        </h2>
        {/*
          04 §8 · 09 §2. THIS PANEL IS UNUSUAL FOR A HEALTH SURFACE AND IT IS
          THE POINT: Brian should be able to see, on any given day, that the
          guarantee he sells is currently holding. It reads the last CI run of
          the generated suite, with a per-table breakdown. Copy from 10 §10.
        */}
        <div className="mt-2 flex items-center gap-3">
          <Badge tone="active" />
          <p className="t-data text-[var(--ink-secondary)]">
            Isolation: 0 of 0 tables passing, checked never.
          </p>
        </div>
        <p className="t-caption mt-2 text-[var(--ink-tertiary)]">
          Wired to the isolation suite result at M1.
        </p>
      </section>
    </div>
  );
}
