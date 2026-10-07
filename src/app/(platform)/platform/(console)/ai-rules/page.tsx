import type { Metadata } from 'next';
import { IconCpu, IconHistory, IconLock, IconBuildingCommunity } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, Panel, SectionHeading } from '@/components/console/Surface';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { RuleFields } from '@/components/console/rules/RuleFields';
import { VersionRail } from '@/components/console/rules/VersionRail';
import { InheritancePanel } from '@/components/console/rules/InheritancePanel';
import { RuleEditor } from '@/components/console/rules/RuleEditor';
import { getMasterRulesDoc } from '@/lib/console/data';
import { getLiveMasterRules } from '@/lib/console/live';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { getLiveWorkspaces } from '@/lib/console/liveWorkspaces';

export const metadata: Metadata = { title: 'Master AI rules' };

export default async function AiRulesPage() {
  const ctx = await currentPlatformSessionOrNull();
  const doc = ctx ? await getLiveMasterRules() : await getMasterRulesDoc();
  const initialWorkspaceCount = ctx && !doc ? ((await getLiveWorkspaces())?.length ?? 0) : 0;

  return (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[
          { label: 'Platform Console', href: '/platform' },
          { label: 'Master AI rules' },
        ]}
        title="Master AI rules"
        rule
        actions={
          <span className="t-caption inline-flex items-center gap-2 rounded-chip bg-[var(--surface-sunken)] px-3 py-2">
            <IconLock size={14} aria-hidden />
            One shared rule set
          </span>
        }
      />
      <p className="t-body mb-8 max-w-[70ch] text-[var(--text-secondary)]">
        Shared guidance for every workspace. Customers can add their own instructions; required
        platform rules continue to apply.
      </p>
      {doc ? (
        <>
          <FactStrip label="Master rule summary">
            <FactCell
              icon={IconHistory}
              label="Current version"
              value={`v${doc.versionNumber}`}
              note={`Status: ${doc.status}`}
            />
            <FactCell
              icon={IconBuildingCommunity}
              label="Workspaces"
              value={doc.workspaceCount}
              note="Included in the platform rule scope"
            />
            <FactCell
              icon={IconLock}
              label="Required fields"
              value={doc.fields.filter((field) => field.locked).length}
              note={`${doc.fields.length} guidance fields in total`}
            />
            <FactCell
              icon={IconCpu}
              label="Last published"
              value={doc.savedAt}
              note="Timestamp of the current version"
            />
          </FactStrip>
          <section aria-labelledby="master-current-rules">
            <SectionHeading
              id="master-current-rules"
              title="Current guidance"
              note="Review the shared instructions and their effect before publishing a change."
            />
            <RuleFields
              fields={doc.fields}
              versionNumber={doc.versionNumber}
              status={doc.status}
              savedAt={doc.savedAt}
              workspaceCount={doc.workspaceCount}
            />
          </section>
          <section aria-labelledby="master-history">
            <SectionHeading
              id="master-history"
              title="History and workspace scope"
              align="left"
              note="Review previous versions and how customers inherit the platform guidance."
            />
            <div className="grid items-start gap-5 lg:grid-cols-2">
              <VersionRail versions={doc.versions} workspaceCount={doc.workspaceCount} />
              <InheritancePanel doc={doc} />
            </div>
          </section>
        </>
      ) : (
        <Panel title="No current rule version">
          <p className="t-body text-[var(--text-secondary)]">
            A published platform rule version is not available. Check the rule configuration before
            publishing or restoring guidance.
          </p>
          <div className="mt-5">
            <RuleEditor
              versionNumber={0}
              workspaceCount={initialWorkspaceCount}
              fields={[
                { key: 'tone', label: 'Tone', value: '', locked: false },
                {
                  key: 'responseGuidelines',
                  label: 'Response guidelines',
                  value: '',
                  locked: false,
                },
                {
                  key: 'businessInformation',
                  label: 'Business information',
                  value: '',
                  locked: false,
                },
                {
                  key: 'escalationInstructions',
                  label: 'Escalation instructions',
                  value: '',
                  locked: true,
                },
                { key: 'prohibitedTopics', label: 'Prohibited topics', value: '', locked: true },
                {
                  key: 'customInstructions',
                  label: 'Custom instructions',
                  value: '',
                  locked: false,
                },
              ]}
            />
          </div>
        </Panel>
      )}
    </ConsolePage>
  );
}
