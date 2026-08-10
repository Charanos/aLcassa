import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id } = await params;
  return { title: 'Workspace Details' };
}

export default async function TenantDetailPage({ params }: PageProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id } = await params;

  return (
    <div className="flex flex-col gap-8 h-full">
      <PageHeader 
        title="Acme Logistics Ltd" 
        breadcrumbs={[
          { label: 'Workspaces', href: '/platform/tenants' },
          { label: 'Acme Logistics Ltd' },
        ]}
      />
      
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity & Status */}
        <section aria-labelledby="identity" className="lg:col-span-2">
          <h2 id="identity" className="sr-only">Identity and status</h2>
          <div className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] min-h-[200px] p-6">
            <p className="t-body text-[var(--ink-secondary)]">Identity and status panel coming soon.</p>
          </div>
        </section>

        {/* Plan & Entitlements */}
        <section aria-labelledby="plan">
          <h2 id="plan" className="sr-only">Plan and entitlements</h2>
          <div className="rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] min-h-[200px] p-6">
            <p className="t-body text-[var(--ink-secondary)]">Plan and entitlements coming soon.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
