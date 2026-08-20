import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { CreateCredentialForm } from '@/components/tenant/CreateCredentialForm';

export const metadata: Metadata = { title: 'Create a credential' };

/** 02 §4 · 03 §10. Owner only. The screen that will show a secret exactly
 *  once, once there is a real one to show. */
export default function CreateCredentialPage() {
  return (
    <div>
      <PageHeader
        title="Create a credential"
        description="Choose what it can do before creating it — scopes cannot be widened later without creating a new credential."
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
