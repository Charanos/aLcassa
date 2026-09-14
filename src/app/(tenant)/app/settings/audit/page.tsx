import type { Metadata } from 'next';
import {
  IconBuilding,
  IconEye,
  IconFileText,
  IconKey,
  IconUsers,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { PageHeader } from '@/components/structure/PageHeader';
import { EmptyState } from '@/components/primitives/EmptyState';
import { getTenantAudit } from '@/lib/tenant/data';
import { getLiveTenantAudit } from '@/lib/tenant/live';
import type { TenantAuditKind } from '@/lib/tenant/data';

export const metadata: Metadata = { title: 'Activity' };

const KIND_META: Record<TenantAuditKind, { icon: TablerIcon; ink: string; tint: string }> = {
  member: { icon: IconUsers, ink: 'var(--ink-500)', tint: 'var(--ink-100)' },
  credential: { icon: IconKey, ink: 'var(--ink-500)', tint: 'var(--ink-100)' },
  rules: { icon: IconFileText, ink: 'var(--ink-500)', tint: 'var(--ink-100)' },
  settings: { icon: IconBuilding, ink: 'var(--ink-500)', tint: 'var(--ink-100)' },
  // 03 §14: support-mode action is the one audit entry rendered in copper —
  // the only hue reserved for the owner's own guarantee being visible in the
  // log the same way any other action is.
  support: { icon: IconEye, ink: 'var(--blue-500)', tint: 'var(--blue-50)' },
};

/** `/app/settings/audit`. Owner and admin. The tenant's own log — filtered
 *  by the same RLS policy every other read in this product answers to. */
export default async function AuditSettingsPage() {
  const model = (await getLiveTenantAudit()) ?? (await getTenantAudit());

  return (
    <div>
      <PageHeader
        title="Activity"
        description={
          model.retentionDays
            ? `Everything that has happened in this workspace, retained for ${model.retentionDays} days on your plan.`
            : 'Everything that has happened in this workspace.'
        }
        breadcrumbs={[{ label: 'Settings', href: '/app/settings/company' }, { label: 'Activity' }]}
      />

      {model.entries.length === 0 ? (
        <EmptyState
          icon={IconFileText}
          title="Nothing yet"
          body="Entries appear here as actions are taken across your workspace — invitations, settings changes, published rules."
        />
      ) : (
        <ul
          className="overflow-hidden rounded-panel border"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-raised)' }}
          role="list"
        >
          {model.entries.map((entry) => {
            const meta = KIND_META[entry.kind];
            const Icon = meta.icon;
            return (
              <li
                key={entry.id}
                className="flex items-start gap-3 border-t px-4 py-3.5 first:border-t-0"
                style={{ borderColor: 'var(--ink-100)' }}
              >
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-panel"
                  style={{ background: meta.tint, color: meta.ink }}
                  aria-hidden
                >
                  <Icon size={14} stroke={1.5} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="t-body block text-[var(--text-primary)]">
                    <span className="font-medium">{entry.actor}</span> {entry.action}{' '}
                    <span className="text-[var(--text-secondary)]">{entry.target}</span>
                  </span>
                </span>
                <span className="t-data shrink-0 text-[var(--text-tertiary)]">{entry.time}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
