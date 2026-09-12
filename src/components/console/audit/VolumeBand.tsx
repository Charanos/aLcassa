import { AuditVolumeChart } from '../Charts';
import { BandLink, Panel, SectionHeading } from '../Surface';
import type { AuditVolumePoint } from '@/lib/console/data';

/**
 * AUDIT VOLUME, THIRTY DAYS. 17 §7.
 *
 * ⚠ A LOG YOU CANNOT ASK A QUESTION OF IS AN ARCHIVE.
 *
 * The stream beneath this renders entries newest-first and answers "what
 * happened last". It cannot answer "was last Tuesday unusual", which is the
 * question somebody actually arrives with — and the one a log has to answer to
 * be worth keeping.
 *
 * ⚠ THE THREE FIGURES BESIDE THE CHART ARE NOT DECORATION, and the third is
 * the only one anybody investigates. A month with forty service-role calls in
 * it is a different month from one with none, whatever the totals look like.
 *
 * The band is a server component; only the chart itself crosses into the
 * client, because it needs the computed palette and a tooltip. The arithmetic
 * below — totals, the busiest day, the quiet-days count — happens here, once,
 * on the server, rather than in every reader's browser.
 */
export function VolumeBand({ points }: { points: AuditVolumePoint[] }) {
  const total = points.reduce((n, p) => n + p.total, 0);
  const serviceRole = points.reduce((n, p) => n + p.serviceRole, 0);
  const support = points.reduce((n, p) => n + p.support, 0);
  const quiet = points.filter((p) => p.total === 0).length;

  return (
    <section className="mb-8">
      <SectionHeading
        title="Volume"
        note="Thirty days of platform actions"
        action={<BandLink href="/platform/support-sessions">Open support sessions</BandLink>}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)]">
        <Panel title="Actions per day">
          <AuditVolumeChart data={points} />
        </Panel>

        <Panel title="In the window">
          <div className="grid">
            <Figure label="Platform actions" value={total} />
            <Figure
              label="Inside a support session"
              value={support}
              note="Each one is also in the customer's own log."
            />
            {/*
              ⚠ THE ACCENT SITS HERE AND NOWHERE ELSE ON THIS SCREEN. 03 §4a
              gives one per surface, and this is the figure that earns it: it is
              the answer to the single question a security review asks of this
              page. It goes amber when it is non-zero rather than always, so the
              colour means "there were some" rather than "this is the
              service-role row".
            */}
            <Figure
              label="Bypassed Row Level Security"
              value={serviceRole}
              tone={serviceRole > 0 ? 'accent' : undefined}
              note="Every bypass carries a reason and the operator who made it."
            />
            {quiet > 0 ? (
              <Figure
                label="Days with nothing"
                value={quiet}
                note="Zero is drawn as zero. A quiet weekend is two short bars, not a gap."
              />
            ) : null}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function Figure({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: number;
  note?: string;
  tone?: 'accent';
}) {
  return (
    <div
      className="grid gap-0.5 py-3 first:pt-0"
      style={{ borderTop: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span
          className="numeric shrink-0"
          style={{
            fontSize: 'var(--text-md)',
            color: tone === 'accent' ? 'var(--accent-mark-text)' : 'var(--text-primary)',
          }}
        >
          {value}
        </span>
      </div>
      {note ? (
        <span className="t-caption" style={{ color: 'var(--text-tertiary)', maxWidth: '38ch' }}>
          {note}
        </span>
      ) : null}
    </div>
  );
}
