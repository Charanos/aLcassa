import Link from 'next/link';
import type { Metadata } from 'next';
import { IconUsers } from '@tabler/icons-react';
import { ConsoleHeader, ConsolePage, Panel } from '@/components/console/Surface';
import { ActiveSessionCard } from '@/components/console/ActiveSessionCard';
import { EmptyState } from '@/components/primitives/EmptyState';
import { getSupportSessions, type EndedBy } from '@/lib/console/data';
import { getLiveSupportSessions } from '@/lib/console/liveWorkspaces';
import { resolveSupportSession } from '@/lib/console/session';
import { endSupportSession } from '../actions';

export const metadata: Metadata = { title: 'Support sessions' };

/**
 * The support-session register. `Support-Sessions.dc.html`.
 *
 * ⚠ THIS IS AN ACCOUNTABILITY LEDGER, NOT A PRODUCTIVITY REPORT.
 *
 * Everything on the page is framed from the customer's side. The lede says the
 * customer sees this same record in their own activity log; the reason column
 * is wide because the reason is the only part a human wrote; and the closing
 * line refuses to treat a customer ending a session early as a fault.
 *
 * That last point is the reason `endedBy: customer` is the one value here
 * drawn in the accent. Of the three ways a session ends — operator closed it,
 * cap expired, customer stopped it — only the third tells you something you
 * did not already know, and a console that greyed it out alongside the others
 * would be hiding its most important row.
 */

const ENDED_BY: Record<EndedBy, { dot: string; ink: string }> = {
  admin: { dot: 'var(--ink-400)', ink: 'var(--text-secondary)' },
  customer: { dot: 'var(--accent-mark)', ink: 'var(--accent-mark-text)' },
  expired: { dot: 'var(--ink-300)', ink: 'var(--text-tertiary)' },
};

