import type { Metadata } from 'next';
import { IconDownload, IconBuildings } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, ExportLink } from '@/components/console/Surface';
import { WorkspaceTable } from '@/components/console/WorkspaceTable';
import { ProvisionWorkspaceButton } from '@/components/console/ProvisionWorkspaceButton';
import { getWorkspaces } from '@/lib/console/data';
import { getLiveWorkspaces } from '@/lib/console/liveWorkspaces';
import { countNeedingAttention } from '@/lib/console/attention';
import { startSupportSession } from '../actions';

export const metadata: Metadata = { title: 'Workspaces' };

/** The server supplies directory rows; the client owns filtering, sorting and the support-entry dialog. */
export default async function WorkspacesPage() {
  /**
   * Live first, designed fixture second — the pattern every other wired
   * surface uses. The fixture stays reachable behind the review bypass, where
   * there is no session for the live reader to resolve.
   */
  const liveRows = await getLiveWorkspaces();
  const rows = liveRows ?? (await getWorkspaces());
  const attention = countNeedingAttention(rows);

  return (
    <ConsolePage>
      {/* Iconography watermarks safely contained */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute top-[15%] -right-10 hidden rotate-6 lg:block"
          style={{ color: 'var(--watermark-tint)' }}
        >
          <IconBuildings size={160} stroke={1} />
        </div>
      </div>

      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'Workspaces' }]}
        title="Workspaces"
        actions={
          <>
            <ExportLink resource="workspaces">
              <IconDownload size={15} stroke={1.5} aria-hidden />
              Export
            </ExportLink>
            <ProvisionWorkspaceButton />
          </>
        }
      />

      {/* Use the same attention condition and warning tone in the summary, filter and directory rows. */}
      <p className="t-body -mt-3 mb-6" style={{ color: 'var(--text-secondary)', maxWidth: '62ch' }}>
        <span className="numeric" style={{ color: 'var(--text-primary)' }}>
          {rows.length}
        </span>{' '}
        {rows.length === 1 ? 'business' : 'businesses'}.{' '}
        {attention > 0 ? (
          <span style={{ color: 'var(--accent-mark-text)', fontWeight: 500 }}>
            <span className="numeric">{attention}</span> {attention === 1 ? 'needs' : 'need'}{' '}
            attention.
          </span>
        ) : (
          <span>Nothing needs attention.</span>
        )}
      </p>

      <WorkspaceTable
        rows={rows}
        total={rows.length}
        source={liveRows === null ? 'designed' : 'live'}
        onStartSession={startSupportSession}
      />
    </ConsolePage>
  );
}
