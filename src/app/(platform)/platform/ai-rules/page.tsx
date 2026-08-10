import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconFileText } from '@tabler/icons-react';

export const metadata: Metadata = { title: 'Master Rules' };

export default function AiRulesPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Master Rules" 
        description="Global AI behavior constraints that apply to all tenants." 
      />
      
      <div className="flex-1 rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] flex items-center justify-center p-6 min-h-[400px]">
        <EmptyState
          icon={IconFileText}
          title="No master rules published"
          body="Create the first version of the global AI rules."
        />
      </div>
    </div>
  );
}
