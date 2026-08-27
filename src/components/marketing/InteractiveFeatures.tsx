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
  details: string[];
  codeOrVisualType: 'roles' | 'rls' | 'credentials' | 'rules' | 'audit';
  iconColorClass: string;
  iconBgClass: string;
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
    iconColorClass: 'text-warning',
    iconBgClass: 'bg-amber-50 border-warning/60',
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
    iconColorClass: 'text-success',
    iconBgClass: 'bg-emerald-50 border-success/60',
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
    iconColorClass: 'text-danger',
    iconBgClass: 'bg-rose-50 border-danger/60',
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
    iconColorClass: 'text-[var(--blue-600)]',
    iconBgClass: 'bg-blue-50 border-[var(--blue-200)]/60',
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
    iconColorClass: 'text-violet-600',
    iconBgClass: 'bg-violet-50 border-violet-200/60',
  },
];

export function InteractiveFeatures() {
  const [activeId, setActiveId] = useState<string>('roles');
  const activeFeature: FeatureItem = FEATURES.find((f) => f.id === activeId) ?? FEATURES[0]!;

  return (
    <div
      className="mt-10 grid gap-8 border-t pt-8 lg:grid-cols-[1fr_1.25fr] lg:items-start"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {/* Left Feature Selector List */}
      <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {FEATURES.map((feature) => {
          const isActive = feature.id === activeId;
          const Icon = feature.icon;
          return (
            <button
              key={feature.id}
              onClick={() => setActiveId(feature.id)}
              className={`group relative flex w-full cursor-pointer items-start gap-4 rounded-panel px-3.5 py-4 text-left transition-all duration-200 ${
                isActive
                  ? 'border-l-4 bg-[var(--surface-raised)] shadow-sm'
                  : 'border-l-4 border-l-transparent hover:bg-[var(--surface-sunken)]/60'
              }`}
              style={{
                borderLeftColor: isActive ? 'var(--accent-mark)' : 'transparent',
              }}
            >
              {/* Icon Container */}
              <div
                className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-chip border transition-colors ${
                  isActive
                    ? feature.iconBgClass
                    : 'border-[var(--border-subtle)] bg-[var(--surface-sunken)]'
                }`}
              >
                <Icon
                  size={16}
                  stroke={1.75}
                  className={
                    isActive
                      ? feature.iconColorClass
                      : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3
                    className="t-panel font-medium"
                    style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                  >
                    {feature.title}
                  </h3>

                  <span
                    className={`t-eyebrow rounded-chip border px-2.5 py-0.5 whitespace-nowrap transition-all ${
                      isActive
                        ? 'border-[var(--border-strong)] bg-[var(--surface-inset)] text-[var(--text-primary)]'
                        : 'border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-[var(--text-tertiary)]'
                    }`}
                  >
                    {feature.badge}
                  </span>
                </div>
                <p
                  className="t-compact mt-1 leading-normal"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {feature.summary}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Right Specification Viewport Enclosure */}
      <div className="relative overflow-hidden rounded-panel border border-[var(--border-strong)] bg-[var(--surface-raised)] p-6 shadow-sm md:p-8">
        {/* Title Block Header */}
        <div
          className="flex items-center justify-between border-b pb-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2.5">
            <span
              className="size-2 animate-pulse rounded-full"
              style={{ background: 'var(--success-fg)' }}
            />
            <span className="t-compact font-medium" style={{ color: 'var(--text-primary)' }}>
              {activeFeature.title} Specification
            </span>
          </div>
          <span
            className="t-eyebrow font-mono text-[11px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            SEAM #{activeFeature.id.toUpperCase()}
          </span>
        </div>

        {/* Feature Detail Checklist */}
        <ul className="mt-6 space-y-3">
          {activeFeature.details.map((detail, idx) => (
            <li
              key={idx}
              className="t-compact flex items-start gap-3"
              style={{ color: 'var(--text-secondary)' }}
            >
              <IconCheck size={16} className="mt-0.5 shrink-0 text-success" />
              <span>{detail}</span>
            </li>
          ))}
        </ul>

        {/* Technical Terminal & Code Spec Viewport */}
        <div
          className="relative mt-6 border-t pt-6"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {activeFeature.codeOrVisualType === 'roles' && (
            <div className="animate-hero-reveal space-y-3">
              <div
                className="t-eyebrow flex items-center justify-between"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <span>MULTI-TENANT PERMISSION TOPOLOGY</span>
                <span className="font-normal text-success">RBAC ENFORCED</span>
              </div>

              {/* Compact Visual Role Topology SVG Diagram */}
              <div className="mx-auto max-w-md rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
                <svg viewBox="0 0 360 110" fill="none" className="h-auto max-h-[140px] w-full">
                  {/* Root Node */}
                  <rect
                    x="130"
                    y="6"
                    width="100"
                    height="26"
                    rx="4"
                    fill="var(--surface-raised)"
                    stroke="var(--border-strong)"
                    strokeWidth="1"
                  />
                  <text
                    x="180"
                    y="23"
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    className="t-micro font-medium"
                    fontSize="9"
                  >
                    WORKSPACE
                  </text>

                  {/* Connectors */}
                  <path
                    d="M 180 32 L 60 60"
                    stroke="var(--border-subtle)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <path
                    d="M 180 32 L 180 60"
                    stroke="var(--border-subtle)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <path
                    d="M 180 32 L 300 60"
                    stroke="var(--border-subtle)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />

                  {/* Leaf Nodes */}
                  <g transform="translate(15, 60)">
                    <rect
                      width="90"
                      height="36"
                      rx="4"
                      fill="var(--surface-raised)"
                      stroke="var(--accent-mark)"
                      strokeWidth="1.25"
                    />
                    <text
                      x="45"
                      y="16"
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      className="t-eyebrow font-medium"
                      fontSize="9"
                    >
                      OWNER
                    </text>
                    <text
                      x="45"
                      y="28"
                      textAnchor="middle"
                      fill="var(--text-tertiary)"
                      className="t-micro"
                      fontSize="7"
                    >
                      FULL ACCESS
                    </text>
                  </g>

                  <g transform="translate(135, 60)">
                    <rect
                      width="90"
                      height="36"
                      rx="4"
                      fill="var(--surface-raised)"
                      stroke="var(--border-strong)"
                      strokeWidth="1"
                    />
                    <text
                      x="45"
                      y="16"
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      className="t-eyebrow font-normal"
                      fontSize="9"
                    >
                      ADMIN
                    </text>
                    <text
                      x="45"
                      y="28"
                      textAnchor="middle"
                      fill="var(--text-tertiary)"
                      className="t-micro"
                      fontSize="7"
                    >
                      CONFIG MODE
                    </text>
                  </g>

                  <g transform="translate(255, 60)">
                    <rect
                      width="90"
                      height="36"
                      rx="4"
                      fill="var(--surface-raised)"
                      stroke="var(--border-subtle)"
                      strokeWidth="1"
                    />
                    <text
                      x="45"
                      y="16"
                      textAnchor="middle"
                      fill="var(--text-primary)"
                      className="t-eyebrow"
                      fontSize="9"
                    >
                      AGENT
                    </text>
                    <text
                      x="45"
                      y="28"
                      textAnchor="middle"
                      fill="var(--text-tertiary)"
                      className="t-micro"
                      fontSize="7"
                    >
                      MESSAGING
                    </text>
                  </g>
                </svg>
              </div>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'rls' && (
            <div className="animate-hero-reveal space-y-3">
              <div
                className="t-eyebrow flex items-center justify-between"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <span>DATABASE TENANT ISOLATION BARRIER</span>
                <span className="font-normal text-success">ZERO LEAKAGE</span>
              </div>

              {/* Compact RLS Isolation Wall Diagram */}
              <div className="mx-auto max-w-md rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
                <svg viewBox="0 0 360 90" fill="none" className="h-auto max-h-[120px] w-full">
                  {/* Tenant A Zone */}
                  <rect
                    x="10"
                    y="8"
                    width="150"
                    height="74"
                    rx="4"
                    fill="var(--surface-raised)"
                    stroke="var(--success-fg)"
                    strokeWidth="1"
                  />
                  <text
                    x="85"
                    y="26"
                    textAnchor="middle"
                    fill="var(--success-fg)"
                    className="t-eyebrow font-normal"
                    fontSize="9"
                  >
                    TENANT A ISOLATION
                  </text>
                  <path
                    d="M 25 45 L 145 45"
                    stroke="var(--success-fg)"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <text
                    x="85"
                    y="62"
                    textAnchor="middle"
                    fill="var(--text-secondary)"
                    className="t-micro"
                    fontSize="8"
                  >
                    AUTHORIZED
                  </text>

                  {/* Hard Isolation Wall */}
                  <line
                    x1="180"
                    y1="8"
                    x2="180"
                    y2="82"
                    stroke="var(--accent-mark)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                  />
                  <text
                    x="180"
                    y="48"
                    textAnchor="middle"
                    fill="var(--accent-mark-text)"
                    className="t-micro font-mono font-medium"
                    fontSize="7"
                    transform="rotate(-90 180 48)"
                  >
                    RLS BARRIER
                  </text>

                  {/* Tenant B Blocked Zone */}
                  <rect
                    x="200"
                    y="8"
                    width="150"
                    height="74"
                    rx="4"
                    fill="var(--surface-raised)"
                    stroke="var(--danger-fg)"
                    strokeWidth="1"
                    opacity="0.8"
                  />
                  <text
                    x="275"
                    y="26"
                    textAnchor="middle"
                    fill="var(--danger-fg)"
                    className="t-eyebrow font-normal"
                    fontSize="9"
                  >
                    TENANT B DATA
                  </text>
                  <path d="M 215 45 L 335 45" stroke="var(--danger-fg)" strokeWidth="1.5" />
                  <text
                    x="275"
                    y="62"
                    textAnchor="middle"
                    fill="var(--danger-fg)"
                    className="t-micro font-normal"
                    fontSize="8"
                  >
                    BLOCKED
                  </text>
                </svg>
              </div>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'credentials' && (
            <div className="animate-hero-reveal space-y-3">
              <div
                className="t-eyebrow flex items-center justify-between"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <span>ONE-WAY ARGON2 CRYPTOGRAPHIC ENGINE</span>
                <span className="font-normal text-warning">NON-RETRIEVABLE</span>
              </div>

              {/* Compact One-Way Hash Flow Graphic */}
              <div className="mx-auto max-w-md rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-3">
                <div className="t-code flex flex-col items-center justify-between gap-2 sm:flex-row">
                  <div className="flex-1 rounded-chip border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2 text-center">
                    <span className="t-micro mb-0.5 block text-[var(--text-tertiary)]">
                      PLAIN API KEY
                    </span>
                    <span className="t-data-sm text-[var(--text-action)]">alc_live_8f3a...</span>
                  </div>

                  <div
                    className="t-caption shrink-0 px-1 font-mono font-normal"
                    style={{ color: 'var(--accent-mark-text)' }}
                  >
                    &rarr; ARGON2 &rarr;
                  </div>

                  <div className="flex-1 rounded-chip border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-2 text-center">
                    <span className="t-micro mb-0.5 block text-[var(--text-tertiary)]">
                      SAVED HASH
                    </span>
                    <span className="t-data-sm text-success">$argon2id$v=19...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'rules' && (
            <div className="animate-hero-reveal">
              <div className="t-eyebrow mb-3 flex items-center justify-between text-[var(--text-tertiary)]">
                <span className="flex items-center gap-1.5">
                  <IconTerminal size={14} className="text-warning" /> GET /api/v1/rules
                </span>
                <span className="font-normal text-success">&lt; 5s PROPAGATION</span>
              </div>
              <pre
                className="t-code overflow-x-auto rounded-panel border border-l-4 border-[var(--border-subtle)] bg-[var(--surface-sunken)] p-4 leading-relaxed whitespace-pre-wrap text-[var(--text-primary)]"
                style={{ borderLeftColor: 'var(--accent-mark)' }}
              >
                {`{
  "`}
                <span className="text-warning">tone</span>
                {`": "`}
                <span className="text-success">technical_warm</span>
                {`",
  "`}
                <span className="text-warning">escalation_threshold</span>
                {`": `}
                <span className="text-danger">0.85</span>
                {`,
  "`}
                <span className="text-warning">handover_trigger</span>
                {`": ["`}
                <span className="text-success">pricing_custom</span>
                {`", "`}
                <span className="text-success">billing_dispute</span>
                {`"],
  "`}
                <span className="text-warning">knowledge_base_version</span>
                {`": "`}
                <span className="text-[var(--text-secondary)]">v1.4.2</span>
                {`"
}`}
              </pre>
            </div>
          )}

          {activeFeature.codeOrVisualType === 'audit' && (
            <div className="animate-hero-reveal space-y-3">
              <div className="t-eyebrow flex items-center justify-between text-[var(--text-tertiary)]">
                <span>ACTIVITY LOG STREAM</span>
                <span className="font-normal text-success">IMMUTABLE APPEND-ONLY</span>
              </div>
              <div
                className="divide-y overflow-hidden rounded-chip border bg-[var(--surface-sunken)]"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="t-compact flex items-center justify-between p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-1.5 rounded-full bg-[var(--accent-mark)]" />
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">
                        Support Mode Session
                      </span>
                      <div className="t-caption text-[var(--text-tertiary)]">
                        Reason: Ticket #4829 investigation
                      </div>
                    </div>
                  </div>
                  <span className="t-data font-mono text-warning">14:22:01</span>
                </div>
                <div className="t-compact flex items-center justify-between p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="size-1.5 rounded-full bg-success-bg" />
                    <div>
                      <span className="font-medium text-[var(--text-primary)]">
                        Assistant Rules Updated
                      </span>
                      <div className="t-caption text-[var(--text-tertiary)]">
                        Actor: owner@acme.com
                      </div>
                    </div>
                  </div>
                  <span className="t-data font-mono text-[var(--text-tertiary)]">12:05:44</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
