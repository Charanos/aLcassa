'use client';

import { useState } from 'react';
import {
  IconUsers,
  IconShieldLock,
  IconLock,
  IconServer2,
  IconHistory,
  IconCheck,
  IconTerminal,
  type Icon as TablerIcon,
} from '@tabler/icons-react';

interface FeatureItem {
  id: string;
  icon: TablerIcon;
  title: string;
  summary: string;
  badge: string;
  tone: 'graphite' | 'verdigris' | 'ochre' | 'copper' | 'slate';
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
    tone: 'graphite',
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
    tone: 'verdigris',
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
    tone: 'ochre',
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
    tone: 'copper',
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
    tone: 'slate',
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
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.25fr] lg:items-start border-t pt-8" style={{ borderColor: 'var(--rule-soft)' }}>
      {/* Left Feature Selector List */}
      <div className="divide-y" style={{ borderColor: 'var(--rule-soft)' }}>
        {FEATURES.map((feature) => {
          const isActive = feature.id === activeId;
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              onClick={() => setActiveId(feature.id)}
              className={`group w-full flex items-start gap-4 py-4 px-3.5 text-left transition-all duration-200 cursor-pointer relative rounded-panel ${isActive
                  ? 'bg-[var(--surface-sunken)] border-l-4 shadow-2xs'
                  : 'hover:bg-[var(--surface-sunken)]/50 border-l-4 border-l-transparent'
                }`}
              style={{
                borderLeftColor: isActive ? `var(--${feature.tone}-solid)` : 'transparent',
              }}
            >
              {/* Icon Container */}
              <div
                className="size-8 shrink-0 rounded-chip flex items-center justify-center border transition-colors mt-0.5"
                style={{
                  background: isActive ? `var(--${feature.tone}-tint)` : 'var(--surface-sunken)',
                  borderColor: isActive ? `var(--${feature.tone}-rule)` : 'var(--rule-soft)',
                }}
              >
                <Icon size={16} stroke={1.5} style={{ color: `var(--${feature.tone}-ink)` }} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`t-panel ${isActive ? 'text-[var(--ink-primary)]' : 'text-[var(--ink-secondary)] group-hover:text-[var(--ink-primary)]'}`}>
                    {feature.title}
                  </h3>

                  {/* High-Contrast Standout Badge Pill */}
                  <span
                    className="t-eyebrow px-2.5 py-0.5 rounded-chip border transition-all whitespace-nowrap"
                    style={{
                      background: `var(--${feature.tone}-tint)`,
                      color: `var(--${feature.tone}-ink)`,
                      borderColor: `var(--${feature.tone}-rule)`,
                    }}
                  >
                    {feature.badge}
                  </span>
                </div>
                <p className="t-compact mt-1 text-[var(--ink-secondary)] leading-normal">
                  {feature.summary}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Specification Viewport Enclosure */}
      <div
        className="rounded-panel border p-6 md:p-8 bg-[var(--surface-raised)] border-[var(--rule-strong)] shadow-sm relative overflow-hidden"
      >
        {/* Title Block Header */}
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--rule-soft)' }}>
          <div className="flex items-center gap-2.5">
            <span
              className="size-2.5 rounded-full animate-pulse"
              style={{ background: `var(--${activeFeature.tone}-solid)` }}
            />
            <span className="t-compact text-[var(--ink-primary)]">
              {activeFeature.title} Specification
            </span>
          </div>
          <span className="t-eyebrow text-[var(--ink-tertiary)] font-mono">SEAM #{activeFeature.id.toUpperCase()}</span>
        </div>

        {/* Feature Detail Checklist */}
        <ul className="mt-6 space-y-3">
          {activeFeature.details.map((detail, idx) => (
            <li key={idx} className="flex items-start gap-3 t-compact text-[var(--ink-secondary)]">
              <IconCheck size={16} className="shrink-0 text-[var(--verdigris-ink)] mt-0.5" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>

        {/* Technical Terminal & Code Spec Viewport */}
        <div
          className="mt-6 border-t pt-6 relative"
          style={{ borderColor: 'var(--rule-soft)' }}
        >
          {activeFeature.codeOrVisualType === 'roles' && (
            <div className="space-y-3 animate-hero-reveal">
              <div className="flex items-center justify-between t-eyebrow text-[var(--ink-tertiary)]">
                <span>MULTI-TENANT PERMISSION TOPOLOGY</span>
                <span className="text-[var(--verdigris-ink)]">RBAC ENFORCED</span>
              </div>

              {/* Compact Visual Role Topology SVG Diagram */}
              <div className="rounded-panel border p-3 bg-[var(--surface-sunken)] border-[var(--rule-soft)] max-w-md mx-auto">
                <svg viewBox="0 0 360 110" fill="none" className="w-full h-auto max-h-[140px]">
                  {/* Root Node */}
                  <rect x="130" y="6" width="100" height="26" rx="4" fill="var(--surface-raised)" stroke="var(--copper-rule)" strokeWidth="1" />
                  <text x="180" y="23" textAnchor="middle" fill="var(--ink-primary)" className="t-micro" fontSize="9">WORKSPACE</text>

                  {/* Branch Lines */}
                  <path d="M 180 32 L 60 60" stroke="var(--verdigris-solid)" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M 180 32 L 180 60" stroke="var(--copper-solid)" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M 180 32 L 300 60" stroke="var(--slate-solid)" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Leaf Nodes */}
                  <g transform="translate(15, 60)">
                    <rect width="90" height="36" rx="4" fill="var(--surface-raised)" stroke="var(--verdigris-rule)" strokeWidth="1" />
                    <text x="45" y="16" textAnchor="middle" fill="var(--verdigris-ink)" className="t-eyebrow" fontSize="9">OWNER</text>
                    <text x="45" y="28" textAnchor="middle" fill="var(--ink-tertiary)" className="t-micro" fontSize="7">FULL ACCESS</text>
                  </g>

                  <g transform="translate(135, 60)">
                    <rect width="90" height="36" rx="4" fill="var(--surface-raised)" stroke="var(--copper-rule)" strokeWidth="1" />
                    <text x="45" y="16" textAnchor="middle" fill="var(--copper-ink)" className="t-eyebrow" fontSize="9">ADMIN</text>
                    <text x="45" y="28" textAnchor="middle" fill="var(--ink-tertiary)" className="t-micro" fontSize="7">CONFIG MODE</text>
                  </g>

                  <g transform="translate(255, 60)">
                    <rect width="90" height="36" rx="4" fill="var(--surface-raised)" stroke="var(--slate-rule)" strokeWidth="1" />
                    <text x="45" y="16" textAnchor="middle" fill="var(--slate-ink)" className="t-eyebrow" fontSize="9">AGENT</text>
                    <text x="45" y="28" textAnchor="middle" fill="var(--ink-tertiary)" className="t-micro" fontSize="7">MESSAGING</text>
                  </g>
                </svg>
              </div>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'rls' && (
            <div className="space-y-3 animate-hero-reveal">
              <div className="flex items-center justify-between t-eyebrow text-[var(--ink-tertiary)]">
                <span>DATABASE TENANT ISOLATION BARRIER</span>
                <span className="text-[var(--verdigris-ink)]">ZERO LEAKAGE</span>
              </div>

              {/* Compact RLS Isolation Wall Diagram */}
              <div className="rounded-panel border p-3 bg-[var(--surface-sunken)] border-[var(--rule-soft)] max-w-md mx-auto">
                <svg viewBox="0 0 360 90" fill="none" className="w-full h-auto max-h-[120px]">
                  {/* Tenant A Zone */}
                  <rect x="10" y="8" width="150" height="74" rx="4" fill="var(--surface-raised)" stroke="var(--verdigris-rule)" strokeWidth="1" />
                  <text x="85" y="26" textAnchor="middle" fill="var(--verdigris-ink)" className="t-eyebrow" fontSize="9">TENANT A ISOLATION</text>
                  <path d="M 25 45 L 145 45" stroke="var(--verdigris-solid)" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x="85" y="62" textAnchor="middle" fill="var(--ink-secondary)" className="t-micro" fontSize="8">AUTHORIZED</text>

                  {/* Hard Isolation Wall */}
                  <line x1="180" y1="8" x2="180" y2="82" stroke="var(--copper-solid)" strokeWidth="2" strokeDasharray="4 2" />
                  <text x="180" y="48" textAnchor="middle" fill="var(--copper-ink)" className="t-micro font-mono" fontSize="7" transform="rotate(-90 180 48)">RLS BARRIER</text>

                  {/* Tenant B Blocked Zone */}
                  <rect x="200" y="8" width="150" height="74" rx="4" fill="var(--surface-raised)" stroke="var(--rule-soft)" strokeWidth="1" />
                  <text x="275" y="26" textAnchor="middle" fill="var(--ink-tertiary)" className="t-eyebrow" fontSize="9">TENANT B DATA</text>
                  <path d="M 215 45 L 335 45" stroke="var(--oxide-solid)" strokeWidth="1.5" />
                  <text x="275" y="62" textAnchor="middle" fill="var(--oxide-ink)" className="t-micro" fontSize="8">BLOCKED</text>
                </svg>
              </div>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'credentials' && (
            <div className="space-y-3 animate-hero-reveal">
              <div className="flex items-center justify-between t-eyebrow text-[var(--ink-tertiary)]">
                <span>ONE-WAY ARGON2 CRYPTOGRAPHIC ENGINE</span>
                <span className="text-[var(--ochre-ink)]">NON-RETRIEVABLE</span>
              </div>

              {/* Compact One-Way Hash Flow Graphic */}
              <div className="rounded-panel border p-3 bg-[var(--surface-sunken)] border-[var(--rule-soft)] max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 t-code">
                  <div className="flex-1 rounded-chip border p-2 bg-[var(--surface-raised)] border-[var(--rule-soft)] text-center">
                    <span className="t-micro text-[var(--ink-tertiary)] block mb-0.5">PLAIN API KEY</span>
                    <span className="t-data-sm text-[var(--copper-ink)]">cndt_live_8f3a...</span>
                  </div>

                  <div className="shrink-0 text-[var(--ochre-ink)] font-mono t-caption px-1">
                    → ARGON2 →
                  </div>

                  <div className="flex-1 rounded-chip border p-2 bg-[var(--surface-raised)] border-[var(--rule-soft)] text-center">
                    <span className="t-micro text-[var(--ink-tertiary)] block mb-0.5">SAVED HASH</span>
                    <span className="t-data-sm text-[var(--verdigris-ink)]">$argon2id$v=19...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'rules' && (
            <div className="animate-hero-reveal">
              <div className="flex items-center justify-between t-eyebrow text-[var(--ink-tertiary)] mb-3">
                <span className="flex items-center gap-1.5">
                  <IconTerminal size={14} className="text-[var(--copper-ink)]" /> GET /api/v1/rules
                </span>
                <span className="text-[var(--verdigris-ink)]">&lt; 5s PROPAGATION</span>
              </div>
              <pre className="t-code text-[var(--ink-primary)] whitespace-pre-wrap leading-relaxed overflow-x-auto p-4 bg-[var(--surface-sunken)] rounded-panel border border-[var(--rule-soft)] border-l-4" style={{ borderLeftColor: 'var(--copper-solid)' }}>
                {`{
  "`}<span className="text-[var(--copper-ink)]">tone</span>{`": "`}<span className="text-[var(--verdigris-ink)]">technical_warm</span>{`",
  "`}<span className="text-[var(--copper-ink)]">escalation_threshold</span>{`": `}<span className="text-[var(--ochre-ink)]">0.85</span>{`,
  "`}<span className="text-[var(--copper-ink)]">handover_trigger</span>{`": ["`}<span className="text-[var(--verdigris-ink)]">pricing_custom</span>{`", "`}<span className="text-[var(--verdigris-ink)]">billing_dispute</span>{`"],
  "`}<span className="text-[var(--copper-ink)]">knowledge_base_version</span>{`": "`}<span className="text-[var(--slate-ink)]">v1.4.2</span>{`"
}`}
              </pre>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'audit' && (
            <div className="space-y-3 animate-hero-reveal">
              <div className="flex items-center justify-between t-eyebrow text-[var(--ink-tertiary)]">
                <span>ACTIVITY LOG STREAM</span>
                <span className="text-[var(--verdigris-ink)]">IMMUTABLE APPEND-ONLY</span>
              </div>
              <div className="divide-y border rounded-chip bg-[var(--surface-sunken)] overflow-hidden" style={{ borderColor: 'var(--rule-soft)' }}>
                <div className="flex items-center justify-between p-3 t-compact">
                  <div className="flex items-center gap-2.5">
                    <span className="size-1.5 rounded-full bg-[var(--copper-solid)]" />
                    <div>
                      <span className="text-[var(--ink-primary)]">Support Mode Session</span>
                      <div className="t-caption text-[var(--ink-tertiary)]">Reason: Ticket #4829 investigation</div>
                    </div>
                  </div>
                  <span className="t-data text-[var(--copper-ink)]">14:22:01</span>
                </div>
                <div className="flex items-center justify-between p-3 t-compact">
                  <div className="flex items-center gap-2.5">
                    <span className="size-1.5 rounded-full bg-[var(--verdigris-solid)]" />
                    <div>
                      <span className="text-[var(--ink-primary)]">Assistant Rules Updated</span>
                      <div className="t-caption text-[var(--ink-tertiary)]">Actor: owner@acme.com</div>
                    </div>
                  </div>
                  <span className="t-data text-[var(--ink-tertiary)]">12:05:44</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

