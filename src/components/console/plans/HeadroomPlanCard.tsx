'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconInfoCircle, IconUsers, IconKey, IconHash, IconCircleDot, type Icon as TablerIcon } from '@tabler/icons-react';
import { type HeadroomRow, type HeadroomModel } from '@/lib/console/data';
import { LimitEditor } from './LimitEditor';

const PRESSURE_THRESHOLD = 90;

const UNLIMITED_HEADROOM = 1.25;

function scaleOf(row: HeadroomRow): number {
  if (row.limit !== null && row.limit > 0) return row.limit;
  return Math.max(row.max * UNLIMITED_HEADROOM, 1);
}

function pct(value: number, scale: number): number {
  return Math.max(0, Math.min(100, (value / scale) * 100));
}

function Row({
  row,
  /**
   * Only the expanded dialog passes this. The collapsed card is a TRIGGER —
   * the whole thing is one button — so a second button inside it would be
   * nested interactive content, which is both invalid and unclickable.
   */
  editablePlan,
}: {
  row: HeadroomRow;
  editablePlan?: string;
}) {
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
    <div className="grid gap-2 py-4" style={{ borderTop: '1px solid color-mix(in srgb, var(--border-subtle) 30%, transparent)', boxShadow: 'var(--glass-highlight)' }}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex items-center gap-2.5 text-[13px] font-medium tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
          <Icon size={16} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
          {row.label}
        </span>
        <span className="flex shrink-0 items-baseline gap-2">
          <span
            className="whitespace-nowrap font-mono text-[11px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {row.tenants === 0
              ? 'nothing reports this'
              : unbounded
                ? `median ${row.p50} · max ${row.max} · no limit`
                : `median ${row.p50} · max ${row.max} of ${row.limit}`}
          </span>
          {editablePlan && row.entitlementId ? (
            <LimitEditor row={row} planName={editablePlan} variant="inline" />
          ) : null}
        </span>
      </div>

      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full mt-1 mb-1"
        style={{
          background: 'var(--surface-sunken)',
          boxShadow: 'var(--neu-inset)',
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
          style={{ width: `${medianPct}%`, background: 'var(--blue-200)', boxShadow: 'var(--glass-highlight)' }}
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
            boxShadow: 'var(--shadow-lg), var(--glass-highlight)',
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
        {/* Centring on the wrapper, not on a transform — `panel-in` ends at
            `transform: none` and the reduced-motion block forces it with
            `!important`, either of which cancels translate-based centring.
            See `ProvisionWorkspaceDialog` for the full account. */}
        <div className="pointer-events-none fixed inset-0 z-[150] grid place-items-center p-4">
        <Dialog.Content
          className="surface-glass-strong pointer-events-auto w-[880px] max-w-[92vw] overflow-hidden rounded-[32px]"
          style={{ animation: 'panel-in var(--duration-base) var(--ease-out)', border: '1px solid color-mix(in srgb, var(--border-subtle) 50%, transparent)' }}
        >
          <div className="flex items-center justify-between px-8 pt-8 pb-4">
            <div>
              <p className="text-[11px] font-medium tracking-[0.1em] uppercase mb-2" style={{ color: 'var(--text-tertiary)' }}>
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
            <div className="grid w-full rounded-[24px] p-6 mb-8" style={{ background: 'var(--surface-raised)', boxShadow: 'var(--shadow-lg), var(--glass-highlight)' }}>
              {plan.rows.map((row) => (
                <Row key={row.key} row={row} editablePlan={plan.name} />
              ))}
            </div>

            {plan.workspaces && plan.workspaces.length > 0 && (
              <div className="mb-8">
                <h4 className="text-[11px] font-medium tracking-[0.1em] uppercase mb-4" style={{ color: 'var(--text-tertiary)' }}>Assigned Workspaces</h4>
                <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-subtle) transparent' }}>
                  {plan.workspaces.map((ws, i) => (
                    <div key={i} className="flex items-center px-3.5 py-1.5 rounded-full text-[12.5px] font-medium transition-colors hover:bg-[var(--surface-inset)] cursor-default" style={{ background: 'var(--surface-sunken)', color: 'var(--text-secondary)', border: '1px solid color-mix(in srgb, var(--border-subtle) 80%, transparent)' }}>
                      {ws.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t pt-6" style={{ borderColor: 'color-mix(in srgb, var(--border-subtle) 50%, transparent)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--surface-raised)', boxShadow: 'var(--shadow-sm), var(--glass-highlight)' }}>
                  <IconInfoCircle size={20} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
                </div>
                <p className="text-[13px] leading-relaxed max-w-[32ch]" style={{ color: 'var(--text-secondary)' }}>
                  Median usage provides the typical footprint. The max line shows the absolute ceiling.
                </p>
                {/*
                  ⚠ THE SENTENCE STAYS; THE DEAD BUTTON DOES NOT.

                  "Manage limits" was disabled with this paragraph beside it, and
                  the paragraph is correct — a limit belongs to the PLAN, and a
                  ceiling for one customer is an override on that workspace. What
                  it never justified was the platform owner being unable to
                  change his own price list. It now reads as what it always was:
                  which of the two things the control does, and where the other
                  one lives.
                */}
                <p
                  className="mt-3 text-[12px] leading-relaxed max-w-[36ch]"
                  style={{ color: 'var(--text-tertiary)', textWrap: 'pretty' }}
                >
                  A limit is a property of the plan, so changing one changes what every workspace on
                  it is entitled to &mdash; the dialog counts them first. To lift a ceiling for a
                  single customer instead, grant an override on that workspace.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Dialog.Close asChild>
                  <button type="button" className="t-compact h-10 px-5 rounded-full transition-colors hover:bg-[var(--surface-inset)]" style={{ color: 'var(--text-secondary)' }}>
                    Close
                  </button>
                </Dialog.Close>
              </div>
            </div>
          </div>
        </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
