import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/structure/PageHeader';
import { Button } from '@/components/primitives/Button';
import { LimitBar } from '@/components/domain/LimitBar';
import { CredentialsList } from '@/components/tenant/CredentialsList';
import { getCredentials } from '@/lib/tenant/data';

export const metadata: Metadata = { title: 'API credentials' };

/** 02 §4. Masked, scopes, last used, rotate, revoke. Owner only. */
export default async function CredentialsSettingsPage() {
  const model = await getCredentials();

  return (
    <div>
      <PageHeader
        title="API credentials"
        description="Scoped keys for anything reading from or writing to your workspace through the service door."
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

      <CredentialsList credentials={model.credentials} />
    </div>
  );
}
