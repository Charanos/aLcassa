'use client';

import { useState } from 'react';
import {
  IconUsers,
  IconShieldLock,
  IconLock,
  IconServer2,
  IconHistory,
  IconCheck,
  IconCopy,
  IconEyeOff,
  IconTerminal,
  type Icon as TablerIcon,
} from '@tabler/icons-react';

interface FeatureItem {
  id: string;
  icon: TablerIcon;
  title: string;
  summary: string;
  badge: string;
  details: string[];
  codeOrVisualType: 'roles' | 'rls' | 'credentials' | 'rules' | 'audit';
}

const FEATURES: FeatureItem[] = [
  {
    id: 'roles',
    icon: IconUsers,
    title: 'Your team, with roles',
    summary: 'Owners, admins and agents with invitations and a real permission model.',
    badge: 'Multi-Tenant RBAC',
    details: [
      'Owner: Full access, including billing, credentials and team roles.',
      'Admin: Manages settings, team and assistant rules. Cannot manage credentials.',
      'Agent: Handles customer messages. Read-only access to settings.',
    ],
    codeOrVisualType: 'roles',
  },
  {
    id: 'rls',
    icon: IconShieldLock,
    title: 'Your data, genuinely separated',
    summary: 'Enforced by Postgres Row Level Security on every single table, not application code.',
    badge: 'Postgres RLS',
    details: [
      'Tenant isolation happens at database query layer.',
      'Application code cannot bypass or forget tenant scope.',
      'Automated isolation regression suite blocks every deployment.',
    ],
    codeOrVisualType: 'rls',
  },
  {
    id: 'credentials',
    icon: IconLock,
    title: 'Your credentials, write-only',
    summary: 'API keys are shown once at creation and never stored in plain text.',
    badge: 'Argon2 Hashed',
    details: [
      'Key shown exactly once upon creation.',
      'Stored as Argon2 hash, impossible to reverse.',
      'Rotation replaces a key without re-revealing previous values.',
    ],
    codeOrVisualType: 'credentials',
  },
  {
    id: 'rules',
    icon: IconServer2,
    title: 'Assistant rules, machine-readable',
    summary: 'Set how the AI assistant sounds, what it knows, and handover boundaries.',
    badge: '< 5s Propagation',
    details: [
      'Structured JSON spec readable by AI agents and engines.',
      'Updates propagate to live API endpoints within 5 seconds.',
      'Master and tenant rule precedence enforced systematically.',
    ],
    codeOrVisualType: 'rules',
  },
  {
    id: 'audit',
    icon: IconHistory,
    title: 'A record of everything',
    summary: 'Immutable activity log that cannot be edited or deleted by anyone.',
    badge: 'Append-Only',
    details: [
      'Every administrative action appended with timestamp and actor.',
      'Support mode logins leave audit record in tenant log.',
      'Zero delete or update permissions on audit entries.',
    ],
    codeOrVisualType: 'audit',
  },
];

