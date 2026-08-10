import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconHistory } from '@tabler/icons-react';

export const metadata: Metadata = { title: 'Audit Log' };

export default function AuditPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Audit Log" 
        description="Comprehensive record of platform and support-mode actions." 
      />
      
      <div className="flex-1 rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] flex items-center justify-center p-6 min-h-[400px]">
        <EmptyState
          icon={IconHistory}
          title="No audit entries"
          body="Actions appear here as they are taken across the platform."
        />
      </div>
    </div>
  );
}
