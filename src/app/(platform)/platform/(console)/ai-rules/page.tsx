import type { Metadata } from 'next';
import { IconCpu, IconLock } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { RuleFields } from '@/components/console/rules/RuleFields';
import { VersionRail } from '@/components/console/rules/VersionRail';
import { InheritancePanel } from '@/components/console/rules/InheritancePanel';
import { getMasterRulesDoc } from '@/lib/console/data';
import { getLiveMasterRules } from '@/lib/console/live';

export const metadata: Metadata = { title: 'Master AI rules' };

/**
 * Master AI rules. `AI-Rules.dc.html`.
 *
 * ⚠ THE LEDE STATES THE INHERITANCE MODEL IN ONE SENTENCE: "the floor every
 * workspace inherits. Workspaces may add rules on top; they cannot remove
 * these."
 *
 * That is the entire product decision this screen implements. It is also the
 * answer to the question a customer asks when they discover master rules exist
 * at all: what can the platform make my assistant do? The page answers it in
 * the open rather than burying it in a policy document.
 *
 * ⚠ THIS PAGE CHANGED SHAPE ON 12 SEP 2026, AND THE SCHEMA IS WHY. `15 C47`.
 *
 * It used to render three groups of boolean toggles with per-rule locks —
 * enforced, floor, default. `master_ai_rule_versions.content` holds six fields,
 * five prose and one a list. There were no groups and no toggles; the model the
 * screen described had never been in the database.
 *
 * The tenant-side editor has spoken the document vocabulary since M2, so the
 * platform and the workspace now describe the same rules the same way. That is
 * not tidiness — an inheritance boundary where each side names the thing
 * differently is one nobody can reason about, least of all the customer reading
 * "locked by platform" beside a field the platform's own screen called a
 * toggle.
 *
 * What survived the change is the distinction that made the toggle model worth
 * having: `locked` and "has a value" are different properties. See
 * `rules/RuleFields.tsx`.
 */
export default async function AiRulesPage() {
  /**
   * Live first, designed fixture second — the pattern every other wired
   * surface uses. The fixture stays reachable behind the review bypass, where
   * there is no session for the live reader to resolve, and it is shaped
   * exactly as the query returns.
   */
  const doc = (await getLiveMasterRules()) ?? (await getMasterRulesDoc());

  return (
    <ConsolePage>
      {/* Iconography watermarks safely contained */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute top-[25%] -right-10 hidden rotate-[20deg] lg:block"
          style={{ color: 'var(--watermark-tint)' }}
        >
          <IconCpu size={380} stroke={1} />
        </div>
      </div>

      <div
        className="flex flex-col gap-4 border-b pb-5 lg:flex-row lg:items-end lg:gap-6"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="min-w-0 flex-1">
          <ConsoleHeader 
            breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'Master AI rules' }]}
            title="Master AI rules" 
            actions={
              <span
                className="inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 whitespace-nowrap"
                style={{
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-sunken)',
                  color: 'var(--text-secondary)',
                  font: '400 11.5px/1 var(--font-mono)',
                }}
              >
                <IconLock size={12} stroke={1.5} aria-hidden />
                Singleton · one record, platform-wide
              </span>
            }
          />

          {/*
            ⚠ THE SINGLETON SAYS SO. Sheet 10: "A lock chip beside the title
            states that this record cannot be duplicated. The constraint lives
            in the database; the chip is how a reader knows without reading the
            schema."

            There is exactly one master rule set, enforced by a unique index on
            a constant column. Without this an operator has no way to tell
            whether they are editing "the" rules or "a" set of rules — and the
            difference decides whether they expect a New button to exist.
          */}

          <p className="t-body mt-3" style={{ color: 'var(--text-secondary)', maxWidth: '70ch' }}>
            The floor every workspace inherits. Workspaces may add rules on top; they cannot remove
            these.
          </p>
        </div>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <RuleFields
          fields={doc.fields}
          versionNumber={doc.versionNumber}
          status={doc.status}
          savedAt={doc.savedAt}
          workspaceCount={doc.workspaceCount}
        />

        <div className="sticky top-8 grid gap-4 self-start">
          <VersionRail versions={doc.versions} workspaceCount={doc.workspaceCount} />
          <InheritancePanel doc={doc} />
        </div>
      </div>
    </ConsolePage>
  );
}
