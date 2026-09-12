import { Suspense } from 'react';
import type { Metadata } from 'next';
import { IconDownload } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, ExportLink, Panel } from '@/components/console/Surface';
import { AuditStream } from '@/components/console/AuditStream';
import { VolumeBand } from '@/components/console/audit/VolumeBand';
import { getAuditEntries, getAuditVolume } from '@/lib/console/data';
import { getLiveAuditEntries, getLiveAuditVolume } from '@/lib/console/liveWorkspaces';

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
 *
 * ⚠ THE VOLUME BAND HAS ITS OWN SUSPENSE BOUNDARY, and that is the reason it
 * is a separate async component rather than a tidiness preference.
 *
 * `09 §8` commits to panels streaming independently. The stream is why somebody
 * opened this page; the thirty-day aggregate is context. They are two queries,
 * and the aggregate is the expensive one — a `generate_series` joined against
 * every audit row in the window. Awaiting both before the first byte would make
 * the answer wait on the context. So the band reads inside its own boundary and
 * the stream paints as soon as it is ready.
 *
 * ⚠ THE TWO SECTIONS DO NOT SHARE FILTER STATE, which is a stated limit rather
 * than an oversight. Brushing the histogram to scope the stream needs both
 * inside one client boundary, which would push the whole page — every entry
 * included — into the browser. The stream already filters by kind and by free
 * text, which covers what a brush would select. If the brush is wanted later it
 * is a client parent around both, not a tweak to either.
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

      <div className="mt-7">
        <Suspense fallback={<VolumeSkeleton />}>
          <VolumeSection />
        </Suspense>
      </div>

      <AuditStream entries={entries} />

      <p className="t-compact mt-3.5" style={{ color: 'var(--text-tertiary)', maxWidth: '84ch' }}>
        Redacted fields appear as changed without revealing either value. A credential rotation
        shows that the secret moved; it never shows the secret.
      </p>
    </ConsolePage>
  );
}

/**
 * The band's own async component.
 *
 * ⚠ SUSPENSE NEEDS SOMETHING THAT SUSPENDS. A boundary wrapped around an
 * already-awaited value boundaries nothing: the await would have happened in
 * the parent, the fallback would never render, and the page would still wait.
 * Moving the read in here is what actually lets the stream paint first.
 */
async function VolumeSection() {
  const points = (await getLiveAuditVolume()) ?? (await getAuditVolume());
  return <VolumeBand points={points} />;
}

/**
 * ⚠ THE SKELETON IS THE BAND'S SHAPE, NOT A SPINNER. `03 §15`: an opacity
 * pulse at the size of the thing arriving, so nothing below it jumps when the
 * real band lands.
 */
function VolumeSkeleton() {
  return (
    <section className="mb-8" aria-busy="true">
      <div className="mb-6 h-7" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <Panel title="Actions per day">
          <div
            className="h-[168px] w-full animate-pulse rounded-panel"
            style={{ background: 'var(--surface-inset)' }}
          />
        </Panel>
        <Panel title="In the window">
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-8 w-full animate-pulse rounded-panel"
                style={{ background: 'var(--surface-inset)' }}
              />
            ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}
