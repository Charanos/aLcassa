import type { Metadata } from 'next';
import { IconDownload, IconBuildings } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage } from '@/components/console/Surface';
import { WorkspaceTable } from '@/components/console/WorkspaceTable';
import { ProvisionWorkspaceButton } from '@/components/console/ProvisionWorkspaceButton';
import { getWorkspaces } from '@/lib/console/data';
import { getLiveWorkspaces } from '@/lib/console/liveWorkspaces';
import { countNeedingAttention } from '@/lib/console/attention';
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
  /**
   * Live first, designed fixture second — the pattern every other wired
   * surface uses. The fixture stays reachable behind the review bypass, where
   * there is no session for the live reader to resolve.
   */
  const rows = (await getLiveWorkspaces()) ?? (await getWorkspaces());
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
          <IconBuildings size={380} stroke={1} />
        </div>
      </div>

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
            <ProvisionWorkspaceButton />
          </>
        }
      />

      {/*
        ⚠ THE STANDFIRST DOES THE WORK. Sheet 05: "the count that implies work
        is in the sentence, not only in a card, and the phrase that names it is
        ochre."

        A metric tile saying "3" is a number an operator has to interpret. A
        sentence saying "3 need attention" is the interpretation, and it is the
        first thing on the page. The ochre is doing semantic work rather than
        decoration: it is the same hue the meters and the filter chip use for
        "at a ceiling", so the sentence, the chip and the rows all name the
        same condition in the same colour.
      */}
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

      <WorkspaceTable rows={rows} total={rows.length} onStartSession={startSupportSession} />
    </ConsolePage>
  );
}
