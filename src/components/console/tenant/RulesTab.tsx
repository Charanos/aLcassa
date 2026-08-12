'use client';

import React from 'react';
import {
  IconLock,
  IconPencil,
  IconRefresh,
  IconShieldCheck,
  IconPlus,
} from '@tabler/icons-react';
import type { WorkspaceRule } from '@/lib/console/data';
import { Panel } from '@/components/console/Surface';

export function RulesTab({ rules }: { rules: WorkspaceRule[] }) {
  const masterRules = rules.filter((r) => r.state === 'inherited');
  const customRules = rules.filter((r) => r.state !== 'inherited');

  return (
    <div className="flex flex-col gap-6">
      {/* ── Inverted AI Governance Ribbon ─────────────────────────────────── */}
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
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Master Baseline</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              v24
            </span>
            <span className="text-xs font-mono font-medium" style={{ color: 'var(--success-fg)' }}>
              100% synced
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            Propagated across 47 workspaces
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Stat 2 */}
        <div className="flex-1 p-5 sm:p-6 sm:px-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Active Overrides</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              {customRules.length}
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              custom directives
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            Escalation threshold & routing
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Stat 3 */}
        <div className="flex-1 p-5 sm:p-6 sm:px-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Safety & Redaction</div>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex size-2 rounded-full" style={{ background: 'var(--success-fg)' }} />
            <span className="font-mono text-base font-medium" style={{ color: 'var(--invert-card-fg)' }}>
              Strict PII Scrubbing
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            Financial & PAN tokens redacted
          </p>
          <div className="hidden sm:block absolute right-0 top-6 bottom-6 w-px" style={{ background: 'linear-gradient(to bottom, transparent, var(--invert-card-rule), transparent)' }} />
          <div className="sm:hidden absolute bottom-0 left-6 right-6 h-px" style={{ background: 'linear-gradient(to right, transparent, var(--invert-card-rule), transparent)' }} />
        </div>

        {/* Stat 4 */}
        <div className="flex-1 p-5 sm:p-6 sm:pl-8 relative">
          <div className="t-eyebrow" style={{ color: 'var(--invert-card-subtle)' }}>Inference Latency</div>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="font-mono text-2xl sm:text-3xl font-medium tracking-tight" style={{ color: 'var(--invert-card-fg)' }}>
              1.9s
            </span>
            <span className="text-xs font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
              mean
            </span>
          </div>
          <p className="mt-1 text-[11px] font-mono" style={{ color: 'var(--invert-card-subtle)' }}>
            Gemini 1.5 Flash fine-tuned
          </p>
        </div>
      </div>

      {/* ── Side-by-Side Matrix: Master Baseline vs Overrides ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Master Baseline */}
        <Panel
          title="Master Baseline Directives"
          action={
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-medium"
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
                className="p-4 rounded-xl flex flex-col gap-2"
                style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {r.name}
                    </span>
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded"
                      style={{ background: 'var(--surface-raised)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}
                    >
                      {r.category}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {r.masterValue}
                  </span>
                </div>

                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  {r.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs font-mono" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-tertiary)' }}>
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
              className="h-7.5 inline-flex items-center gap-1 px-2.5 rounded-lg text-xs font-medium text-white transition-all active:scale-95"
              style={{ background: 'var(--blue-500)' }}
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
                className="p-4 rounded-xl flex flex-col gap-3 relative overflow-hidden"
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
                      className="text-[10px] font-mono px-2 py-0.5 rounded font-medium"
                      style={{ background: 'var(--blue-50)', color: 'var(--blue-600)', border: '1px solid var(--blue-200)' }}
                    >
                      {r.state}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-[var(--surface-inset)] transition-colors text-xs font-medium inline-flex items-center gap-1"
                      style={{ color: 'var(--text-secondary)' }}
                      title="Edit rule override"
                    >
                      <IconPencil size={12} stroke={1.5} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="p-1 rounded hover:bg-[var(--surface-inset)] transition-colors text-xs font-medium inline-flex items-center gap-1"
                      style={{ color: 'var(--danger-fg)' }}
                      title="Reset to master value"
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
                  className="p-3 rounded-lg flex items-center justify-between text-xs font-mono"
                  style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--text-tertiary)' }}>Master:</span>
                    <span className="line-through opacity-60" style={{ color: 'var(--text-secondary)' }}>
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

          <p className="mt-4 text-xs font-mono leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            Tenant overrides take precedence over the master rule tree for all incoming conversation routing.
          </p>
        </Panel>
      </div>
    </div>
  );
}
