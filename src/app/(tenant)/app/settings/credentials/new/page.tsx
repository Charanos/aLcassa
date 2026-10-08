import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { CreateCredentialForm } from '@/components/tenant/CreateCredentialForm';
import { currentSession } from '@/lib/auth/resolve';
import { AppError, ERROR_CODES } from '@/lib/errors';

export const metadata: Metadata = { title: 'Create a credential' };

/** The owner creates a scoped key and saves its single displayed value. */
export default async function CreateCredentialPage() {
  const ctx = await currentSession();
  if (ctx.supportMode || ctx.role !== 'owner') throw new AppError(ERROR_CODES.ROLE_NOT_PERMITTED);
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
