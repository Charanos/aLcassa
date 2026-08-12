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
import { Panel } from '@/components/console/Surface';

export function ActivityTab({ activity }: { activity: AuditEntry[] }) {
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'session' | 'plan' | 'tenant' | 'rules'>('all');

  const getIconAndColor = (kind: string) => {
    switch (kind) {
      case 'session': return { Icon: IconUser, bg: 'var(--blue-50)', color: 'var(--blue-500)' };
      case 'plan': return { Icon: IconListDetails, bg: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-fg)' };
      case 'rules': return { Icon: IconRobot, bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' };
      case 'tenant': return { Icon: IconBuilding, bg: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-fg)' };
      case 'admin': return { Icon: IconSettings, bg: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-fg)' };
      default: return { Icon: IconHistory, bg: 'var(--surface-inset)', color: 'var(--text-secondary)' };
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
        className="flex flex-col sm:flex-row overflow-hidden rounded-2xl"
        style={{
          background: 'var(--invert-card-bg)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
          border: '1px solid var(--invert-card-border)',
        }}
      >
        {/* Stat 1 */}
        <div className="flex-1 p-5 sm:p-6 sm:pr-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Audit Entries</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {activity.length}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              recorded
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            Immutable append-only ledger
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Stat 2 */}
        <div className="flex-1 p-5 sm:p-6 sm:px-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Audited Support Sessions</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {sessionCount}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              sessions
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            30-min expiring access grants
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Stat 3 */}
        <div className="flex-1 p-5 sm:p-6 sm:px-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Ledger Integrity</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full" style={{ background: 'var(--success-fg)' }} />
            <span className="font-mono text-base font-medium" style={{ color: 'var(--invert-card-fg)' }}>
              Cryptographically Signed
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            Zero gaps in sequence
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Stat 4 */}
        <div className="flex-1 p-5 sm:p-6 sm:pl-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Data Retention</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              3 Years
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
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
            className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
            style={{ border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', color: 'var(--text-primary)' }}
          >
            <IconDownload size={13} stroke={1.5} />
            Export CSV
          </button>
        }
        flush
      >
        {/* Filter Controls */}
        <div className="p-3 sm:px-5 sm:py-3.5 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="relative flex-1 max-w-sm">
            <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search audit actions, actors, or targets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 rounded-lg text-xs outline-none transition-colors"
              style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>

          <div className="flex items-center gap-1 bg-[var(--surface-inset)] p-0.5 rounded-lg text-xs self-start sm:self-auto overflow-x-auto">
            {(['all', 'session', 'plan', 'tenant', 'rules'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKindFilter(k)}
                className="px-2.5 py-1 rounded-md capitalize font-medium transition-all whitespace-nowrap"
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
            <div className="p-8 text-center font-mono text-xs" style={{ color: 'var(--text-tertiary)' }}>
              No audit logs matching query.
            </div>
          ) : (
            <div className="relative pl-5 sm:pl-7 border-l ml-3 sm:ml-4 flex flex-col gap-8" style={{ borderColor: 'var(--border-subtle)' }}>
              {filteredActivity.map((entry) => {
                const { Icon, bg, color } = getIconAndColor(entry.kind);

                return (
                  <div key={entry.id} className="relative">
                    {/* Timeline icon node */}
                    <div
                      className="absolute -left-[32px] sm:-left-[40px] top-1 size-7 sm:size-8 rounded-full flex items-center justify-center border-4"
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
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                            {entry.action}
                          </span>
                          <span
                            className="text-[10px] font-mono uppercase px-2 py-0.5 rounded"
                            style={{ background: bg, color: color }}
                          >
                            {entry.kind}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                          {entry.time}
                        </span>
                      </div>

                      {/* Entry Box */}
                      <div
                        className="rounded-xl p-4 flex flex-col gap-3"
                        style={{
                          background: 'var(--surface-sunken)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                            {entry.target}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="size-5 rounded flex items-center justify-center text-[9px] font-mono font-medium"
                              style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                            >
                              {entry.initials}
                            </span>
                            <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                              {entry.actor}
                            </span>
                          </div>
                        </div>

                        {entry.reason && (
                          <div
                            className="p-3 rounded-lg border-l-2"
                            style={{
                              background: 'var(--surface-raised)',
                              borderLeftColor: 'var(--blue-500)',
                              border: '1px solid var(--border-subtle)',
                              borderLeftWidth: 3,
                            }}
                          >
                            <span className="t-eyebrow text-[9px] block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                              Customer Audit Reason
                            </span>
                            <p className="text-xs font-mono" style={{ color: 'var(--text-primary)' }}>
                              &ldquo;{entry.reason}&rdquo;
                            </p>
                          </div>
                        )}

                        {entry.diff && entry.diff.length > 0 && (
                          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border-subtle)', background: 'var(--surface-raised)' }}>
                            <table className="w-full text-left text-xs font-mono border-collapse">
                              <thead>
                                <tr style={{ background: 'var(--surface-inset)' }}>
                                  <th className="px-3 py-2 text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Field</th>
                                  <th className="px-3 py-2 text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>Before</th>
                                  <th className="px-3 py-2 text-[10px] font-medium uppercase" style={{ color: 'var(--text-tertiary)' }}>After</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                                {entry.diff.map((d, i) => (
                                  <tr key={i}>
                                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{d.field}</td>
                                    <td className="px-3 py-2 line-through opacity-60" style={{ color: 'var(--text-tertiary)' }}>
                                      {d.redacted ? <span className="italic">redacted</span> : d.before}
                                    </td>
                                    <td className="px-3 py-2 font-medium" style={{ color: 'var(--text-primary)' }}>
                                      {d.redacted ? <span className="italic">redacted</span> : d.after}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        <div className="flex items-center gap-4 pt-2 border-t text-[10px] font-mono" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
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
