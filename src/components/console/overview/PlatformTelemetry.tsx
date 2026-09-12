'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowUpRight,
  IconBrain,
  IconBrandWhatsapp,
  IconCheck,
  IconChevronDown,
  IconReceiptRefund,
  IconServer2,
  IconShieldCheck,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import type { Vital, VitalIcon } from '@/lib/console/data';
import { SkeletonGroup } from '@/components/primitives/Skeleton';

/**
 * PLATFORM TELEMETRY. The overview's right rail, top card.
 *
 * ⚠ IT NOW RENDERS WHAT IT IS GIVEN. IT USED TO INVENT IT.
 *
 * This file carried a `METRIC_SPECS` map holding every service's title,
 * sublabel, SLA target, gauge ratio and four detail rows — "p50 latency 44ms",
 * "Edge cluster NBO-1", "Twilio SMS Gateway 99.1%". None of it had a source and
 * none of it was reachable by the live reader, which is the seam rule broken in
 * the one direction that matters: invented figures on an operations screen are
 * worse than no figures, because somebody acts on them.
 *
 * Three defects went with it:
 *
 *   THE MAP WAS KEYED BY THE VITAL'S LABEL, so renaming a service silently
 *   dropped its entire spec to a generic fallback.
 *
 *   THE LIVE READER RETURNS NO VITALS, so a signed-in operator saw an EMPTY
 *   rail with no empty state while the review bypass saw four richly detailed
 *   services. That is the opposite of the arrangement every other surface uses.
 *
 *   FOUR SERVICE COLOURS WERE RAW — `rgba(73,128,252,0.1)`, `#c084fc` — and the
 *   footer's tick was `text-emerald-500`, a second green beside the product's.
 *
 * ⚠ THE FOOTER IS DERIVED, NOT DECLARED. It used to read "9 consecutive days
 * incident-free · 99.98% composite SLA". Neither number had a source. It now
 * counts the vitals it was handed, which is a smaller claim and a true one, and
 * it cannot drift from the rows above it.
 */

const ICON: Record<VitalIcon, TablerIcon> = {
  api: IconServer2,
  ai: IconBrain,
  channel: IconBrandWhatsapp,
  job: IconReceiptRefund,
};

/** Two views over the same rows: the live figure, or the budget it is measured
 *  against. Not two datasets — the same vital, asked a different question. */
type ViewMode = 'live' | 'budgets';

