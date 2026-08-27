import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { CompanyForm } from '@/components/tenant/CompanyForm';
import { getCompany } from '@/lib/tenant/data';
import { getLiveCompany } from '@/lib/tenant/live';

export const metadata: Metadata = { title: 'Company' };

/** 02 §4. Name, logo, contact, timezone, locale. Owner and admin. */
export default async function CompanySettingsPage() {
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
