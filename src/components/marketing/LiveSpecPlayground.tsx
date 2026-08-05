'use client';

import { useState } from 'react';
import { IconTerminal, IconShield, IconClock } from '@tabler/icons-react';
import { Button } from '@/components/primitives/Button';

export function LiveSpecPlayground() {
  const [selectedTenant, setSelectedTenant] = useState<'tenant_a' | 'tenant_b'>('tenant_a');
  const [ruleTone, setRuleTone] = useState<string>('technical_warm');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  const [auditLogs, setAuditLogs] = useState<Array<{ id: string; time: string; event: string; status: string }>>([
    { id: '1', time: '21:34:01', event: 'TENANT_A_RLS_VERIFIED', status: 'PASS' },
    { id: '2', time: '21:30:15', event: 'SUPPORT_SESSION_EXPIRED', status: 'REVOKED' },
  ]);

  const handlePublishRule = () => {
    setIsPublishing(true);
    setPublishSuccess(false);
    setTimeout(() => {
      setIsPublishing(false);
      setPublishSuccess(true);
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
          <span aria-hidden className="block h-px w-7" style={{ background: 'var(--copper-rule)' }} />
          <p className="t-eyebrow text-[var(--copper-ink)]">Specification Sandbox</p>
        </div>

        <h2 className="t-heading mt-3 text-[var(--ink-primary)]">
          Test the platform seams live
        </h2>

        <p className="t-body mt-2 text-[var(--ink-secondary)]" style={{ maxWidth: 'var(--measure-prose)' }}>
          Interact with simulated multi-tenant RLS isolation boundaries, write-only credential rules, and live AI assistant rule propagation.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Module 1: RLS Policy Simulator */}
        <div
          className="rounded-panel border p-6 md:p-8 flex flex-col justify-between"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--rule-base)',
          }}
        >
          <div>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--rule-soft)' }}>
              <div className="flex items-center gap-2">
                <IconShield size={18} className="text-[var(--verdigris-ink)]" />
                <h3 className="t-panel text-[var(--ink-primary)]">
                  RLS Isolation Simulator
                </h3>
              </div>
              <span className="t-eyebrow text-[var(--verdigris-ink)] bg-[var(--verdigris-tint)] px-2 py-0.5 rounded-chip">
                Postgres RLS
              </span>
            </div>

            <p className="t-compact mt-4 text-[var(--ink-secondary)]">
              Select an active tenant session to verify that Row Level Security restricts query context at the Postgres engine level.
            </p>

            {/* Tenant Selector Buttons */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setSelectedTenant('tenant_a')}
                className={`flex-1 rounded-chip border p-3 text-left transition-all t-compact cursor-pointer ${
                  selectedTenant === 'tenant_a'
                    ? 'bg-[var(--copper-tint)] border-[var(--copper-rule)] text-[var(--copper-ink)]'
                    : 'bg-[var(--surface-sunken)] border-[var(--rule-soft)] text-[var(--ink-secondary)]'
                }`}
              >
                <div>Tenant A</div>
                <div className="t-eyebrow text-[var(--ink-tertiary)]">id: tnt_acme_892</div>
              </button>

              <button
                onClick={() => setSelectedTenant('tenant_b')}
                className={`flex-1 rounded-chip border p-3 text-left transition-all t-compact cursor-pointer ${
                  selectedTenant === 'tenant_b'
                    ? 'bg-[var(--copper-tint)] border-[var(--copper-rule)] text-[var(--copper-ink)]'
                    : 'bg-[var(--surface-sunken)] border-[var(--rule-soft)] text-[var(--ink-secondary)]'
                }`}
              >
                <div>Tenant B</div>
                <div className="t-eyebrow text-[var(--ink-tertiary)]">id: tnt_zenith_104</div>
              </button>
            </div>

            {/* Live SQL Output Box */}
            <div
              className="mt-5 rounded-chip border p-4 t-code"
              style={{ background: 'var(--surface-sunken)', borderColor: 'var(--rule-soft)' }}
            >
              <div className="t-eyebrow text-[var(--ink-tertiary)] mb-2 flex items-center justify-between">
                <span>SQL Query Execution</span>
                <span className="text-[var(--verdigris-ink)]">1 RECORD RETURNED</span>
              </div>
              <pre className="t-code text-[var(--ink-primary)] whitespace-pre-wrap leading-relaxed">
{`SELECT * FROM customer_records 
WHERE tenant_id = '${selectedTenant === 'tenant_a' ? 'tnt_acme_892' : 'tnt_zenith_104'}';`}
              </pre>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between t-caption text-[var(--ink-tertiary)]">
            <span>Enforced on Postgres server</span>
            <span className="text-[var(--verdigris-ink)]">Zero Cross-Tenant Leakage</span>
          </div>
        </div>

        {/* Module 2: AI Rule Propagation Simulator */}
        <div
          className="rounded-panel border p-6 md:p-8 flex flex-col justify-between"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--rule-base)',
          }}
        >
          <div>
            <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--rule-soft)' }}>
              <div className="flex items-center gap-2">
                <IconTerminal size={18} className="text-[var(--copper-solid)]" />
                <h3 className="t-panel text-[var(--ink-primary)]">
                  Machine AI Rule Publisher
                </h3>
              </div>
              <span className="t-eyebrow text-[var(--copper-ink)] bg-[var(--copper-tint)] px-2 py-0.5 rounded-chip">
                API Live
              </span>
            </div>

            <p className="t-compact mt-4 text-[var(--ink-secondary)]">
              Modify the machine-readable assistant tone spec and test the 5-second API propagation guarantee.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <label className="t-compact text-[var(--ink-primary)] shrink-0">Tone Spec:</label>
              <select
                value={ruleTone}
                onChange={(e) => setRuleTone(e.target.value)}
                className="flex-1 rounded-chip border p-2 text-xs bg-[var(--surface-sunken)] border-[var(--rule-base)] text-[var(--ink-primary)] focus:outline-[var(--focus)]"
              >
                <option value="technical_warm">Technical Warm (Conduit Default)</option>
                <option value="concise_direct">Concise Direct</option>
                <option value="strict_formal">Strict Formal</option>
              </select>
            </div>

            <div className="mt-4">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                loading={isPublishing}
                onClick={handlePublishRule}
              >
                {publishSuccess ? 'Rule Published (< 5s Sync)' : 'Publish AI Rule Update'}
              </Button>
            </div>

            {/* Audit Log Output Stream */}
            <div
              className="mt-5 rounded-chip border p-4 t-code"
              style={{ background: 'var(--surface-sunken)', borderColor: 'var(--rule-soft)' }}
            >
              <div className="t-eyebrow text-[var(--ink-tertiary)] mb-2 flex items-center justify-between">
                <span>IMMUTABLE_AUDIT_LOG_STREAM</span>
                <IconClock size={14} className="text-[var(--ink-faint)]" />
              </div>
              <div className="space-y-1.5 t-code">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex justify-between items-center text-[var(--ink-secondary)]">
                    <span>{log.time} Â· {log.event}</span>
                    <span className="text-[var(--verdigris-ink)]">{log.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between t-caption text-[var(--ink-tertiary)]">
            <span>Machine-readable JSON</span>
            <span className="text-[var(--copper-ink)]">Seam 02 Verified</span>
          </div>
        </div>
      </div>
    </section>
  );
}
