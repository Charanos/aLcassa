import type { Metadata } from 'next';
import Link from '@/components/structure/NavigationLink';
import { PageHeader } from '@/components/structure/PageHeader';
import { Button } from '@/components/primitives/Button';
import { LimitBar } from '@/components/domain/LimitBar';
import { CredentialsList } from '@/components/tenant/CredentialsList';
import { getCredentials } from '@/lib/tenant/data';
import { getLiveCredentials } from '@/lib/tenant/live';
import { currentSessionOrNull } from '@/lib/auth/resolve';
import { SettingsAccessNotice } from '@/components/tenant/SettingsAccessNotice';

export const metadata: Metadata = { title: 'API credentials' };

/** 02 §4. Masked, scopes, last used, rotate, revoke. Owner only. */
export default async function CredentialsSettingsPage() {
  const context = await currentSessionOrNull();
  if (context && (context.role !== 'owner' || context.supportMode))
    return <SettingsAccessNotice ownerOnly />;
  const model = (await getLiveCredentials()) ?? (await getCredentials());

  return (
    <div>
      <PageHeader
        title="API credentials"
        description="Manage permissions for systems reading your workspace and assistant rules. Keys are shown once when created."
        breadcrumbs={[
          { label: 'Settings', href: '/app/settings/company' },
          { label: 'Credentials' },
        ]}
        actions={
          <Button asChild variant="primary">
            <Link href="/app/settings/credentials/new">Create credential</Link>
          </Button>
        }
      />

      <div className="mb-6 max-w-sm">
        <LimitBar label="Active credentials" current={model.keysUsed} limit={model.keysLimit} />
      </div>

      <div className="rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-5 py-2">
        <CredentialsList credentials={model.credentials} />
      </div>
    </div>
  );
}
