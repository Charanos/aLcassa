import { BandLink, Panel, SectionHeading } from '../Surface';
import type { EndedBy, SessionRecord } from '@/lib/console/data';

/**
 * WHAT SUPPORT ACCESS ACTUALLY COSTS. 17 §7.
 *
 * ⚠ THE SHAPE OF THE SESSIONS IS A STRONGER TRANSPARENCY CLAIM THAN THE LIST
 * OF THEM.
 *
 * A register answers "did you enter my workspace, and when". It cannot answer
 * "how long do you stay, and what for", which is the question a customer
 * actually has once they know the answer to the first one is yes. Eleven rows
 * saying "18m" tell a reader nothing they can hold; a distribution showing that
 * most visits are under ten minutes and two ran to the cap tells them what
 * normal looks like, and therefore what abnormal would look like.
 *
 * ⚠ `endedBy: 'customer'` CARRIES THE ACCENT, and it is the only figure on this
 * page that does. Three ways a session ends: the operator closed it, the
 * thirty-minute cap closed it, or the CUSTOMER closed it from their own
 * workspace. Only the third tells you something you did not already know —
 * somebody watched a stranger enter their data and decided to stop it.
 *
 * This page is an accountability ledger, not a productivity report, so the
 * figure that would flatter us (how many we closed ourselves) is the one drawn
 * plainly, and the one that does not is the one drawn in the accent.
 *
 * ⚠ THE HISTOGRAM IS CSS, NOT A CHART LIBRARY. Four buckets and a maximum is
 * arithmetic; sending React and Recharts to the browser to place four bars
 * would be paying hydration for a division. The whole band is a server
 * component and ships no JavaScript.
 */

/** The cap is thirty minutes, so the buckets are built around it. */
const BUCKETS = [
  { key: 'under5', label: 'under 5m', test: (m: number) => m < 5 },
  { key: '5to15', label: '5–15m', test: (m: number) => m >= 5 && m < 15 },
  { key: '15to29', label: '15–29m', test: (m: number) => m >= 15 && m < 29.5 },
  /*
    ⚠ THE LAST BUCKET IS "REACHED THE CAP", NOT "OVER 29 MINUTES", and the
    difference is the whole reason it is drawn apart. A session that ran to
    30:00 did not choose to end — the ceiling ended it, which means the operator
    was still working when their time ran out. That is a different event from a
    long visit that finished, and it is the one worth counting.
  */
  { key: 'capped', label: 'hit the 30m cap', test: (m: number) => m >= 29.5 },
] as const;

const ENDED_BY: Record<EndedBy, { label: string; note: string; accent?: boolean }> = {
  admin: { label: 'Operator closed it', note: 'The visit finished and was ended deliberately.' },
  expired: {
    label: 'The cap closed it',
    note: 'Thirty minutes elapsed. The session ends whether or not the work did.',
  },
  customer: {
    label: 'The customer closed it',
    note: 'Ended from their own workspace. A signal worth reading, not a fault.',
    accent: true,
  },
};

export function ShapeBand({ history }: { history: SessionRecord[] }) {
  if (history.length === 0) {
    return (
      <section className="mt-8">
        <SectionHeading title="Shape" note="What support access costs" />
        <Panel title="Duration and outcome">
          <p className="t-compact" style={{ color: 'var(--text-tertiary)' }}>
            No support session has been opened yet. When one is, it appears here and in the
            customer&rsquo;s own activity log in the same transaction.
          </p>
        </Panel>
      </section>
    );
  }

  const buckets = BUCKETS.map((b) => ({
    ...b,
    count: history.filter((s) => b.test(s.durationMinutes)).length,
  }));
  const tallest = Math.max(...buckets.map((b) => b.count), 1);

  const outcomes = (Object.keys(ENDED_BY) as EndedBy[]).map((key) => ({
    key,
    ...ENDED_BY[key],
    count: history.filter((s) => s.endedBy === key).length,
  }));

  const median = [...history].sort((a, b) => a.durationMinutes - b.durationMinutes)[
    Math.floor(history.length / 2)
  ];

  /* Reasons are free text typed by the operator, so they are LISTED rather
     than categorised. Bucketing prose into invented categories would be a
     chart built on a guess about what somebody meant. */
  const reasons = [...new Set(history.map((s) => s.reason.trim()).filter(Boolean))];

  return (
    <section className="mt-8">
      <SectionHeading
        title="Shape"
        note="What support access costs"
        action={<BandLink href="/platform/audit">Open the audit log</BandLink>}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Panel
          title="How long a visit lasts"
          action={
            median ? (
              <span
                className="whitespace-nowrap"
                style={{ font: '400 11.5px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
              >
                median {median.duration}
              </span>
            ) : null
          }
        >
          <div className="grid gap-3">
            {buckets.map((b) => (
              <div key={b.key} className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                    {b.label}
                  </span>
                  <span className="numeric shrink-0" style={{ fontSize: 'var(--text-sm)' }}>
                    {b.count}
                  </span>
                </div>
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  style={{ background: 'var(--surface-inset)' }}
                  role="img"
                  aria-label={`${b.count} ${b.count === 1 ? 'session' : 'sessions'} ${b.label}`}
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${(b.count / tallest) * 100}%`,
                      background: b.key === 'capped' ? 'var(--warning-fg)' : 'var(--blue-400)',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="How it ended">
          <div className="grid">
            {outcomes.map((o) => (
              <div
                key={o.key}
                className="grid gap-0.5 py-3 first:pt-0"
                style={{ borderTop: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
                    {o.label}
                  </span>
                  <span
                    className="numeric shrink-0"
                    style={{
                      fontSize: 'var(--text-md)',
                      color:
                        o.accent && o.count > 0
                          ? 'var(--accent-mark-text)'
                          : 'var(--text-primary)',
                    }}
                  >
                    {o.count}
                  </span>
                </div>
                <span
                  className="t-caption"
                  style={{ color: 'var(--text-tertiary)', maxWidth: '40ch' }}
                >
                  {o.note}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {reasons.length > 0 ? (
        <div className="mt-5">
          <Panel title="Why the platform entered">
            <ul className="grid gap-2">
              {reasons.map((reason) => (
                <li
                  key={reason}
                  className="t-compact flex gap-2.5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span aria-hidden style={{ color: 'var(--text-tertiary)' }}>
                    ·
                  </span>
                  <span className="min-w-0">{reason}</span>
                </li>
              ))}
            </ul>
            <p className="t-caption mt-3.5" style={{ color: 'var(--text-tertiary)' }}>
              Typed by the operator before the session opened, required rather than optional, and
              visible in the customer&rsquo;s own activity log. Listed rather than grouped: sorting
              free text into categories would be a chart built on a guess about what somebody meant.
            </p>
          </Panel>
        </div>
      ) : null}
    </section>
  );
}
