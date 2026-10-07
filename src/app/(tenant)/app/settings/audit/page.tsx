import type { Metadata } from 'next';
import Link from 'next/link';
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
import { DataSource } from '@/components/console/Surface';

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
export default async function AuditSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const model = (await getLiveTenantAudit(undefined, { cursor })) ?? (await getTenantAudit());

  return (
    <div>
      <PageHeader
        title="Activity"
        description={
          model.retentionDays
            ? `Recorded workspace changes and support visits within your plan's ${model.retentionDays}-day activity window.`
            : 'Recorded workspace changes and support visits.'
        }
        breadcrumbs={[{ label: 'Settings', href: '/app/settings/company' }, { label: 'Activity' }]}
      />

      <div
        className="t-caption mb-6 flex flex-wrap items-center justify-between gap-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        <DataSource kind={model.source ?? 'designed'} />
        <span>Times shown in {model.timezone ?? 'Africa/Nairobi'}</span>
        {cursor && (
          <Link className="underline underline-offset-4" href="/app/settings/audit">
            View latest activity
          </Link>
        )}
      </div>
      {model.source !== 'live' && (
        <p className="t-caption mb-6" style={{ color: 'var(--warning-fg)' }}>
          Example activity for preview. These entries do not describe your workspace.
        </p>
      )}
      {model.cutoff && (
        <p className="t-caption mb-6" style={{ color: 'var(--text-secondary)' }}>
          Activity is available from{' '}
          {new Intl.DateTimeFormat('en-GB', {
            timeZone: model.timezone,
            dateStyle: 'medium',
          }).format(new Date(model.cutoff))}
          .
        </p>
      )}

      {model.entries.length === 0 ? (
        <EmptyState
          icon={IconFileText}
          title={
            cursor ? 'No older activity in this window' : 'No recorded activity in this window'
          }
          body="Recorded changes and support visits appear here when they occur. Older entries may fall outside your plan's activity window."
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
                className="flex flex-wrap items-start gap-3 border-t px-4 py-4 first:border-t-0"
                style={{ borderColor: 'var(--border-subtle)' }}
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
                    <span className="font-medium">
                      {entry.actionLabel ?? `${entry.actor} ${entry.action}`}
                    </span>
                  </span>
                  <span className="t-caption mt-1 block text-[var(--text-secondary)]">
                    {entry.actionLabel ? `${entry.actor} · ` : ''}
                    {entry.target}
                  </span>
                  {entry.requestId && (
                    <details className="t-caption mt-2">
                      <summary className="cursor-pointer text-[var(--text-tertiary)]">
                        Reference
                      </summary>
                      <span className="mt-1 block break-all">{entry.requestId}</span>
                    </details>
                  )}
                </span>
                <time
                  dateTime={entry.occurredAt}
                  title={entry.occurredAt}
                  className="t-caption text-[var(--text-secondary)]"
                >
                  {entry.time}
                </time>
              </li>
            );
          })}
        </ul>
      )}
      {model.nextCursor && (
        <nav aria-label="Activity pages" className="mt-6">
          <Link
            className="t-body inline-flex min-h-11 items-center rounded-chip border px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)]"
            style={{ borderColor: 'var(--border-subtle)' }}
            href={`/app/settings/audit?cursor=${encodeURIComponent(model.nextCursor)}`}
          >
            View older activity
          </Link>
        </nav>
      )}
    </div>
  );
}