export function PlatformTelemetry({ vitals }: { vitals: Vital[] }) {
  const [viewMode, setViewMode] = React.useState<ViewMode>('live');
  const [expandedKey, setExpandedKey] = React.useState<string | null>(null);

  const healthy = vitals.filter((v) => v.state === 'ok').length;
  const worst: Vital['state'] = vitals.some((v) => v.state === 'bad')
    ? 'bad'
    : vitals.some((v) => v.state === 'warn')
      ? 'warn'
      : 'ok';

  return (
    <section
      className="relative flex flex-col rounded-[16px] p-5"
      style={{
        background: 'var(--surface-sunken)',
        boxShadow: 'var(--shadow-sm), var(--glass-highlight), 0 0 0 1px var(--border-subtle)',
      }}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3
          className="text-[12px] font-semibold tracking-widest uppercase"
          style={{ color: 'var(--text-secondary)' }}
        >
          Platform telemetry
        </h3>

        <div className="flex items-center gap-6">
          {/*
            ⚠ A TAB LIST, DECLARED AS ONE. Two buttons that swap a view are a
            tablist to anything not looking at the screen, and 03 §17 asks for
            the landmark. It costs three attributes.
          */}
          <div className="flex items-center gap-4" role="tablist" aria-label="Telemetry view">
            <ViewTab active={viewMode === 'live'} onSelect={() => setViewMode('live')}>
              Live
            </ViewTab>
            <ViewTab active={viewMode === 'budgets'} onSelect={() => setViewMode('budgets')}>
              Budgets
            </ViewTab>
          </div>

          <Link
            href="/platform/health"
            className="group flex items-center gap-1 text-[12px] font-medium transition-colors hover:underline"
            style={{ color: 'var(--text-action)' }}
          >
            Health
            <IconArrowUpRight
              size={12}
              stroke={2}
              className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transform-none"
            />
          </Link>
        </div>
      </header>

      {vitals.length === 0 ? (
        <TelemetryUnwired />
      ) : (
        <>
          <div
            className="mt-2 flex flex-col overflow-hidden rounded-[12px]"
            style={{
              background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {vitals.map((v, i) => (
              <VitalRow
                key={v.key}
                vital={v}
                viewMode={viewMode}
                expanded={expandedKey === v.key}
                onToggle={() => setExpandedKey((cur) => (cur === v.key ? null : v.key))}
                isLast={i === vitals.length - 1}
              />
            ))}
          </div>

          <footer className="mt-4 flex flex-wrap items-center justify-between gap-2 px-2">
            <span className="flex items-center gap-2">
              {worst === 'ok' ? (
                <IconShieldCheck
                  size={14}
                  stroke={1.75}
                  style={{ color: 'var(--success-fg)' }}
                  aria-hidden
                />
              ) : (
                <IconAlertTriangle
                  size={14}
                  stroke={1.75}
                  style={{ color: STATE_INK[worst] }}
                  aria-hidden
                />
              )}
              <span className="text-[11.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                {healthy} of {vitals.length} within budget
              </span>
            </span>
            {/*
              ⚠ "Designed" IS THE HONEST LABEL AND IT STAYS UNTIL PROBES LAND.
              The health page makes the same statement about the same figures.
              A rail that looks live and is not is the defect this pass exists
              to remove.
            */}
            <span
              className="text-[11px] font-medium tracking-wide"
              style={{ color: 'var(--text-tertiary)' }}
            >
              designed figures · no probes in Phase 1
            </span>
          </footer>
        </>
      )}
    </section>
  );
}

const STATE_INK: Record<Vital['state'], string> = {
  ok: 'var(--success-fg)',
  warn: 'var(--warning-fg)',
  bad: 'var(--danger-fg)',
};

function ViewTab({
  active,
  onSelect,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className="relative pb-1 text-[11px] font-semibold tracking-widest uppercase transition-colors"
      style={{ color: active ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
    >
      {children}
      {active ? (
        <span
          aria-hidden
          className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full"
          style={{ background: 'var(--text-primary)' }}
        />
      ) : null}
    </button>
  );
}

function VitalRow({
  vital,
  viewMode,
  expanded,
  onToggle,
  isLast,
}: {
  vital: Vital;
  viewMode: ViewMode;
  expanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  const Icon = ICON[vital.icon] ?? IconActivity;
  const ink = STATE_INK[vital.state];
  const off = vital.state !== 'ok';
  const panelId = `vital-${vital.key}`;

  return (
    <div
      className="group transition-colors duration-300"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        background: expanded ? 'var(--surface-sunken)' : undefined,
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface-sunken)]"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            className="grid size-6 shrink-0 place-items-center rounded-md transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none"
            style={{ color: off ? ink : 'var(--blue-400)' }}
            aria-hidden
          >
            <Icon size={15} stroke={1.75} />
          </span>

          <span className="flex min-w-0 items-center gap-2">
            <span
              className="truncate text-[14px] font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {vital.label}
            </span>
            {off ? (
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: ink }}
                title={vital.statusText}
                aria-hidden
              />
            ) : null}
          </span>
        </span>

        <span className="flex shrink-0 items-center gap-3">
          {viewMode === 'live' ? (
            <span className="text-right">
              <span className="flex items-baseline justify-end gap-1.5">
                {/*
                  ⚠ THE FIGURE AND ITS UNIT ARE TWO FIELDS, NOT ONE STRING SPLIT
                  ON A SPACE. The old code did `v.value.split(' ')[0]`, which
                  silently mangled any value containing a space and set the
                  whole thing at one size when the design sets them at two.
                */}
                <span
                  className="font-mono text-[14px] font-medium tracking-tight"
                  style={{ color: off ? ink : 'var(--text-primary)' }}
                >
                  {vital.value}
                </span>
                <span className="text-[12px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {vital.unit}
                </span>
              </span>

              <span
                className="mt-1 flex h-[2px] w-24 overflow-hidden rounded-full"
                style={{ background: 'var(--surface-inset)' }}
                role="img"
                aria-label={`${vital.label}: ${Math.round(vital.ratio * 100)}% of ${vital.target}`}
              >
                <span
                  className="h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                  style={{
                    /* Clamped here rather than trusted from the model: a ratio
                       above 1 is a real state (over budget) and must not draw a
                       bar wider than its own track. */
                    width: `${Math.min(100, Math.max(6, vital.ratio * 100))}%`,
                    background: off ? ink : 'var(--success-fg)',
                  }}
                />
              </span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 font-mono text-[11.5px] font-medium tracking-tight"
              style={{ color: off ? ink : 'var(--success-fg)' }}
            >
              {off ? (
                <IconAlertTriangle size={13} stroke={1.75} aria-hidden />
              ) : (
                <IconCheck size={13} stroke={2} aria-hidden />
              )}
              {vital.target}
            </span>
          )}

          <IconChevronDown
            size={13}
            stroke={2}
            aria-hidden
            className="transition-transform duration-200 motion-reduce:transition-none"
            style={{
              color: expanded ? 'var(--text-primary)' : 'var(--text-tertiary)',
              transform: expanded ? 'rotate(180deg)' : undefined,
            }}
          />
        </span>
      </button>

      {/*
        ⚠ `hidden` RATHER THAN A MAX-HEIGHT OF ZERO. The old version animated
        `max-h-0 opacity-0`, which leaves the content in the accessibility tree
        and in the tab order — a screen reader read four collapsed services'
        details as though they were on screen. A fixed max-height also clipped
        any service with more than four rows.
      */}
      <div id={panelId} hidden={!expanded}>
        <div className="px-4 pt-1 pb-4 sm:pl-[3.25rem]">
          <dl className="grid grid-cols-1 gap-x-10 gap-y-3 sm:grid-cols-2">
            {vital.details.map((d) => (
              <div
                key={d.label}
                className="flex items-baseline justify-between gap-1.5 sm:justify-start"
              >
                <dt className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {d.label}
                </dt>
                <dd
                  className="font-mono text-[11.5px] font-medium tracking-tight"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {d.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

/**
 * ⚠ THE STATE A SIGNED-IN OPERATOR ACTUALLY SEES TODAY, and it had no design at
 * all until now — the rail simply rendered an empty rounded box.
 *
 * It is a SEAM, not a failure: the probes are a real commitment with a real
 * place to live, and nothing is broken. `03 §16` separates the two, and the
 * hatch is what carries the difference — "a plain surface with a sentence marks
 * one that is simply new. Confusing the two is how a working system comes to
 * look broken."
 */
function TelemetryUnwired() {
  return (
    <div
      className="hatch-slate mt-2 flex flex-col items-start gap-2 rounded-[12px] px-4 py-6"
      style={{ border: '1px dashed var(--border-strong)' }}
    >
      <IconActivity size={20} stroke={1.5} style={{ color: 'var(--text-tertiary)' }} aria-hidden />
      <p className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
        No probes are reporting yet.
      </p>
      <p
        className="t-caption"
        style={{ color: 'var(--text-secondary)', maxWidth: '44ch', textWrap: 'pretty' }}
      >
        Latency, delivery and queue depth arrive from the observability probes at M6. The isolation
        suite is answerable today and is reported live on the health page.
      </p>
      <Link
        href="/platform/health"
        className="t-caption mt-1 font-medium"
        style={{ color: 'var(--text-action)' }}
      >
        Open health &rarr;
      </Link>
    </div>
  );
}

/**
 * The rail's loading shape. Four rows at the real row height, so the column
 * beside the queue does not resize when the real card arrives. 03 §15.
 */
export function PlatformTelemetrySkeleton() {
  return (
    <SkeletonGroup
      label="Loading platform telemetry"
      className="rounded-[16px] p-5"
    >
      <div
        className="rounded-[12px]"
        style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-subtle)' }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 px-4 py-3.5"
            style={{ borderBottom: i === 3 ? undefined : '1px solid var(--border-subtle)' }}
          >
            <span
              aria-hidden
              className="h-4 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-chip motion-reduce:animate-none motion-reduce:opacity-70"
              style={{ width: [132, 118, 126, 108][i], background: 'var(--surface-sunken)' }}
            />
            <span
              aria-hidden
              className="h-4 w-14 animate-[skeleton-pulse_1400ms_ease-in-out_infinite] rounded-chip motion-reduce:animate-none motion-reduce:opacity-70"
              style={{ background: 'var(--surface-sunken)' }}
            />
          </div>
        ))}
      </div>
    </SkeletonGroup>
  );
}
