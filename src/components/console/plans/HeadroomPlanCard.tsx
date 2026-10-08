'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  IconArrowUpRight,
  IconBook,
  IconClock,
  IconHash,
  IconKey,
  IconMessageCircle,
  IconStack2,
  IconUsers,
  IconGauge,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { type HeadroomRow, type HeadroomModel } from '@/lib/console/data';
import { ConsoleDialog } from '@/components/primitives/ConsoleDialog';
import { Button } from '@/components/primitives/Button';
import { LimitEditor } from './LimitEditor';

const PRESSURE_THRESHOLD = 90;
const number = new Intl.NumberFormat('en');
const ROW_ICONS: Record<string, TablerIcon> = {
  'Staff seats': IconUsers,
  Seats: IconUsers,
  'API keys': IconKey,
  Channels: IconHash,
  'Conversations this month': IconMessageCircle,
  'Knowledge base documents': IconBook,
  'Activity history': IconClock,
  'Support response time': IconClock,
  'Assistant rule versions retained': IconStack2,
};

function allowance(row: HeadroomRow) {
  return row.limit === null ? 'Unlimited' : amount(row.limit, row.key);
}

function amount(value: number, key: string) {
  const unit = key === 'audit_retention_days' ? 'day' : key === 'support_sla_hours' ? 'hour' : null;
  return `${number.format(value)}${unit ? ` ${unit}${value === 1 ? '' : 's'}` : ''}`;
}

/** Plot recorded usage only against a positive allowance; unlimited has no percentage. */
function UsageRow({ row, planName }: { row: HeadroomRow; planName?: string }) {
  const Icon = ROW_ICONS[row.label] ?? IconGauge;
  const limit = row.limit;
  const bounded = limit !== null && limit > 0;
  const percentage = (value: number) =>
    bounded ? Math.max(0, Math.min(100, (value / limit) * 100)) : 0;
  return (
    <div className="min-w-0 py-4">
      <div className="flex items-start justify-between gap-3">
        <span className="flex min-w-0 items-start gap-2 text-sm font-medium text-[var(--text-primary)]">
          <Icon
            size={16}
            stroke={1.5}
            aria-hidden
            className="mt-0.5 shrink-0 text-[var(--text-tertiary)]"
          />
          <span>{row.label}</span>
        </span>
        {planName && row.entitlementId ? (
          <LimitEditor row={row} planName={planName} variant="inline" />
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {[
          ['Median', amount(row.p50, row.key)],
          ['Highest', amount(row.max, row.key)],
          ['Allowance', allowance(row)],
        ].map(([label, value]) => (
          <span key={label} className="grid min-w-0 gap-1">
            <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
            <span className="text-sm font-medium break-words text-[var(--text-primary)] tabular-nums">
              {value}
            </span>
          </span>
        ))}
      </div>
      {bounded ? (
        <div
          className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-sunken)] shadow-[var(--neu-inset)]"
          role="img"
          aria-label={`${row.label}: median ${row.p50}, highest ${row.max}, allowance ${row.limit}`}
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--blue-200)]"
            style={{ width: `${percentage(row.p50)}%` }}
          />
          <span
            className="absolute inset-y-0 w-1 rounded-full"
            style={{
              left: `clamp(0px, calc(${percentage(row.max)}% - 2px), calc(100% - 4px))`,
              background: row.atCeiling > 0 ? 'var(--accent-mark)' : 'var(--blue-500)',
            }}
          />
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--text-tertiary)]">
          {row.limit === null
            ? 'Usage is recorded without a plan ceiling.'
            : 'This plan provides no allowance.'}
        </p>
      )}
      {row.atCeiling > 0 && row.limit !== null ? (
        <p className="mt-2 text-xs leading-relaxed text-[var(--accent-mark-text)]">
          {row.atCeiling} {row.atCeiling === 1 ? 'workspace' : 'workspaces'}{' '}
          {row.limit === 0
            ? 'with a zero allowance'
            : `at ${PRESSURE_THRESHOLD}% of the allowance or higher`}
        </p>
      ) : null}
      {planName ? (
        <p className="mt-2 text-xs text-[var(--text-tertiary)]">
          Based on {row.tenants} {row.tenants === 1 ? 'workspace with' : 'workspaces with'} recorded
          usage.
        </p>
      ) : null}
    </div>
  );
}

