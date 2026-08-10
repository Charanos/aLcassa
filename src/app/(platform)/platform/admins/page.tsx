import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';
import { IconShieldLock } from '@tabler/icons-react';

export const metadata: Metadata = { title: 'Admins' };

export default function AdminsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader 
        title="Platform Admins" 
        description="Manage access and capabilities for platform operators." 
      />
      
      <div className="flex-1 rounded-panel border border-[var(--rule-base)] bg-[var(--surface-raised)] flex items-center justify-center p-6 min-h-[400px]">
        <EmptyState
          icon={IconShieldLock}
          title="No additional admins"
          body="Only the platform owner account currently exists."
        />
      </div>
    </div>
  );
}
