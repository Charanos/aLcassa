import type { Metadata } from 'next';
import { IconUser } from '@tabler/icons-react';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';

export const metadata: Metadata = { title: 'Your profile' };

export default function PlatformProfilePage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Your profile"
        description="Your operator account, sessions and security settings."
      />
      <div
        className="flex min-h-[400px] flex-1 items-center justify-center rounded-panel border p-6"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
      >
        <EmptyState
          icon={IconUser}
          title="Profile lands with authentication"
          body="Account details, active sessions and step-up verification arrive in M2."
        />
      </div>
    </div>
  );
}
