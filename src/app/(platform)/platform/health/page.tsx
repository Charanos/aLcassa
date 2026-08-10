import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { StatusDot } from '@/components/feedback/StatusDot';

export const metadata: Metadata = { title: 'Health' };

export default function HealthPage() {
  return (
    <div className="flex flex-col gap-8 h-full">
      <PageHeader 
        title="Health" 
        description="System metrics, service status, and isolation test results." 
      />
      
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="services">
          <h2 id="services" className="t-h3 text-[var(--ink-primary)] mb-4">Core Services</h2>
          <div className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--rule-soft)]">
              <span className="t-compact font-medium text-[var(--ink-primary)]">Database cluster</span>
              <StatusDot status="operational" />
            </div>
            <div className="flex items-center justify-between p-4 border-b border-[var(--rule-soft)]">
              <span className="t-compact font-medium text-[var(--ink-primary)]">Cache layer</span>
              <StatusDot status="operational" />
            </div>
            <div className="flex items-center justify-between p-4">
              <span className="t-compact font-medium text-[var(--ink-primary)]">Session API</span>
              <StatusDot status="operational" />
            </div>
          </div>
        </section>

        <section aria-labelledby="metrics">
          <h2 id="metrics" className="t-h3 text-[var(--ink-primary)] mb-4">24h Metrics</h2>
          <div className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] min-h-[160px] p-6">
            <p className="t-body text-[var(--ink-secondary)]">Charts and metrics coming soon.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
