import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconBuildings } from '@tabler/icons-react';

export const metadata: Metadata = { title: 'Workspaces' };

export default function TenantsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader title="Workspaces" description="Manage tenant organizations and their provisioned workspaces." />
      
      <div className="flex-1 rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] flex items-center justify-center p-6 min-h-[400px]">
        <EmptyState
          icon={IconBuildings}
          title="No workspaces yet"
          body="Provision a new tenant to get started."
        />
      </div>
    </div>
  );
}
