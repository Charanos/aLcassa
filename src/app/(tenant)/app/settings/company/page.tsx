import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { CompanyForm } from '@/components/tenant/CompanyForm';
import { getCompany } from '@/lib/tenant/data';
import { getLiveCompany } from '@/lib/tenant/live';
import { currentSessionOrNull } from '@/lib/auth/resolve';
import { SettingsAccessNotice } from '@/components/tenant/SettingsAccessNotice';

export const metadata: Metadata = { title: 'Company' };

/** 02 §4. Name, logo, contact, timezone, locale. Owner and admin. */
export default async function CompanySettingsPage() {
  const context = await currentSessionOrNull();
  if (context && !['owner', 'admin', 'support'].includes(context.role))
    return <SettingsAccessNotice />;
  const model = (await getLiveCompany()) ?? (await getCompany());

  return (
    <div>
      <PageHeader
        title="Company"
        description="These details apply to the whole workspace, including what your customers see."
        breadcrumbs={[{ label: 'Settings', href: '/app/settings/company' }, { label: 'Company' }]}
      />
      <CompanyForm model={model} />
    </div>
  );
}
