import type { Metadata } from 'next';
import { IconSettings } from '@tabler/icons-react';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';

export const metadata: Metadata = { title: 'Settings' };

export default function PlatformSettingsPage() {
  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Settings"
        description="Platform-level configuration: notifications, retention, and operator defaults."
      />
      <div
        className="flex min-h-[400px] flex-1 items-center justify-center rounded-panel border p-6"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
      >
        <EmptyState
          icon={IconSettings}
          title="Nothing to configure yet"
          body="Platform settings arrive with the hardening milestone."
        />
      </div>
    </div>
  );
}
