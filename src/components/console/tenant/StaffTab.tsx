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
        className="flex flex-col overflow-hidden rounded-2xl sm:flex-row"
        style={{
          background: 'var(--invert-card-bg)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
          border: '1px solid var(--invert-card-border)',
        }}
      >
        {/* Metric 1 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:pr-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Staff Seats Utilized
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {used}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              / {limit} max
            </span>
          </div>
          <div
            className="mt-2 h-1.5 w-full max-w-[200px] overflow-hidden rounded-full"
            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (used / limit) * 100)}%`,
                background: 'var(--blue-400)',
              }}
            />
          </div>
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

        {/* Metric 2 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Privileged Admins
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {adminCount}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              of {staff.length} team members
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--invert-card-subtle)' }}>
            MFA enforced policy
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

        {/* Metric 3 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Available Headroom
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {free}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              free seats
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--invert-card-subtle)' }}>
            Instant provisioning enabled
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

        {/* Metric 4 */}
        <div className="relative flex-1 p-5 sm:p-6 sm:pl-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            SSO & Directory
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span
              className="inline-flex size-2 rounded-full"
              style={{ background: 'var(--success-fg)' }}
            />
            <span
              className="font-mono text-sm font-medium"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              SAML 2.0 Active
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--invert-card-subtle)' }}>
            Google Workspace sync
          </p>
        </div>
      </div>

      {/* ── Main Content Area: Roster Table & Visualization ───────────────── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Staff Table */}
        <Panel
          title="Workspace Staff Roster"
          action={
            <button
              type="button"
              disabled
              title="Membership changes happen inside the workspace, through a logged support session."
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-all active:scale-95"
              style={{ opacity: 0.45, cursor: 'not-allowed', background: 'var(--blue-500)' }}
            >
              <IconUserPlus size={14} stroke={1.5} />
              Invite Member
            </button>
          }
          flush
        >
          {/* Filter Bar */}
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
                placeholder="Filter members by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-full rounded-lg pr-3 pl-8 text-xs transition-colors outline-none"
                style={{
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div className="flex items-center gap-1 self-start rounded-lg bg-[var(--surface-inset)] p-0.5 text-xs sm:self-auto">
              {(['all', 'admin', 'staff'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRoleFilter(r)}
                  className="rounded-md px-2.5 py-1 font-medium capitalize transition-all"
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
            <table className="w-full border-collapse text-left">
              <thead>
                <tr style={{ background: 'var(--surface-sunken)' }}>
                  <th
                    className="px-5 py-3 text-[11px] font-medium tracking-wider uppercase"
                    style={{
                      color: 'var(--text-tertiary)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    Team Member
                  </th>
                  <th
                    className="px-5 py-3 text-[11px] font-medium tracking-wider uppercase"
                    style={{
                      color: 'var(--text-tertiary)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    Role
                  </th>
                  <th
                    className="px-5 py-3 text-[11px] font-medium tracking-wider uppercase"
                    style={{
                      color: 'var(--text-tertiary)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    Status
                  </th>
                  <th
                    className="px-5 py-3 text-[11px] font-medium tracking-wider uppercase"
                    style={{
                      color: 'var(--text-tertiary)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  >
                    Last Active
                  </th>
                  <th
                    className="px-3 py-3 text-right text-[11px] font-medium tracking-wider uppercase"
                    style={{
                      color: 'var(--text-tertiary)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                  ></th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {filteredStaff.map((s) => (
                  <tr
                    key={s.id}
                    className="group transition-colors hover:bg-[var(--surface-sunken)]"
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex size-8 items-center justify-center rounded-lg text-xs font-medium"
                          style={{
                            background: 'var(--surface-inset)',
                            border: '1px solid var(--border-strong)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {s.name
                            .split(' ')
                            .slice(0, 2)
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <p
                            className="text-xs font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {s.name}
                          </p>
                          <p
                            className="font-mono text-[11px]"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {s.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="inline-flex items-center gap-1.5 text-xs font-medium">
                        {s.role === 'admin' ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px]"
                            style={{
                              background: 'rgba(245, 158, 11, 0.1)',
                              color: 'var(--warning-fg)',
                              border: '1px solid rgba(245, 158, 11, 0.2)',
                            }}
                          >
                            <IconShieldLock size={12} stroke={1.5} />
                            Admin
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px]"
                            style={{
                              background: 'var(--surface-inset)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            <IconUsers size={12} stroke={1.5} />
                            Staff
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase"
                        style={{
                          background:
                            s.status === 'active'
                              ? 'rgba(16, 185, 129, 0.1)'
                              : s.status === 'suspended'
                                ? 'rgba(239, 68, 68, 0.1)'
                                : 'var(--surface-inset)',
                          color:
                            s.status === 'active'
                              ? 'var(--success-fg)'
                              : s.status === 'suspended'
                                ? 'var(--danger-fg)'
                                : 'var(--text-tertiary)',
                        }}
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: 'currentColor' }}
                        />
                        {s.status}
                      </span>
                    </td>
                    <td
                      className="px-5 py-3.5 font-mono text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {s.lastSignIn}
                    </td>
                    <td className="px-3 py-3.5 text-right">
                      <button
                        type="button"
                        disabled
                        title="Membership changes happen inside the workspace, through a logged support session."
                        className="rounded-md p-1 transition-colors hover:bg-[var(--surface-inset)]"
                        style={{ opacity: 0.45, cursor: 'not-allowed', color: 'var(--text-tertiary)' }}
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
            <div className="relative flex h-44 items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={42}
                    outerRadius={62}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface-raised)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="font-mono text-xl font-medium"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {Math.round((used / limit) * 100)}%
                </span>
                <span
                  className="font-mono text-[10px] uppercase"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Occupied
                </span>
              </div>
            </div>

            <div
              className="mt-2 flex flex-col gap-2 border-t pt-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: 'var(--blue-500)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Assigned Staff</span>
                </div>
                <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                  {used}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ background: 'var(--surface-inset)' }}
                  />
                  <span style={{ color: 'var(--text-secondary)' }}>Available Quota</span>
                </div>
                <span className="font-mono font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {free}
                </span>
              </div>
            </div>
          </Panel>

          <div
            className="rounded-xl p-4"
            style={{
              background: 'var(--surface-sunken)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <p
              className="font-mono text-xs leading-relaxed"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Staff members inherit fine-grained access policies. Role modifications write directly
              to the workspace audit ledger.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