export function InteractiveFeatures() {
  const [activeId, setActiveId] = useState<string>('roles');
  const activeFeature: FeatureItem = FEATURES.find((f) => f.id === activeId) ?? FEATURES[0]!;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.15fr] lg:items-start">
      {/* Left Feature Selector Tabs */}
      <div className="flex flex-col gap-3">
        {FEATURES.map((feature) => {
          const isActive = feature.id === activeId;
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              onClick={() => setActiveId(feature.id)}
              className={`group flex items-start gap-4 rounded-panel border p-4 text-left transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[var(--surface-raised)] border-[var(--copper-rule)]'
                  : 'bg-[var(--surface-page)] border-[var(--rule-soft)] hover:bg-[var(--surface-hover)]'
              }`}
            >
              <div
                className={`flex size-9 shrink-0 items-center justify-center rounded-chip transition-colors ${
                  isActive
                    ? 'bg-[var(--copper-tint)] text-[var(--copper-ink)]'
                    : 'bg-[var(--surface-sunken)] text-[var(--ink-tertiary)] group-hover:text-[var(--ink-primary)]'
                }`}
              >
                <Icon size={18} stroke={1.5} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="t-panel text-[var(--ink-primary)]">{feature.title}</h3>
                  <span
                    className={`t-eyebrow px-2 py-0.5 rounded-chip ${
                      isActive
                        ? 'bg-[var(--copper-tint)] text-[var(--copper-ink)]'
                        : 'bg-[var(--surface-sunken)] text-[var(--ink-tertiary)]'
                    }`}
                  >
                    {feature.badge}
                  </span>
                </div>
                <p className="t-compact mt-1 text-[var(--ink-secondary)]">
                  {feature.summary}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Visual Preview Screen */}
      <div
        className="rounded-panel border p-6 md:p-8"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--rule-base)',
        }}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--rule-soft)' }}>
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-[var(--copper-solid)]" />
            <span className="t-compact text-[var(--ink-primary)]">
              {activeFeature.title} Specification
            </span>
          </div>
          <span className="t-eyebrow text-[var(--ink-tertiary)]">Platform Seam 01</span>
        </div>

        {/* Feature Detail Checklist */}
        <ul className="mt-5 space-y-2.5">
          {activeFeature.details.map((detail, idx) => (
            <li key={idx} className="flex items-start gap-2.5 t-compact text-[var(--ink-secondary)]">
              <IconCheck size={16} className="shrink-0 text-[var(--verdigris-ink)] mt-0.5" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>

        {/* Visual Preview Box by Feature Type */}
        <div
          className="mt-6 rounded-panel border p-4 t-code"
          style={{ background: 'var(--surface-sunken)', borderColor: 'var(--rule-soft)' }}
        >
          {activeFeature.codeOrVisualType === 'roles' && (
            <div className="space-y-3">
              <div className="t-micro text-[var(--ink-tertiary)]">
                Role Matrix Enforcement
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-chip border p-2.5 bg-[var(--surface-raised)] border-[var(--rule-soft)]">
                  <div className="t-compact text-[var(--ink-primary)]">Owner</div>
                  <div className="t-eyebrow mt-1 text-[var(--verdigris-ink)]">Full Control</div>
                </div>
                <div className="rounded-chip border p-2.5 bg-[var(--surface-raised)] border-[var(--rule-soft)]">
                  <div className="t-compact text-[var(--ink-primary)]">Admin</div>
                  <div className="t-eyebrow mt-1 text-[var(--copper-ink)]">No Credentials</div>
                </div>
                <div className="rounded-chip border p-2.5 bg-[var(--surface-raised)] border-[var(--rule-soft)]">
                  <div className="t-compact text-[var(--ink-primary)]">Agent</div>
                  <div className="t-eyebrow mt-1 text-[var(--ink-tertiary)]">Read-Only Config</div>
                </div>
              </div>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'rls' && (
            <div>
              <div className="flex items-center justify-between t-eyebrow text-[var(--ink-tertiary)] mb-2">
                <span>SQL Row Level Security Policy</span>
                <span className="text-[var(--verdigris-ink)]">ACTIVE</span>
              </div>
              <pre className="t-code text-[var(--ink-primary)] whitespace-pre-wrap leading-relaxed overflow-x-auto">
{`CREATE POLICY tenant_isolation_policy ON workspace_data
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id'))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id'));`}
              </pre>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'credentials' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between t-compact">
                <span className="text-[var(--ink-primary)]">Production Assistant Key</span>
                <span className="t-eyebrow text-[var(--ochre-ink)] bg-[var(--ochre-tint)] px-2 py-0.5 rounded-chip">
                  Shown Once
                </span>
              </div>
              <div className="flex items-center justify-between rounded-chip border p-3 bg-[var(--surface-raised)] border-[var(--rule-soft)] t-data text-[var(--ink-primary)]">
                <span>cndt_live_8f3a9291b...</span>
                <div className="flex items-center gap-2">
                  <IconEyeOff size={14} className="text-[var(--ink-tertiary)]" />
                  <IconCopy size={14} className="text-[var(--copper-ink)] cursor-pointer" />
                </div>
              </div>
              <p className="t-caption text-[var(--ink-tertiary)]">
                Argon2 hashed on save. Store in your environment variables immediately.
              </p>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'rules' && (
            <div>
              <div className="flex items-center justify-between t-eyebrow text-[var(--ink-tertiary)] mb-2">
                <span className="flex items-center gap-1">
                  <IconTerminal size={14} /> GET /api/v1/rules
                </span>
                <span className="text-[var(--verdigris-ink)]">&lt; 5s Live Sync</span>
              </div>
              <pre className="t-code text-[var(--ink-primary)] whitespace-pre-wrap leading-relaxed overflow-x-auto">
{`{
  "tone": "technical_warm",
  "escalation_threshold": 0.85,
  "handover_trigger": ["pricing_custom", "billing_dispute"],
  "knowledge_base_version": "v1.4.2"
}`}
              </pre>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'audit' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between t-eyebrow text-[var(--ink-tertiary)]">
                <span>ACTIVITY_LOG_STREAM</span>
                <span className="text-[var(--verdigris-ink)]">IMMUTABLE</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between t-compact rounded-chip border p-2.5 bg-[var(--surface-raised)] border-[var(--rule-soft)]">
                  <div>
                    <span className="text-[var(--ink-primary)]">Support Mode Session</span>
                    <div className="t-caption text-[var(--ink-tertiary)]">Reason: Ticket #4829 investigation</div>
                  </div>
                  <span className="t-eyebrow text-[var(--copper-ink)]">14:22:01</span>
                </div>
                <div className="flex items-center justify-between t-compact rounded-chip border p-2.5 bg-[var(--surface-raised)] border-[var(--rule-soft)]">
                  <div>
                    <span className="text-[var(--ink-primary)]">Assistant Rules Updated</span>
                    <div className="t-caption text-[var(--ink-tertiary)]">Actor: owner@acme.com</div>
                  </div>
                  <span className="t-eyebrow text-[var(--ink-faint)]">12:05:44</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