export function HeadroomPlanCard({ plan }: { plan: HeadroomModel['plans'][0] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const measured = plan.rows.filter((row) => row.tenants > 0);
  const unmeasured = plan.rows.filter((row) => row.tenants === 0);
  return (
    <>
      <article className="flex min-w-0 flex-col overflow-hidden rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] shadow-[var(--glass-highlight)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-5">
          <div className="min-w-0">
            <h3 className="text-lg font-medium tracking-tight text-[var(--text-primary)]">
              {plan.name}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-tertiary)]">
              {plan.tenants} {plan.tenants === 1 ? 'workspace assigned' : 'workspaces assigned'}
            </p>
          </div>
          <button
            type="button"
            aria-label={`Review ${plan.name} headroom`}
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={(event) => {
              triggerRef.current = event.currentTarget;
              setOpen(true);
            }}
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
          >
            <IconArrowUpRight size={17} stroke={1.5} aria-hidden />
          </button>
        </div>
        <div className="divide-y divide-[var(--border-subtle)] px-5">
          {measured.map((row) => (
            <UsageRow key={row.key} row={row} />
          ))}
          {measured.length === 0 ? (
            <p className="py-6 text-sm leading-relaxed text-[var(--text-secondary)]">
              Usage has not been recorded for this plan. Review its allowances and assigned
              workspaces below.
            </p>
          ) : null}
        </div>
        <div className="mt-auto border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 px-5 py-4">
          {unmeasured.length > 0 ? (
            <p className="mb-3 text-xs leading-relaxed text-[var(--text-tertiary)]">
              {unmeasured.length} {unmeasured.length === 1 ? 'allowance has' : 'allowances have'} no
              recorded usage.
            </p>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              triggerRef.current = event.currentTarget;
              setOpen(true);
            }}
            aria-haspopup="dialog"
            className="flex min-h-9 w-full items-center justify-between gap-3 text-sm font-medium text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
          >
            <span>Review {plan.name} allowances</span>
            <IconArrowUpRight size={16} stroke={1.5} aria-hidden className="shrink-0" />
          </button>
        </div>
      </article>
      <ConsoleDialog
        returnFocusRef={triggerRef}
        open={open}
        onOpenChange={setOpen}
        eyebrow="Plan headroom"
        title={plan.name}
        description={`${plan.tenants} ${plan.tenants === 1 ? 'workspace is' : 'workspaces are'} assigned to this plan. Review recorded usage before changing an allowance.`}
        width="xl"
        actions={<Button onClick={() => setOpen(false)}>Done</Button>}
      >
        {measured.length > 0 ? (
          <section
            aria-label="Recorded usage"
            className="rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-4 sm:px-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-[var(--border-subtle)] py-4">
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Recorded usage</h3>
              <p className="text-xs text-[var(--text-tertiary)]">
                Bar: median · Mark: highest recorded usage
              </p>
            </div>
            <div className="grid gap-x-8 sm:grid-cols-2">
              {measured.map((row) => (
                <div
                  key={row.key}
                  className="min-w-0 border-b border-[var(--border-subtle)] last:border-b-0"
                >
                  <UsageRow row={row} planName={plan.name} />
                </div>
              ))}
            </div>
          </section>
        ) : null}
        {unmeasured.length > 0 ? (
          <section
            aria-label="Allowances without recorded usage"
            className="mt-5 rounded-panel bg-[var(--surface-sunken)] px-4 py-4 sm:px-5"
          >
            <h3 className="text-sm font-medium text-[var(--text-primary)]">Usage not recorded</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
              These allowances are configured, but no workspace reports the corresponding usage. An
              absent measurement does not mean zero usage.
            </p>
            <div className="mt-3 divide-y divide-[var(--border-subtle)]">
              {unmeasured.map((row) => (
                <div
                  key={row.key}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3"
                >
                  <span className="text-sm text-[var(--text-primary)]">{row.label}</span>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <span className="text-sm text-[var(--text-secondary)] tabular-nums">
                      {allowance(row)}
                    </span>
                    {row.entitlementId ? (
                      <LimitEditor row={row} planName={plan.name} variant="inline" />
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
        <section aria-label="Assigned workspaces" className="mt-6">
          <h3 className="text-sm font-medium text-[var(--text-primary)]">Assigned workspaces</h3>
          {plan.workspaces.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {plan.workspaces.map((workspace) => (
                <Link
                  key={workspace.slug}
                  href={`/platform/tenants/${encodeURIComponent(workspace.slug)}`}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-overlay px-3 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
                >
                  <span className="break-words">{workspace.name}</span>
                  <IconArrowUpRight size={14} stroke={1.5} aria-hidden className="shrink-0" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              No workspaces are assigned to this plan.
            </p>
          )}
        </section>
        <p className="mt-5 border-t border-[var(--border-subtle)] pt-4 text-xs leading-relaxed text-[var(--text-tertiary)]">
          Editing a plan allowance affects every assigned workspace. Use a workspace override for an
          individual exception. The highest recorded usage is a measurement, not the plan ceiling.
        </p>
      </ConsoleDialog>
    </>
  );
}
