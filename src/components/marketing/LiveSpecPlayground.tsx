'use client';

import { useState } from 'react';
import { IconTerminal, IconShield, IconCheck } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';

export function LiveSpecPlayground() {
  const [selectedTenant, setSelectedTenant] = useState<'tenant_a' | 'tenant_b'>('tenant_a');
  const [ruleTone, setRuleTone] = useState<string>('technical_warm');
  const [isPublishing, setIsPublishing] = useState(false);

  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; time: string; event: string; status: string }>>([
    { id: '1', time: '21:34:01', event: 'TENANT_A_RLS_VERIFIED', status: 'PASS' },
    { id: '2', time: '21:30:15', event: 'SUPPORT_SESSION_EXPIRED', status: 'REVOKED' },
  ]);

  const handlePublishRule = () => {
    setIsPublishing(true);
    setTimeout(() => {
      setIsPublishing(false);
      const newLog = {
        id: Date.now().toString(),
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        event: `AI_RULE_PUBLISHED (tone: ${ruleTone})`,
        status: 'PROPAGATED_<5S',
      };
      setAuditLogs((prev) => [newLog, ...prev.slice(0, 3)]);
    }, 1200);
  };

  return (
    <section id="playground" className="mt-20 md:mt-32">
      <div className="flex flex-col items-start">
        <div className="flex items-center gap-3">
          <span aria-hidden className="block h-px w-8" style={{ background: 'var(--accent-mark)' }} />
          <p className="t-eyebrow font-medium tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Specification Sandbox
          </p>
        </div>

        <h2 className="display display-md mt-3" style={{ color: 'var(--text-primary)' }}>
          Test the platform seams live
        </h2>

        <p className="t-body mt-2" style={{ color: 'var(--text-secondary)', maxWidth: 'var(--measure-prose)' }}>
          Interact with simulated multi-tenant RLS isolation boundaries, write-only credential rules, and live AI assistant rule propagation.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Module 1: RLS Policy Simulator */}
        <div
          className="rounded-panel border p-6 md:p-8 flex flex-col justify-between shadow-sm"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2.5">
                <IconShield size={18} className="text-emerald-600" />
                <h3 className="t-panel font-medium" style={{ color: 'var(--text-primary)' }}>
                  RLS Isolation Simulator
                </h3>
              </div>
              <span className="t-eyebrow px-2.5 py-0.5 rounded-chip bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
                Postgres RLS
              </span>
            </div>

            <p className="t-compact mt-4" style={{ color: 'var(--text-secondary)' }}>
              Select an active tenant session to verify that Row Level Security restricts query context at the Postgres engine level.
            </p>

            {/* Tenant Selector Buttons */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setSelectedTenant('tenant_a')}
                className={`flex-1 rounded-chip border p-3 text-left transition-all t-compact cursor-pointer ${
                  selectedTenant === 'tenant_a'
                    ? 'bg-amber-500/10 border-amber-500/60'
                    : 'bg-[var(--surface-sunken)] border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]/80'
                }`}
              >
                <div className="font-medium" style={{ color: selectedTenant === 'tenant_a' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  Tenant A (Acme Logistics)
                </div>
                <div className="t-eyebrow mt-0.5" style={{ color: 'var(--text-tertiary)' }}>id: tnt_acme_892</div>
              </button>

              <button
                onClick={() => setSelectedTenant('tenant_b')}
                className={`flex-1 rounded-chip border p-3 text-left transition-all t-compact cursor-pointer ${
                  selectedTenant === 'tenant_b'
                    ? 'bg-amber-500/10 border-amber-500/60'
                    : 'bg-[var(--surface-sunken)] border-[var(--border-subtle)] hover:bg-[var(--surface-sunken)]/80'
                }`}
              >
                <div className="font-medium" style={{ color: selectedTenant === 'tenant_b' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  Tenant B (Zenith Global)
                </div>
                <div className="t-eyebrow mt-0.5" style={{ color: 'var(--text-tertiary)' }}>id: tnt_zenith_104</div>
              </button>
            </div>

            {/* Live Query Inspection Window */}
            <div
              className="mt-4 rounded-chip border p-3.5 font-mono text-[11.5px] leading-relaxed"
              style={{
                background: 'var(--surface-sunken)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <div className="text-[10px] uppercase font-medium tracking-widest text-emerald-600 mb-1">
                Active Tenant Context:
              </div>
              <p className="text-[var(--text-primary)]">
                SET LOCAL app.current_tenant_id = &apos;{selectedTenant === 'tenant_a' ? 'tnt_acme_892' : 'tnt_zenith_104'}&apos;;
              </p>
              <p className="mt-1 text-slate-500">
                SELECT * FROM messages WHERE tenant_id = current_setting(&apos;app.current_tenant_id&apos;);
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700">
                <IconCheck size={14} />
                <span>Zero cross-tenant leakage guaranteed by database engine</span>
              </div>
            </div>
          </div>
        </div>

        {/* Module 2: Real-time Rule Propagation Terminal */}
        <div
          className="rounded-panel border p-6 md:p-8 flex flex-col justify-between shadow-sm"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-strong)',
          }}
        >
          <div>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2.5">
                <IconTerminal size={18} className="text-amber-500" />
                <h3 className="t-panel font-medium" style={{ color: 'var(--text-primary)' }}>
                  Rule Propagation Engine
                </h3>
              </div>
              <span className="t-eyebrow px-2.5 py-0.5 rounded-chip bg-amber-500/15 text-amber-700 border border-amber-500/30">
                &lt; 5s Sync
              </span>
            </div>

            <p className="t-compact mt-4" style={{ color: 'var(--text-secondary)' }}>
              Test assistant system prompt adjustments and watch them propagate to the edge broker in real time.
            </p>

            <div className="mt-4 flex gap-2">
              <select
                value={ruleTone}
                onChange={(e) => setRuleTone(e.target.value)}
                className="flex-1 rounded-chip border px-3 py-2 text-[13px] bg-[var(--surface-sunken)] border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer focus:outline-none focus:border-[var(--text-action)]"
              >
                <option value="technical_warm">Tone: Technical & Empathetic</option>
                <option value="concise_direct">Tone: Concise & Executive</option>
                <option value="formal_support">Tone: Strict Compliance</option>
              </select>

              <Button
                variant="accent"
                size="md"
                onClick={handlePublishRule}
                loading={isPublishing}
              >
                Deploy Rule
              </Button>
            </div>

            {/* Audit stream viewer */}
            <div
              className="mt-4 rounded-chip border p-3.5 space-y-1.5 font-mono text-[11px]"
              style={{
                background: 'var(--surface-sunken)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="text-[10px] uppercase font-medium tracking-widest text-[var(--text-tertiary)] mb-2">
                Live Propagation Stream
              </div>
              {auditLogs.map((log) => (
                <div key={log.id} className="flex justify-between items-center text-[var(--text-secondary)]">
                  <span>[{log.time}] {log.event}</span>
                  <span className="text-emerald-700 font-normal">{log.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
