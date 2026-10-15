import Link from '@/components/structure/NavigationLink';
import { IconLock } from '@tabler/icons-react';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';
import { Button } from '@/components/primitives/Button';

export function SettingsAccessNotice({
  ownerOnly = false,
  section = 'Company',
}: {
  ownerOnly?: boolean;
  section?: string;
}) {
  return (
    <div>
      <PageHeader
        title={ownerOnly ? 'API credentials' : section}
        description="Your workspace access determines which settings you can manage."
      />
      <div className="surface-sunken rounded-panel border border-[var(--border-subtle)]">
        <EmptyState
          icon={IconLock}
          title={ownerOnly ? 'Workspace owner access required' : 'Administrator access required'}
          body={
            ownerOnly
              ? 'Only the workspace owner can create, replace or review API credentials. Contact your owner if an integration needs access.'
              : `${section === 'Activity' ? 'Workspace activity is available to' : `${section} settings are managed by`} the workspace owner and administrators. Contact them if you need help with this workspace.`
          }
          action={
            <Button asChild variant="secondary">
              <Link href="/app">Back to workspace</Link>
            </Button>
          }
        />
      </div>
    </div>
  );
}
