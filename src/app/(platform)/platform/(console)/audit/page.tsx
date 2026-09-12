import type { Metadata } from 'next';
import { IconDownload } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, ExportLink } from '@/components/console/Surface';
import { AuditStream } from '@/components/console/AuditStream';
import { getAuditEntries } from '@/lib/console/data';
import { getLiveAuditEntries } from '@/lib/console/liveWorkspaces';

export const metadata: Metadata = { title: 'Audit log' };

/**
 * The platform audit log. `Audit-Log.dc.html`.
 *
 * The lede makes a claim the architecture actually backs: every platform
 * mutation writes here in the same transaction that performs it, so an action
 * missing from this log did not happen. That is only true because of
 * `withAudit()` and the append-only policy — no UPDATE, no DELETE — and it is
 * worth stating on the surface, because a log a reader is not sure is complete
 * is a log they will not rely on in a dispute.
 */
export default async function AuditPage() {
  /**
   * Live first, designed fixture second — the pattern every other wired
   * surface uses. The fixture stays reachable behind the review bypass, where
   * there is no session for the live reader to resolve.
   */
  const entries = (await getLiveAuditEntries()) ?? (await getAuditEntries());

  return (
    <ConsolePage>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="min-w-0 flex-1">
          <ConsoleHeader eyebrow="/platform/audit" title="Audit log" />
          <p className="t-body mt-2" style={{ color: 'var(--text-secondary)', maxWidth: '68ch' }}>
            Append-only. Every platform mutation writes here in the same transaction that performs
            it, so an action that is missing from this log did not happen.
          </p>
        </div>
        <ExportLink resource="audit">
          <IconDownload size={15} stroke={1.5} aria-hidden />
          Export
        </ExportLink>
      </div>

      <AuditStream entries={entries} />

      <p className="t-compact mt-3.5" style={{ color: 'var(--text-tertiary)', maxWidth: '84ch' }}>
        Redacted fields appear as changed without revealing either value. A credential rotation
        shows that the secret moved; it never shows the secret.
      </p>
    </ConsolePage>
  );
}
