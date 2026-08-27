'use client';

import React, { useState } from 'react';
import {
  IconFileText,
  IconCheck,
  IconAlertTriangle,
  IconDownload,
  IconRefresh,
  IconCreditCard,
} from '@tabler/icons-react';
import { Panel } from '@/components/console/Surface';
import { useRovingGrid } from '@/hooks/useRovingGrid';
import type { WorkspaceDetail } from '@/lib/console/data';

export function BillingTab({ w }: { w: WorkspaceDetail }) {
  const [filter, setFilter] = useState<'all' | 'paid' | 'failed'>('all');

  const filteredInvoices = w.invoices.filter((inv) => {
    if (filter === 'paid') return inv.status === 'paid';
    if (filter === 'failed') return inv.status === 'failed';
    return true;
  });

  // Sheet 13: the invoice table is one tab stop, not one per row.
  const grid = useRovingGrid<HTMLTableRowElement>({ count: filteredInvoices.length });

  return (
    <div className="flex flex-col gap-6">
      {/* ── Inverted Command Ribbon for Billing ───────────────────────────── */}
      <div
        className="flex flex-col overflow-hidden rounded-2xl sm:flex-row"
        style={{
          background: 'var(--invert-card-bg)',
          color: 'var(--invert-card-fg)',
          boxShadow: 'var(--invert-card-shadow)',
          border: '1px solid var(--invert-card-border)',
        }}
      >
        {/* Stat 1: Monthly Recurring */}
        <div className="relative flex-1 p-5 sm:p-6 sm:pr-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Monthly Recurring
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              KES {w.billingStats[0]?.value ?? '0'}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            {w.plan || 'Trial'} tier
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

        {/* Stat 2: Lifetime Value */}
        <div className="relative flex-1 p-5 sm:p-6 sm:px-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Estimated LTV
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              KES {w.billingStats[1]?.value ?? '0'}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            Contract value total
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

        {/* Stat 3: Outstanding */}
        <div
          className="relative flex-1 p-5 sm:p-6 sm:px-8"
          style={{
            background:
              w.status === 'past due'
                ? 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.15), transparent 75%)'
                : 'transparent',
          }}
        >
          <div
            className="t-eyebrow"
            style={{
              color: w.status === 'past due' ? 'var(--danger-fg)' : 'var(--invert-card-subtle)',
            }}
          >
            Outstanding Balance
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{
                color: w.status === 'past due' ? 'var(--danger-fg)' : 'var(--invert-card-fg)',
              }}
            >
              KES {w.billingStats[2]?.value ?? '0'}
            </span>
          </div>
          <p
            className="mt-1 font-mono text-xs"
            style={{
              color: w.status === 'past due' ? 'var(--danger-fg)' : 'var(--invert-card-subtle)',
            }}
          >
            {w.status === 'past due' ? '1 overdue invoice' : 'All settled'}
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

        {/* Stat 4: Collection Rate */}
        <div className="relative flex-1 p-5 sm:p-6 sm:pl-8">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>
            Collection Rate
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {w.billingStats[3]?.value ?? '100%'}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
            Past 12 cycles
          </p>
        </div>
      </div>

      {/* ── Payment Method & Invoices Section ──────────────────────────── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* Invoices List */}
        <Panel
          title="Billing History & Invoices"
          action={
            <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-inset)] p-0.5 text-xs">
              {(['all', 'paid', 'failed'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="rounded-md px-2.5 py-1 font-medium capitalize transition-all"
                  style={{
                    background: filter === f ? 'var(--surface-raised)' : 'transparent',
                    color: filter === f ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    boxShadow: filter === f ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          }
          flush
        >
          {filteredInvoices.length > 0 ? (
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
                      Invoice ID
                    </th>
                    <th
                      className="px-5 py-3 text-[11px] font-medium tracking-wider uppercase"
                      style={{
                        color: 'var(--text-tertiary)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      Period
                    </th>
                    <th
                      className="px-5 py-3 text-right text-[11px] font-medium tracking-wider uppercase"
                      style={{
                        color: 'var(--text-tertiary)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      Amount (KES)
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
                      className="px-5 py-3 text-right text-[11px] font-medium tracking-wider uppercase"
                      style={{
                        color: 'var(--text-tertiary)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      Paid Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {filteredInvoices.map((inv, i) => (
                    <tr
                      key={inv.id}
                      {...grid.getRowProps(i)}
                      className="group transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--blue-500)]"
                      style={{
                        background:
                          inv.status === 'failed' ? 'rgba(239, 68, 68, 0.02)' : 'transparent',
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="rounded-lg p-1.5"
                            style={{ background: 'var(--surface-inset)' }}
                          >
                            <IconFileText
                              size={15}
                              stroke={1.5}
                              style={{ color: 'var(--text-secondary)' }}
                              aria-hidden
                            />
                          </div>
                          <span
                            className="font-mono text-xs font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {inv.id}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-5 py-3.5 font-mono text-xs"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {inv.period} · Issued {inv.issued}
                      </td>
                      <td
                        className="px-5 py-3.5 text-right font-mono text-xs font-medium"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {inv.amount}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase"
                          style={{
                            background:
                              inv.status === 'paid'
                                ? 'rgba(16, 185, 129, 0.1)'
                                : 'rgba(239, 68, 68, 0.1)',
                            color: inv.status === 'paid' ? 'var(--success-fg)' : 'var(--danger-fg)',
                            border: `1px solid ${inv.status === 'paid' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                          }}
                        >
                          {inv.status === 'paid' ? (
                            <IconCheck size={10} stroke={2.5} />
                          ) : (
                            <IconAlertTriangle size={10} stroke={2} />
                          )}
                          {inv.status}
                        </span>
                      </td>
                      <td
                        className="px-5 py-3.5 text-right font-mono text-xs"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {inv.paid}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="p-8 text-center font-mono text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              No invoice records matching filter.
            </div>
          )}
        </Panel>

        {/* Payment Instrument & Auto-Debit Specs */}
        <div className="flex flex-col gap-5">
          <Panel title="Payment Instrument">
            <div
              className="flex items-start gap-3.5 rounded-xl p-4"
              style={{
                background: 'var(--surface-sunken)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                className="rounded-lg p-2"
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-strong)',
                }}
              >
                <IconCreditCard size={20} stroke={1.5} style={{ color: 'var(--text-primary)' }} />
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                  Standard Chartered KE · Direct Debit
                </p>
                <p
                  className="mt-0.5 font-mono text-[11px]"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  Account ending in •••• 4912
                </p>
                <p className="mt-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  Next debit auto-scheduled for 04 Sep 2026
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                className="inline-flex h-8.5 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
                style={{
                  border: '1px solid var(--border-strong)',
                  background: 'var(--surface-raised)',
                  color: 'var(--text-primary)',
                }}
              >
                <IconRefresh size={13} stroke={1.5} />
                Update Payment Method
              </button>
              <button
                type="button"
                className="inline-flex h-8.5 w-full items-center justify-center gap-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
                style={{
                  border: '1px solid var(--border-subtle)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                }}
              >
                <IconDownload size={13} stroke={1.5} />
                Download Tax Statement (KRA)
              </button>
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
              All billing amounts in Kenyan Shillings (KES). Direct gateway integration executes
              reconciliation jobs on the 4th of each month.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
