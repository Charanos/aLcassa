import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconLayoutList } from '@tabler/icons-react';

export const metadata: Metadata = { title: 'Plans & Entitlements' };

export default function PlansPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Plans & Entitlements" 
        description="Configure subscription tiers and their associated limits." 
      />
      
      <div className="flex-1 rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] flex items-center justify-center p-6 min-h-[400px]">
        <EmptyState
          icon={IconLayoutList}
          title="No plans defined"
          body="Create your first plan to start assigning entitlements."
        />
      </div>
    </div>
  );
}
