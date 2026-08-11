import type { Metadata } from 'next';
import { IconPlus } from '@tabler/icons-react';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';

export const metadata: Metadata = { title: 'Provision a workspace' };

/**
 * Provisioning lands with M4. Reachable from the command palette today so the
 * palette's action entries are not decorative.
 */
export default function ProvisionPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Provision a workspace"
        description="Create a tenant, seed its owner, and assign a plan."
      />
      <div
        className="flex min-h-[400px] flex-1 items-center justify-center rounded-panel border p-6"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
      >
        <EmptyState
          icon={IconPlus}
          title="Provisioning arrives with the console milestone"
          body="Creating a workspace writes a tenant row, its owner membership and an audit entry in one transaction."
        />
      </div>
    </div>
  );
}
