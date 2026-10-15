import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { CreateCredentialForm } from '@/components/tenant/CreateCredentialForm';
import { currentSession } from '@/lib/auth/resolve';
import { SettingsAccessNotice } from '@/components/tenant/SettingsAccessNotice';

export const metadata: Metadata = { title: 'Create a credential' };

/** The owner creates a scoped key and saves its single displayed value. */
export default async function CreateCredentialPage() {
  const ctx = await currentSession();
  if (ctx.supportMode || ctx.role !== 'owner') return <SettingsAccessNotice ownerOnly />;
  return (
    <div>
      <PageHeader
        title="Create a credential"
        description="Choose the permissions your integration needs. To change its access later, create a new credential."
        breadcrumbs={[
          { label: 'Settings', href: '/app/settings/company' },
          { label: 'Credentials', href: '/app/settings/credentials' },
          { label: 'New' },
        ]}
      />
      <CreateCredentialForm />
    </div>
  );
}
