import type { Metadata } from 'next';
import { PageHeader } from '@/components/structure/PageHeader';
import { AiRulesEditor } from '@/components/tenant/AiRulesEditor';
import { getTenantAiRules } from '@/lib/tenant/data';

export const metadata: Metadata = { title: 'Assistant rules' };

/** Workspace instructions inherit the recorded platform floor. */
export default async function AiRulesSettingsPage() {
  const model = await getTenantAiRules();

  return (
    <div>
      <PageHeader
        title="Assistant rules"
        description="Guide your assistant with your business information and preferences. Platform safeguards continue to apply."
        breadcrumbs={[
          { label: 'Settings', href: '/app/settings/company' },
          { label: 'Assistant rules' },
        ]}
      />
      {model.unavailable ? (
        <div
          role="status"
          className="rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-6"
        >
          <h2 className="t-panel">Instructions are temporarily unavailable</h2>
          <p className="t-body mt-2 text-[var(--text-secondary)]">
            The published instructions could not be confirmed. Reload once they are available;
            publishing is paused until then.
          </p>
        </div>
      ) : (
        <AiRulesEditor
          revision={model.revision}
          canWrite={model.canWrite}
          fields={model.fields}
          currentVersion={model.currentVersion}
          versions={model.versions}
          versionsRetained={model.versionsRetained}
          versionsLimit={model.versionsLimit}
        />
      )}
    </div>
  );
}