export default async function SupportSessionsPage() {
  /**
   * Live first, designed fixture second — the pattern every other wired
   * surface uses. The fixture stays reachable behind the review bypass, where
   * there is no session for the live reader to resolve.
   */
  const [live, active] = await Promise.all([getLiveSupportSessions(), resolveSupportSession()]);
  const model = live ?? (await getSupportSessions());

  return (
    <ConsolePage>
      <div className="border-b pb-5" style={{ borderColor: 'var(--border-subtle)' }}>
        <ConsoleHeader eyebrow="/platform/support-sessions" title="Support sessions" />
        <p className="t-body mt-2" style={{ color: 'var(--text-secondary)', maxWidth: '70ch' }}>
          Every time the platform team looked inside a customer&rsquo;s workspace, with the reason
          they gave. The customer sees this same record in their own activity log.
        </p>
      </div>

      <div
        className="mt-5 grid gap-3.5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))' }}
      >
        {model.stats.map((s) => (
          <div
            key={s.label}
            className="min-w-0 rounded-overlay p-4"
            style={{
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface-raised)',
              boxShadow: 'var(--glass-highlight), var(--shadow-sm)',
            }}
          >
            <p className="t-compact truncate" style={{ color: 'var(--text-secondary)' }}>
              {s.label}
            </p>
            <p
              className="numeric mt-2.5"
              style={{
                fontSize: 'var(--display-sm)',
                color: s.tone === 'accent' ? 'var(--accent-mark-text)' : 'var(--text-primary)',
              }}
            >
              {s.value}
            </p>
            <p className="t-caption mt-1.5" style={{ color: 'var(--text-tertiary)' }}>
              {s.note}
            </p>
          </div>
        ))}
      </div>

      {active ? (
        <ActiveSessionCard session={active} onEnd={endSupportSession} />
      ) : (
        <div
          className="mt-5 rounded-overlay"
          style={{
            border: '1px dashed var(--border-strong)',
            background: 'var(--surface-sunken)',
          }}
        >
          <EmptyState
            icon={IconUsers}
            title="No session is open"
            body="Entering a workspace from the switcher opens a 30-minute read-only session and records it here and in the customer's own log."
          />
        </div>
      )}

      <div className="mt-5">
        <Panel title="History · last 30 days" flush>
          {/* Desktop */}
          <div className="hidden md:block">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col style={{ width: '15%' }} />
                <col style={{ width: '22%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '29%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr style={{ background: 'var(--surface-sunken)' }}>
                  {['Started', 'Workspace', 'Admin', 'Reason', 'Duration', 'Ended by'].map(
                    (h, i) => (
                      <th
                        key={h}
                        scope="col"
                        className="h-9"
                        style={{
                          padding: i === 0 || i === 5 ? '0 16px' : '0 8px',
                          textAlign: h === 'Duration' ? 'right' : 'left',
                          borderBottom: '1px solid var(--border-subtle)',
                          font: '500 11px/1 var(--font-ui)',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {model.history.map((h) => {
                  const e = ENDED_BY[h.endedBy];
                  return (
                    <tr
                      key={h.id}
                      className="transition-colors hover:bg-[var(--surface-sunken)]"
                      style={{ height: 44, borderBottom: '1px solid var(--border-subtle)' }}
                    >
                      <td style={{ padding: '0 16px' }}>
                        <span
                          style={{
                            font: '400 12px/1 var(--font-mono)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {h.started}
                        </span>
                      </td>
                      <td className="overflow-hidden" style={{ padding: '0 8px' }}>
                        <Link
                          href={`/platform/tenants/${h.slug}`}
                          className="block truncate transition-colors hover:text-[var(--text-action)]"
                          style={{
                            font: '400 var(--text-sm)/1.3 var(--font-ui)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {h.tenant}
                        </Link>
                      </td>
                      <td style={{ padding: '0 8px' }}>
                        <span
                          style={{
                            font: '400 12px/1 var(--font-mono)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {h.admin}
                        </span>
                      </td>
                      {/* The reason gets the widest column on the table. It is
                          the only field a person wrote, and the only one the
                          customer will read. */}
                      <td className="overflow-hidden" style={{ padding: '0 8px' }}>
                        <span
                          className="block truncate"
                          title={h.reason}
                          style={{
                            font: '400 var(--text-sm)/1.3 var(--font-ui)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {h.reason}
                        </span>
                      </td>
                      <td style={{ padding: '0 8px', textAlign: 'right' }}>
                        <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                          {h.duration}
                        </span>
                      </td>
                      <td style={{ padding: '0 16px' }}>
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            aria-hidden
                            className="size-1.5 shrink-0 rounded-full"
                            style={{ background: e.dot }}
                          />
                          <span style={{ font: '400 12px/1 var(--font-mono)', color: e.ink }}>
                            {h.endedBy}
                          </span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="grid gap-2 p-4 md:hidden">
            {model.history.map((h) => {
              const e = ENDED_BY[h.endedBy];
              return (
                <div
                  key={h.id}
                  className="rounded-panel p-3"
                  style={{ border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/platform/tenants/${h.slug}`}
                      className="min-w-0 flex-1"
                      style={{
                        font: '500 var(--text-sm)/1.35 var(--font-ui)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {h.tenant}
                    </Link>
                    <span className="inline-flex shrink-0 items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-1.5 rounded-full"
                        style={{ background: e.dot }}
                      />
                      <span style={{ font: '400 11px/1 var(--font-mono)', color: e.ink }}>
                        {h.endedBy}
                      </span>
                    </span>
                  </div>
                  <p className="t-compact mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                    {h.reason}
                  </p>
                  <p
                    className="mt-1.5"
                    style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
                  >
                    {h.started} · {h.admin} · {h.duration}
                  </p>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      <p className="t-compact mt-3.5" style={{ color: 'var(--text-tertiary)', maxWidth: '84ch' }}>
        Sessions are read-only and expire at 30 minutes with no extension. A customer ending a
        session early is a signal worth reading, not a fault.
      </p>
    </ConsolePage>
  );
}
