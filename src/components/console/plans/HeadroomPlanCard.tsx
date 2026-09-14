'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconInfoCircle, IconUsers, IconKey, IconHash, IconCircleDot, IconSettings, type Icon as TablerIcon } from '@tabler/icons-react';
import { type HeadroomRow, type HeadroomModel } from '@/lib/console/data';

const PRESSURE_THRESHOLD = 90;

const UNLIMITED_HEADROOM = 1.25;

function scaleOf(row: HeadroomRow): number {
  if (row.limit !== null && row.limit > 0) return row.limit;
  return Math.max(row.max * UNLIMITED_HEADROOM, 1);
}

function pct(value: number, scale: number): number {
  return Math.max(0, Math.min(100, (value / scale) * 100));
}

function Row({ row }: { row: HeadroomRow }) {
  const scale = scaleOf(row);
  const medianPct = pct(row.p50, scale);
  const maxPct = pct(row.max, scale);
  const unbounded = row.limit === null;

  const ROW_ICONS: Record<string, TablerIcon> = {
    'Staff seats': IconUsers,
    'API keys': IconKey,
    'Channels': IconHash,
  };
  const Icon = ROW_ICONS[row.label] || IconCircleDot;

  const pressed = !unbounded && maxPct >= PRESSURE_THRESHOLD;
  const maxInk = pressed ? 'var(--accent-mark)' : 'var(--blue-500)';

  return (
    <div className="grid gap-2 py-4" style={{ borderTop: '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.6)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2.5 text-[13px] font-medium tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
          <Icon size={16} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
          {row.label}
        </span>
        <span
          className="shrink-0 whitespace-nowrap font-mono text-[11px]"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {row.tenants === 0
            ? 'nothing reports this'
            : unbounded
              ? `median ${row.p50} · max ${row.max} · no limit`
              : `median ${row.p50} · max ${row.max} of ${row.limit}`}
        </span>
      </div>

      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full mt-1 mb-1"
        style={{
          background: 'var(--surface-sunken)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
        }}
        role="img"
        aria-label={
          row.tenants === 0
            ? `${row.label}: no workspace reports this counter`
            : `${row.label}: median ${row.p50}, maximum ${row.max}${
                unbounded ? ', no limit' : ` of ${row.limit}`
              }`
        }
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${medianPct}%`, background: 'var(--blue-200)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }}
        />
        {row.tenants > 0 ? (
          <span
            className="absolute inset-y-0 w-[4px] rounded-full"
            style={{
              left: `calc(${maxPct}% - 2px)`,
              background: maxInk,
              boxShadow: `0 0 6px ${maxInk}80`,
            }}
          />
        ) : null}
      </div>

      {row.atCeiling > 0 ? (
        <span
          className="whitespace-nowrap font-mono text-[10px] font-medium tracking-wide uppercase"
          style={{ color: 'var(--accent-mark-text)' }}
        >
          {row.atCeiling} {row.atCeiling === 1 ? 'workspace is' : 'workspaces are'} at{' '}
          {PRESSURE_THRESHOLD}% or above
        </span>
      ) : null}
    </div>
  );
}

export function HeadroomPlanCard({ plan }: { plan: HeadroomModel['plans'][0] }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex flex-col gap-2 rounded-[32px] p-8 transition-all hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 text-left w-full group relative"
          style={{
            background: 'var(--surface-raised)',
            border: '2px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.03), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          <div className="flex items-center justify-between pb-2 w-full">
            <h3 className="text-base font-medium tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {plan.name}
            </h3>
            <span
              className="whitespace-nowrap font-mono text-[11px] font-medium"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {plan.tenants} {plan.tenants === 1 ? 'workspace' : 'workspaces'}
            </span>
          </div>
          <div className="grid w-full">
            {plan.rows.map((row) => (
              <Row key={row.key} row={row} />
            ))}
          </div>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-[150]"
          style={{
            background: 'var(--surface-overlay)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            animation: 'overlay-in var(--duration-fast) linear',
          }}
        />
        <Dialog.Content
          className="surface-glass-strong fixed top-1/2 left-1/2 z-[150] w-[880px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[32px]"
          style={{ animation: 'panel-in var(--duration-base) var(--ease-out)', border: '1px solid color-mix(in srgb, var(--border-subtle) 50%, transparent)' }}
        >
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
                Plan Headroom Details
              </p>
              <Dialog.Title asChild>
                <h2 className="font-serif text-[32px] tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
                  {plan.name}
                </h2>
              </Dialog.Title>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[24px] font-mono font-medium leading-none" style={{ color: 'var(--text-primary)' }}>
                  {plan.tenants}
                </span>
                <span className="text-[12px] font-medium mt-1" style={{ color: 'var(--text-tertiary)' }}>
                  {plan.tenants === 1 ? 'workspace assigned' : 'workspaces assigned'}
                </span>
              </div>
            </div>
          </div>

          <div className="px-8 pb-8 pt-2">
            <div className="grid w-full rounded-[24px] p-6 mb-8" style={{ background: 'var(--surface-raised)', boxShadow: '0 8px 32px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.02), inset 0 1px 0 rgba(255,255,255,1)' }}>
              {plan.rows.map((row) => (
                <Row key={row.key} row={row} />
              ))}
            </div>

            {plan.workspaces && plan.workspaces.length > 0 && (
              <div className="mb-8">
                <h4 className="text-[11px] font-semibold tracking-[0.1em] uppercase mb-4" style={{ color: 'var(--text-tertiary)' }}>Assigned Workspaces</h4>
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-subtle) transparent' }}>
                  {plan.workspaces.map((ws, i) => (
                    <div key={i} className="flex items-center px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors hover:bg-black/5 cursor-default" style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)', border: '1px solid color-mix(in srgb, var(--border-subtle) 80%, transparent)' }}>
                      {ws.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-6" style={{ borderColor: 'color-mix(in srgb, var(--border-subtle) 50%, transparent)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--surface-raised)', boxShadow: '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                  <IconInfoCircle size={20} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
                </div>
                <p className="text-[13px] leading-relaxed max-w-[32ch]" style={{ color: 'var(--text-secondary)' }}>
                  Median usage provides the typical footprint. The max line shows the absolute ceiling.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Dialog.Close asChild>
                  <button type="button" className="t-compact h-10 px-5 rounded-full transition-colors hover:bg-black/5" style={{ color: 'var(--text-secondary)' }}>
                    Close
                  </button>
                </Dialog.Close>
                <button
                  type="button"
                  disabled
                  title="Plan limits are configured centrally."
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-[13px] font-medium transition-all whitespace-nowrap"
                  style={{ background: 'var(--blue-500)', color: '#ffffff', opacity: 0.5, cursor: 'not-allowed' }}
                >
                  <IconSettings size={16} stroke={1.5} />
                  Manage limits
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
