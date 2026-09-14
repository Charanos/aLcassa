'use client';

import React from 'react';
import { IconLock, IconPencil, IconRefresh, IconShieldCheck, IconPlus } from '@tabler/icons-react';
import type { WorkspaceRule } from '@/lib/console/data';
import { Panel } from '@/components/console/Surface';

/**
 * ⚠ THE COUNT ARRIVES AS A PROP, AND THAT IS NOT A STYLE PREFERENCE.
 *
 * This is a client component. `lib/console/data` opens with `import
 * 'server-only'`, so importing the shared count directly compiles clean under
 * `tsc` and fails the BUILD — the type checker has no idea which side of the
 * boundary a module lands on. The server page that renders this tab reads the
 * count and passes it down, which is the same direction every other fact on
 * this screen already travels.
 */
export function RulesTab({
  rules,
  workspaceCount,
}: {
  rules: WorkspaceRule[];
  workspaceCount: number;
}) {
  const masterRules = rules.filter((r) => r.state === 'inherited');
  const customRules = rules.filter((r) => r.state !== 'inherited');

  return (
    <div className="flex flex-col gap-6">
      {/* ── Inverted AI Governance Ribbon ─────────────────────────────────── */}
      <div
        className="flex flex-col overflow-hidden rounded-2xl sm:flex-row"
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
            Master Baseline
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              v24
            </span>
            <span className="font-mono text-xs font-medium" style={{ color: 'var(--success-fg)' }}>
              100% synced
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--invert-card-subtle)' }}>
            Propagated across {workspaceCount} workspaces
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
            Active Overrides
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              {customRules.length}
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              custom directives
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--invert-card-subtle)' }}>
            Escalation threshold & routing
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
            Safety & Redaction
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
              Strict PII Scrubbing
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--invert-card-subtle)' }}>
            Financial & PAN tokens redacted
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
            Inference Latency
          </div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span
              className="font-mono text-2xl font-medium tracking-tight sm:text-3xl"
              style={{ color: 'var(--invert-card-fg)' }}
            >
              1.9s
            </span>
            <span className="font-mono text-xs" style={{ color: 'var(--invert-card-subtle)' }}>
              mean
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px]" style={{ color: 'var(--invert-card-subtle)' }}>
            Gemini 1.5 Flash fine-tuned
          </p>
        </div>
      </div>

      {/* ── Side-by-Side Matrix: Master Baseline vs Overrides ─────────────── */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Master Baseline */}
        <Panel
          title="Master Baseline Directives"
          action={
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase"
              style={{ background: 'var(--surface-inset)', color: 'var(--text-secondary)' }}
            >
              <IconLock size={11} stroke={1.5} />
              Inherited Baseline
            </span>
          }
        >
          <div className="flex flex-col gap-3.5">
            {masterRules.map((r) => (
              <div
                key={r.id}
                className="flex flex-col gap-2 rounded-xl p-4"
                style={{
                  background: 'var(--surface-sunken)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {r.name}
                    </span>
                    <span
                      className="rounded px-2 py-0.5 font-mono text-[10px]"
                      style={{
                        background: 'var(--surface-raised)',
                        color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {r.category}
                    </span>
                  </div>
                  <span
                    className="font-mono text-xs font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {r.masterValue}
                  </span>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  {r.description}
                </p>
              </div>
            ))}
          </div>

          <div
            className="mt-4 flex items-center gap-2 border-t pt-4 font-mono text-xs"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}
          >
            <IconShieldCheck size={14} stroke={1.5} style={{ color: 'var(--success-fg)' }} />
            <span>Master rules propagate atomically within 3.2s of deployment.</span>
          </div>
        </Panel>

        {/* Tenant Overrides */}
        <Panel
          title="Tenant-Specific Overrides"
          action={
            <button
              type="button"
              disabled
              title="A workspace’s own AI rules are edited in their console. The platform sets the floor, at /platform/ai-rules."
              className="inline-flex h-7.5 items-center gap-1 rounded-lg px-2.5 text-xs font-medium text-white transition-all active:scale-95"
              style={{ opacity: 0.45, cursor: 'not-allowed', background: 'var(--blue-500)' }}
            >
              <IconPlus size={13} stroke={1.5} />
              Add Override
            </button>
          }
        >
          <div className="flex flex-col gap-3.5">
            {customRules.map((r) => (
              <div
                key={r.id}
                className="relative flex flex-col gap-3 overflow-hidden rounded-xl p-4"
                style={{
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {r.name}
                    </span>
                    <span
                      className="rounded px-2 py-0.5 font-mono text-[10px] font-medium"
                      style={{
                        background: 'var(--blue-50)',
                        color: 'var(--blue-600)',
                        border: '1px solid var(--blue-200)',
                      }}
                    >
                      {r.state}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled
                      title="A workspace’s own AI rules are edited in their console. The platform sets the floor, at /platform/ai-rules."
                      className="inline-flex items-center gap-1 rounded p-1 text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
                      style={{ opacity: 0.45, cursor: 'not-allowed', color: 'var(--text-secondary)' }}
                    >
                      <IconPencil size={12} stroke={1.5} />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled
                      title="Resetting a workspace override is a change inside their workspace, which needs a support session."
                      className="inline-flex items-center gap-1 rounded p-1 text-xs font-medium transition-colors hover:bg-[var(--surface-inset)]"
                      style={{ opacity: 0.45, cursor: 'not-allowed', color: 'var(--danger-fg)' }}
                    >
                      <IconRefresh size={12} stroke={1.5} />
                      Reset
                    </button>
                  </div>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {r.description}
                </p>

                {/* Diff Box */}
                <div
                  className="flex items-center justify-between rounded-lg p-3 font-mono text-xs"
                  style={{
                    background: 'var(--surface-sunken)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-tertiary)' }}>Master:</span>
                    <span
                      className="line-through opacity-60"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {r.masterValue}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--blue-500)' }}>Override:</span>
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {r.tenantValue}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p
            className="mt-4 font-mono text-xs leading-relaxed"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Tenant overrides take precedence over the master rule tree for all incoming conversation
            routing.
          </p>
        </Panel>
      </div>
    </div>
  );
}
