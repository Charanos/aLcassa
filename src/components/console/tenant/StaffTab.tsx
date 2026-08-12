'use client';

import React, { useState } from 'react';
import {
  IconUsers,
  IconUserPlus,
  IconShieldLock,
  IconSearch,
  IconDotsVertical,
} from '@tabler/icons-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { WorkspaceDetail, WorkspaceStaff } from '@/lib/console/data';
import { Panel } from '@/components/console/Surface';

export function StaffTab({ w, staff }: { w: WorkspaceDetail; staff: WorkspaceStaff[] }) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff'>('all');

  const seatsMeter = w.meters.find((m) => m.icon === 'seat');
  const used = seatsMeter?.used ?? staff.length;
  const limit = seatsMeter?.limit ?? 100;
  const free = Math.max(0, limit - used);
  const adminCount = staff.filter((s) => s.role === 'admin').length;

  const chartData = [
    { name: 'Used Seats', value: used, color: 'var(--blue-500)' },
    { name: 'Available Seats', value: free, color: 'var(--surface-inset)' },
  ];

  const filteredStaff = staff.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* ── Inverted Staff Capacity Ribbon ───────────────────────────────── */}
      <div
        className="flex flex-col sm:flex-row overflow-hidden rounded-2xl"
        style={{
          background: 'var(--invert-card-bg)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
          border: '1px solid var(--invert-card-border)',
        }}
      >
        {/* Metric 1 */}
        <div className="flex-1 p-5 sm:p-6 sm:pr-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Staff Seats Utilized</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {used}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              / {limit} max
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full max-w-[200px] rounded-full overflow-hidden" style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (used / limit) * 100)}%`, background: 'var(--blue-400)' }} />
          </div>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Metric 2 */}
        <div className="flex-1 p-5 sm:p-6 sm:px-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Privileged Admins</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {adminCount}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              of {staff.length} team members
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            MFA enforced policy
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Metric 3 */}
        <div className="flex-1 p-5 sm:p-6 sm:px-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Available Headroom</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {free}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              free seats
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            Instant provisioning enabled
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Metric 4 */}
        <div className="flex-1 p-5 sm:p-6 sm:pl-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>SSO & Directory</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full" style={{ background: 'var(--success-fg)' }} />
            <span className="font-mono text-sm font-medium" style={{ color: 'var(--invert-card-fg)' }}>
              SAML 2.0 Active
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            Google Workspace sync
          </p>
        </div>
      </div>

      {/* ── Main Content Area: Roster Table & Visualization ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        {/* Staff Table */}
        <Panel
          title="Workspace Staff Roster"
          action={
            <button
              type="button"
              className="h-8 inline-flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium text-white transition-all active:scale-95"
              style={{ background: 'var(--blue-500)', boxShadow: '0 2px 6px rgba(14, 165, 233, 0.25)' }}
            >
              <IconUserPlus size={14} stroke={1.5} />
              Invite Member
            </button>
          }
          flush
        >
          {/* Filter Bar */}
          <div className="p-3 sm:px-5 sm:py-3.5 border-b flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="relative flex-1 max-w-sm">
              <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
              <input
                type="text"
                placeholder="Filter members by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg text-xs outline-none transition-colors"
                style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>

            <div className="flex items-center gap-1 bg-[var(--surface-inset)] p-0.5 rounded-lg text-xs self-start sm:self-auto">
              {(['all', 'admin', 'staff'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className="px-2.5 py-1 rounded-md capitalize font-medium transition-all"
                  style={{
                    background: roleFilter === r ? 'var(--surface-raised)' : 'transparent',
                    color: roleFilter === r ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    boxShadow: roleFilter === r ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {r === 'all' ? 'All Roles' : `${r}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ background: 'var(--surface-sunken)' }}>
                  <th className="px-5 py-3 text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>Team Member</th>
                  <th className="px-5 py-3 text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>Role</th>
                  <th className="px-5 py-3 text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>Status</th>
                  <th className="px-5 py-3 text-[11px] uppercase tracking-wider font-medium" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>Last Active</th>
                  <th className="px-3 py-3 text-[11px] uppercase tracking-wider font-medium text-right" style={{ color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {filteredStaff.map((s) => (
                  <tr key={s.id} className="group transition-colors hover:bg-[var(--surface-sunken)]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-8 rounded-lg flex items-center justify-center text-xs font-medium"
                          style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-strong)', color: 'var(--text-primary)' }}
                        >
                          {s.name.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                          <p className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium">
                        {s.role === 'admin' ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px]"
                            style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning-fg)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                          >
                            <IconShieldLock size={12} stroke={1.5} />
                            Admin
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px]"
                            style={{ background: 'var(--surface-inset)', color: 'var(--text-secondary)' }}
                          >
                            <IconUsers size={12} stroke={1.5} />
                            Staff
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-mono font-medium"
                        style={{
                          background: s.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : s.status === 'suspended' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-inset)',
                          color: s.status === 'active' ? 'var(--success-fg)' : s.status === 'suspended' ? 'var(--danger-fg)' : 'var(--text-tertiary)',
                        }}
                      >
                        <span className="size-1.5 rounded-full" style={{ background: 'currentColor' }} />
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {s.lastSignIn}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button
                        type="button"
                        className="p-1 rounded-md transition-colors hover:bg-[var(--surface-inset)]"
                        style={{ color: 'var(--text-tertiary)' }}
                        title="Member actions"
                      >
                        <IconDotsVertical size={14} stroke={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Right Side: Capacity Donut & Seat Info */}
        <div className="flex flex-col gap-5">
          <Panel title="Seat Allocation Ratio">
            <div className="h-44 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} innerRadius={42} outerRadius={62} paddingAngle={3} dataKey="value" stroke="none">
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="font-mono text-xl font-medium" style={{ color: 'var(--text-primary)' }}>
                  {Math.round((used / limit) * 100)}%
                </span>
                <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-tertiary)' }}>
                  Occupied
                </span>
              </div>
            </div>

            <div className="mt-2 flex flex-col gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: 'var(--blue-500)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Assigned Staff</span>
                </div>
                <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{used}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: 'var(--surface-inset)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Available Quota</span>
                </div>
                <span className="font-mono font-medium" style={{ color: 'var(--text-tertiary)' }}>{free}</span>
              </div>
            </div>
          </Panel>

          <div className="rounded-xl p-4" style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}>
            <p className="text-xs font-mono leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Staff members inherit fine-grained access policies. Role modifications write directly to the workspace audit ledger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
