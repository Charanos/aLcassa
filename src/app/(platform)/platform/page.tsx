import type { Metadata } from 'next';
import { Badge } from '@/components/feedback/Badge';
import { Stat } from '@/components/feedback/Stat';
import { StatusDot } from '@/components/feedback/StatusDot';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconHistory } from '@tabler/icons-react';

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
    <div className="flex flex-col gap-8">
      <PageHeader title="Overview" />

      {/* BAND 1: Attention */}
      <section aria-labelledby="attention">
        <div className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] p-5">
          <h2 id="attention" className="t-micro text-[var(--ink-tertiary)] uppercase tracking-wider">
            Attention
          </h2>
          <p className="t-body mt-2 text-[var(--ink-secondary)]">Nothing needs attention.</p>
        </div>
      </section>

      {/* BAND 2: Platform Metrics */}
      <section aria-labelledby="platform-metrics">
        <h2 id="platform-metrics" className="sr-only">Platform Metrics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Workspaces" value="0" />
          <Stat label="Active plans" value="0" />
          <Stat label="Active sessions" value="0" />
          <Stat label="Service door (24h)" value="0" />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* BAND 3: Recent Actions */}
        <section aria-labelledby="recent-actions" className="lg:col-span-2">
          <h2 id="recent-actions" className="t-h3 text-[var(--ink-primary)] mb-4">
            Recent platform actions
          </h2>
          <div className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] min-h-[300px] flex items-center justify-center p-6">
            <EmptyState
              icon={IconHistory}
              title="No recent actions"
              body="Actions taken by platform admins will appear here."
            />
          </div>
        </section>

        {/* BAND 4: Health */}
        <section aria-labelledby="health" className="flex flex-col gap-4">
          <h2 id="health" className="t-h3 text-[var(--ink-primary)] mb-1">
            Health summary
          </h2>
          
          <div className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] p-5">
            <h3 className="t-micro text-[var(--ink-tertiary)] uppercase tracking-wider mb-3">
              Services
            </h3>
            <ul className="flex flex-col gap-3">
              <li><StatusDot status="operational" label="Database cluster" /></li>
              <li><StatusDot status="operational" label="Cache layer" /></li>
              <li><StatusDot status="operational" label="Session API" /></li>
            </ul>
          </div>

          <div className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] p-5">
            <h3 className="t-micro text-[var(--ink-tertiary)] uppercase tracking-wider mb-3">
              Isolation
            </h3>
            <div className="mt-2 flex items-center gap-3">
              <Badge tone="active" />
              <p className="t-data text-[var(--ink-secondary)]">
                Isolation: 0 of 0 tables passing, checked never.
              </p>
            </div>
            <p className="t-caption mt-2 text-[var(--ink-tertiary)]">
              Wired to the isolation suite result at M1.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
