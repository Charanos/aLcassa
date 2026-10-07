import { Suspense } from 'react';
import type { Metadata } from 'next';
import {
  IconCalendarStats,
  IconClockHour4,
  IconDownload,
  IconLock,
  IconTransfer,
} from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, DataSource, ExportLink } from '@/components/console/Surface';
import { AuditStream } from '@/components/console/AuditStream';
import { VolumeBand, VolumeBandSkeleton } from '@/components/console/audit/VolumeBand';
import { ActorBand } from '@/components/console/audit/ActorBand';
import { FactCell, FactStrip } from '@/components/console/FactStrip';
import { getAuditEntries, getAuditVolume } from '@/lib/console/data';
import { getLiveAuditEntries, getLiveAuditVolume } from '@/lib/console/liveWorkspaces';

export const metadata: Metadata = { title: 'Audit log' };

/**
 * The platform audit log. `Audit-Log.dc.html`.
 *
 * ⚠ FOR ITS WHOLE LIFE UNTIL 30 SEP 2026, THIS PAGE WAS BLIND.
 *
 * Signed in, it reported zero platform actions in thirty days over a table
 * holding 297. The select policy admits rows only to a platform-admin ACTOR and
 * the readers opened no actor, so row-level security filtered everything — and
 * filters rather than errors, so the page rendered an empty ledger with full
 * confidence. When it could see, it found most of what it held was a read
 * recorded as a change. Doc 23 records both, and the fixes.
 *
 * ⚠ THE CLAIM THE PAGE MAKES IS THE PAGE'S REASON TO EXIST, so it opens with
 * the claim — as evidence, not as a lede. "Append-only" is a policy you can
 * read (select, and no update or delete, for anyone); "written in the same
 * transaction" is how `withAudit()` works; the newest entry and the window's
 * totals are read from the log itself. A reader who cannot trust that a log is
 * complete will not rely on it in a dispute, which is the only time it matters.
 *
 * ⚠ THE VOLUME BAND HAS ITS OWN SUSPENSE BOUNDARY. The stream is why somebody
 * opened the page; the thirty-day aggregate is context and the expensive query.
 * Awaiting both before the first byte would make the answer wait on the
 * context.
 */
export default async function AuditPage() {
  /* Live first, designed fixture second — the review bypass has no session. */
  const live = await getLiveAuditEntries();
  const entries = live ?? (await getAuditEntries());

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const changes = entries.filter((e) => e.nature !== 'read').length;
  const reads = entries.length - changes;
  const newest = entries[0];

  return (
    <ConsolePage>
      <ConsoleHeader
        breadcrumbs={[{ label: 'Platform Console', href: '/platform' }, { label: 'Audit log' }]}
        title="Audit log"
        actions={
          <ExportLink resource="audit">
            <IconDownload size={15} stroke={1.5} aria-hidden />
            Export
          </ExportLink>
        }
      />

      {/* ── The ledger's integrity, as evidence ─────────────────────────── */}
      <FactStrip label="How this log can be trusted">
        <FactCell
          icon={IconLock}
          label="Recorded history"
          value="Protected"
          note="Application permissions prevent editing or removing recorded events."
        />
        <FactCell
          icon={IconTransfer}
          label="Same transaction"
          value="Recorded together"
          note="Supported changes commit with their audit entry. Reviews and reads are identified separately."
        />
        <FactCell
          icon={IconClockHour4}
          label="Newest entry"
          value={newest ? ago(newest.at) : '—'}
          note={newest ? `${newest.time} EAT` : 'Nothing in the window.'}
        />
        <FactCell
          icon={IconCalendarStats}
          label="Last thirty days"
          value={`${changes.toLocaleString('en-KE')} ${changes === 1 ? 'change' : 'changes'}`}
          note={`and ${reads.toLocaleString('en-KE')} audited ${reads === 1 ? 'read' : 'reads'}.`}
          source={<DataSource kind={live ? 'live' : 'designed'} />}
        />
      </FactStrip>

      <Suspense fallback={<VolumeBandSkeleton />}>
        <VolumeSection live={live !== null} />
      </Suspense>

      {/*
        Not inside a Suspense boundary, and not a second query: derived from the
        entries already awaited above, so it cannot disagree with the stream.
      */}
      <ActorBand entries={entries} />

      <Suspense>
        <AuditStream entries={entries} today={today} />
      </Suspense>

      <p className="t-compact mt-4" style={{ color: 'var(--text-tertiary)', maxWidth: '84ch' }}>
        Redacted fields appear as changed without revealing either value. A credential rotation
        shows that the secret moved; it never shows the secret. Times are Nairobi time.
      </p>
    </ConsolePage>
  );
}

/**
 * The band's own async component. Suspense needs something that suspends: a
 * boundary around an already-awaited value boundaries nothing.
 */
async function VolumeSection({ live }: { live: boolean }) {
  const points = (await getLiveAuditVolume()) ?? (await getAuditVolume());
  return <VolumeBand points={points} live={live} />;
}

/** "3 minutes ago", "5 hours ago", "2 days ago". */
function ago(iso: string | undefined): string {
  if (!iso) return '—';
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}
