import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { AiRulesEditor } from '@/components/tenant/AiRulesEditor';
import { getTenantAiRules } from '@/lib/tenant/data';

export const metadata: Metadata = { title: 'Assistant rules' };

/** 02 §4 · 08 §4. Tenant AI rules — business information, preferences and
 *  instructions layered on top of the platform's master rules. Owner and
 *  admin (per the console's own master-rules singleton, this is the tenant
 *  half of the same pattern). */
export default async function AiRulesSettingsPage() {
  const model = await getTenantAiRules();

  return (
    <div>
      <PageHeader
        title="Assistant rules"
        description="What your assistant knows and how it behaves, layered on top of the platform floor every workspace inherits."
        breadcrumbs={[{ label: 'Settings', href: '/app/settings/company' }, { label: 'Assistant rules' }]}
      />
      <AiRulesEditor
        fields={model.fields}
        currentVersion={model.currentVersion}
        versions={model.versions}
        versionsRetained={model.versionsRetained}
        versionsLimit={model.versionsLimit}
      />
    </div>
  );
}
