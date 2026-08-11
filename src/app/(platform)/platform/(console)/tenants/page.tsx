import Link from 'next/link';
import type { Metadata } from 'next';
import { IconDownload, IconPlus } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { WorkspaceTable } from '@/components/console/WorkspaceTable';
import { getWorkspaces } from '@/lib/console/data';
import { startSupportSession } from '../actions';

export const metadata: Metadata = { title: 'Workspaces' };

/**
 * The workspace list. `Workspaces.dc.html`.
 *
 * Server component: it reads the rows, then hands them to a client table that
 * owns filtering, sorting and the support-session gate. The filtering is
 * client-side deliberately — at 47 workspaces a round trip per keystroke would
 * be slower and worse than filtering an array, and this list is bounded by how
 * many customers the business has rather than by anything unbounded.
 *
 * That decision has a stated reversal point: past roughly a thousand rows the
 * filter moves into the query and the table takes a `searchParams` prop. It is
 * noted here rather than discovered later.
 */
export default async function WorkspacesPage() {
  const rows = await getWorkspaces();

  return (
    <ConsolePage>
      <ConsoleHeader
        eyebrow="/platform/tenants"
        title="Workspaces"
        actions={
          <>
            <button
              type="button"
              className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
              style={{
                border: '1px solid var(--border-strong)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
              }}
            >
              <IconDownload size={15} stroke={1.5} aria-hidden />
              Export
            </button>
            <Link
              href="/platform/tenants/new"
              className="t-compact inline-flex h-[34px] items-center gap-2 rounded-panel px-3.5 whitespace-nowrap transition-colors"
              style={{ background: 'var(--blue-500)', color: '#ffffff', fontWeight: 500 }}
            >
              <IconPlus size={15} stroke={1.5} aria-hidden />
              Provision workspace
            </Link>
          </>
        }
      />

      <WorkspaceTable rows={rows} total={rows.length} onStartSession={startSupportSession} />
    </ConsolePage>
  );
}
