'use client';

import React, { useState } from 'react';
import {
  IconHistory,
  IconUser,
  IconRobot,
  IconSettings,
  IconBuilding,
  IconListDetails,
  IconSearch,
  IconDownload,
} from '@tabler/icons-react';
import type { AuditEntry } from '@/lib/console/data';
import { Panel, ReasonNote } from '@/components/console/Surface';

export function ActivityTab({ activity }: { activity: AuditEntry[] }) {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'session' | 'plan' | 'tenant' | 'rules'>(
    'all',
  );

  const getIconAndColor = (kind: string) => {
    switch (kind) {
      case 'session':
        return { Icon: IconUser, bg: 'var(--blue-50)', color: 'var(--blue-500)' };
      case 'plan':
        return { Icon: IconListDetails, bg: 'var(--badge-success-bg)', color: 'var(--success-fg)' };
      case 'rules':
        return { Icon: IconRobot, bg: 'var(--badge-info-bg)', color: 'var(--blue-500)' };
      case 'tenant':
        return { Icon: IconBuilding, bg: 'var(--badge-warning-bg)', color: 'var(--warning-fg)' };
      case 'admin':
        return { Icon: IconSettings, bg: 'var(--badge-danger-bg)', color: 'var(--danger-fg)' };
      default:
        return { Icon: IconHistory, bg: 'var(--surface-inset)', color: 'var(--text-secondary)' };
    }
  };

  const filteredActivity = activity.filter((a) => {
    const matchesSearch =
      a.action.toLowerCase().includes(search.toLowerCase()) ||
      a.actor.toLowerCase().includes(search.toLowerCase()) ||
      a.target.toLowerCase().includes(search.toLowerCase());
    const matchesKind = kindFilter === 'all' || a.kind === kindFilter;
    return matchesSearch && matchesKind;
  });

  const sessionCount = activity.filter((a) => a.kind === 'session').length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Inverted Compliance & Audit Ribbon ────────────────────────────── */}
      <div
        className="flex flex-col overflow-hidden rounded-card sm:flex-row"
        style={{
          background: 'var(--invert-card-bg)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
          border: '1px solid var(--invert-card-border)',
        }}
      >
        {/* Stat 1 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:pr-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Audit Entries
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {activity.length}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              recorded
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            Immutable append-only ledger
          </p>
          <div
            className="absolute top-6 right-0 bottom-6 hidden w-px sm:block"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)',
            }}
          />
          <div
            className="absolute right-6 bottom-0 left-6 h-px sm:hidden"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)',
            }}
          />
        </div>

        {/* Stat 2 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Audited Support Sessions
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {sessionCount}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              sessions
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            30-min expiring access grants
          </p>
          <div
            className="absolute top-6 right-0 bottom-6 hidden w-px sm:block"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)',
            }}
          />
          <div
            className="absolute right-6 bottom-0 left-6 h-px sm:hidden"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)',
            }}
          />
        </div>

        {/* Stat 3 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Ledger Integrity
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-flex size-2 rounded-full"
              style={{ background: 'var(--success-fg)' }}
            />
            <span
              className="font-mono text-base font-medium"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              Cryptographically Signed
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            Zero gaps in sequence
          </p>
          <div
            className="absolute top-6 right-0 bottom-6 hidden w-px sm:block"
            style={{
              background:
                'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)',
            }}
          />
          <div
            className="absolute right-6 bottom-0 left-6 h-px sm:hidden"
            style={{
              background:
                'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)',
            }}
          />
        </div>

        {/* Stat 4 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:pl-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Data Retention
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              3 Years
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            Regulatory minimum enforced
          </p>
        </div>
      </div>

      {/* ── Filter Bar & Timeline ────────────────────────────────────────── */}
      <Panel
        title="Workspace Operations & Security Log"
        action={
          <button
            type="button"
            disabled
            title="A workspace’s own log is reachable only through a logged support session, never directly."
            className="inline-flex h-8 items-center gap-1.5 rounded-overlay px-3 text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
            style={{
              opacity: 0.45,
              cursor: 'not-allowed',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface-raised)',
              color: 'var(--text-primary)',
            }}
          >
            <IconDownload size={13} stroke={1.5} />
            Export CSV
          </button>
        }
        flush
        footer={
          <ReasonNote>
            This is the platform&rsquo;s own record of what it did to this workspace. The
            workspace&rsquo;s internal log &mdash; what their people did inside it &mdash; is
            reachable only through a logged support session, and export follows the same route, so a
            copy of a customer&rsquo;s activity is never taken without a trace of who took it.
          </ReasonNote>
        }
      >
        {/* Filter Controls */}
        <div
          className="flex flex-col items-stretch justify-between gap-3 border-b p-3 sm:flex-row sm:items-center sm:px-5 sm:py-3.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="relative max-w-sm flex-1">
            <IconSearch
              size={14}
              className="absolute top-1/2 left-3 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              placeholder="Search audit actions, actors, or targets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 w-full rounded-overlay pr-3 pl-8 text-xs transition-colors outline-none"
              style={{
                background: 'var(--surface-sunken)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div className="flex items-center gap-1 self-start overflow-x-auto rounded-overlay bg-[var(--surface-inset)] p-0.5 text-xs sm:self-auto">
            {(['all', 'session', 'plan', 'tenant', 'rules'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className="rounded-panel px-2.5 py-1 font-medium whitespace-nowrap capitalize transition-all"
                style={{
                  background: kindFilter === k ? 'var(--surface-raised)' : 'transparent',
                  color: kindFilter === k ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: kindFilter === k ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {k === 'all' ? 'All Activity' : k === 'rules' ? 'AI Rules' : `${k}s`}
              </button>
            ))}
          </div>
        </div>

        {/* Timeline Content */}
        <div className="p-5 sm:p-6">
          {filteredActivity.length === 0 ? (
            <div
              className="p-8 text-center font-mono text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              No audit logs matching query.
            </div>
          ) : (
            <div
              className="relative ml-3 flex flex-col gap-8 border-l pl-5 sm:ml-4 sm:pl-7"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {filteredActivity.map((entry) => {
                const { Icon, bg, color } = getIconAndColor(entry.kind);

                return (
                  <div key={entry.id} className="relative">
                    {/* Timeline icon node */}
                    <div
                      className="absolute top-1 -left-[32px] flex size-7 items-center justify-center rounded-full border-4 sm:-left-[40px] sm:size-8"
                      style={{
                        background: bg,
                        color: color,
                        borderColor: 'var(--surface-raised)',
                      }}
                    >
                      <Icon size={14} stroke={2} />
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {/* Top Action & Timestamp */}
                      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center sm:gap-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-mono text-xs font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {entry.action}
                          </span>
                          <span
                            className="rounded px-2 py-0.5 font-mono text-2xs uppercase"
                            style={{ background: bg, color: color }}
                          >
                            {entry.kind}
                          </span>
                        </div>
                        <span
                          className="font-mono text-xs"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {entry.time}
                        </span>
                      </div>

                      {/* Entry Box */}
                      <div
                        className="flex flex-col gap-3 rounded-overlay p-4"
                        style={{
                          background: 'var(--surface-sunken)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <p
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-secondary)' }}
                          >
                            {entry.target}
                          </p>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <span
                              className="flex size-5 items-center justify-center rounded font-mono text-3xs font-medium"
                              style={{
                                background: 'var(--surface-raised)',
                                border: '1px solid var(--border-subtle)',
                                color: 'var(--text-primary)',
                              }}
                            >
                              {entry.initials}
                            </span>
                            <span
                              className="font-mono text-xs"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              {entry.actor}
                            </span>
                          </div>
                        </div>

                        {entry.reason && (
                          <div
                            className="rounded-overlay border-l-2 p-3"
                            style={{
                              background: 'var(--surface-raised)',
                              borderLeftColor: 'var(--blue-500)',
                              border: '1px solid var(--border-subtle)',
                              borderLeftWidth: 3,
                            }}
                          >
                            <span
                              className="t-eyebrow mb-1 block text-3xs"
                              style={{ color: 'var(--text-tertiary)' }}
                            >
                              Customer Audit Reason
                            </span>
                            <p
                              className="font-mono text-xs"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              &ldquo;{entry.reason}&rdquo;
                            </p>
                          </div>
                        )}

                        {entry.diff && entry.diff.length > 0 && (
                          <div
                            className="overflow-x-auto rounded-overlay"
                            style={{
                              border: '1px solid var(--border-subtle)',
                              background: 'var(--surface-raised)',
                            }}
                          >
                            <table className="w-full border-collapse text-left font-mono text-xs">
                              <thead>
                                <tr style={{ background: 'var(--surface-inset)' }}>
                                  <th
                                    className="px-3 py-2 text-2xs font-medium uppercase"
                                    style={{ color: 'var(--text-tertiary)' }}
                                  >
                                    Field
                                  </th>
                                  <th
                                    className="px-3 py-2 text-2xs font-medium uppercase"
                                    style={{ color: 'var(--text-tertiary)' }}
                                  >
                                    Before
                                  </th>
                                  <th
                                    className="px-3 py-2 text-2xs font-medium uppercase"
                                    style={{ color: 'var(--text-tertiary)' }}
                                  >
                                    After
                                  </th>
                                </tr>
                              </thead>
                              <tbody
                                className="divide-y"
                                style={{ borderColor: 'var(--border-subtle)' }}
                              >
                                {entry.diff.map((d, i) => (
                                  <tr key={i}>
                                    <td
                                      className="px-3 py-2 font-medium"
                                      style={{ color: 'var(--text-secondary)' }}
                                    >
                                      {d.field}
                                    </td>
                                    <td
                                      className="px-3 py-2 line-through opacity-60"
                                      style={{ color: 'var(--text-tertiary)' }}
                                    >
                                      {d.redacted ? (
                                        <span className="italic">redacted</span>
                                      ) : (
                                        d.before
                                      )}
                                    </td>
                                    <td
                                      className="px-3 py-2 font-medium"
                                      style={{ color: 'var(--text-primary)' }}
                                    >
                                      {d.redacted ? (
                                        <span className="italic">redacted</span>
                                      ) : (
                                        d.after
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div
                          className="flex items-center gap-4 border-t pt-2 font-mono text-2xs"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-tertiary)',
                          }}
                        >
                          <span>req: {entry.requestId}</span>
                          <span>ip: {entry.ip}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
