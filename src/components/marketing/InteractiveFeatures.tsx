'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  IconUsers,
  IconShieldLock,
  IconKey,
  IconCpu,
  IconHistory,
  IconCheck,
  IconX,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconBrandWhatsapp,
  type Icon as TablerIcon,
} from '@tabler/icons-react';

interface FeatureItem {
  id: 'rbac' | 'rls' | 'vault' | 'rules' | 'audit';
  icon: TablerIcon;
  tabLabel: string;
  badge: string;
  title: string;
  subtitle: string;
  benefits: {
    title: string;
    description: string;
  }[];
}

const FEATURES: FeatureItem[] = [
  {
    id: 'rbac',
    icon: IconUsers,
    tabLabel: 'Team & Role Governance',
    badge: 'Granular Permissions',
    title: 'Give your team exact access without exposing settings or keys.',
    subtitle:
      'Structure your customer support hierarchy with distinct permission levels tailored for business owners, department managers, and frontline support staff.',
    benefits: [
      {
        title: 'Business Owners',
        description: 'Complete authority over billing, channel connections, security policies, and team management.',
      },
      {
        title: 'Managers & Admins',
        description: 'Configure automated AI responses, invite support team members, and monitor response metrics.',
      },
      {
        title: 'Frontline Support Agents',
        description: 'Streamlined multi-channel inbox workspace to resolve customer chats without access to sensitive credentials.',
      },
    ],
  },
  {
    id: 'rls',
    icon: IconShieldLock,
    tabLabel: 'Dedicated Data Isolation',
    badge: 'Hardware-Level Privacy',
    title: 'Your customer data stays strictly private to your company.',
    subtitle:
      'Every customer interaction, contact detail, and order record is physically segregated in the database, preventing any cross-company visibility.',
    benefits: [
      {
        title: 'Guaranteed Multi-Tenant Boundary',
        description: 'Your workspace is cryptographically separated from other businesses on the platform at the database query layer.',
      },
      {
        title: 'Zero Leakage Guarantee',
        description: 'Neither other tenants nor unauthorized agents can ever view or query your customer conversation history.',
      },
      {
        title: 'Continuous Compliance Testing',
        description: 'Automated isolation test suites verify data segregation on every platform update before deployment.',
      },
    ],
  },
  {
    id: 'vault',
    icon: IconKey,
    tabLabel: 'Secure Credential Vault',
    badge: 'Write-Only Encryption',
    title: 'Connect WhatsApp & Instagram with write-only security.',
    subtitle:
      'Channel credentials, access tokens, and API secrets are displayed once upon creation and stored exclusively as irreversible cryptographic hashes.',
    benefits: [
      {
        title: 'One-Time Secret Generation',
        description: 'High-entropy API tokens are revealed exactly once to the owner and cannot be retrieved in plain text later.',
      },
      {
        title: 'Argon2id Hash Encryption',
        description: 'Protects your company against secret theft using modern memory-hard cryptographic hashing algorithms.',
      },
      {
        title: 'Zero-Downtime Key Rotation',
        description: 'Replace credentials or revoke team access in a single click without interrupting ongoing live customer conversations.',
      },
    ],
  },
  {
    id: 'rules',
    icon: IconCpu,
    tabLabel: 'Custom AI Brand Rules',
    badge: 'Live Voice & Tone Control',
    title: 'Define exactly how your AI assistant speaks and when humans take over.',
    subtitle:
      'Fine-tune your brand voice, regional tone, customer service policies, and automated human escalation triggers in real time.',
    benefits: [
      {
        title: 'Custom Brand Persona',
        description: 'Select between professional corporate, warm advisory, or Kenyan bilingual (English / Swahili / Sheng) conversation styles.',
      },
      {
        title: 'Smart Human Escalation',
        description: 'Automatically routes billing disputes, complex logistics queries, or VIP inquiries directly to human team members.',
      },
      {
        title: 'Instant Rule Synchronization',
        description: 'Policy and tone adjustments take effect across all connected social channels in under 5 seconds.',
      },
    ],
  },
  {
    id: 'audit',
    icon: IconHistory,
    tabLabel: 'Activity & Compliance Log',
    badge: 'Tamper-Proof Audit Trail',
    title: 'A permanent, verifiable record of every important team action.',
    subtitle:
      'Maintain complete visibility with an append-only audit ledger tracking role adjustments, AI policy updates, and platform support sessions.',
    benefits: [
      {
        title: 'Comprehensive Action Tracking',
        description: 'Review full timestamps, user accounts, and details for every security, rule, and team configuration change.',
      },
      {
        title: 'Transparent Platform Support',
        description: 'When aLcassa support assists your team, every session is logged into your private activity history with a unique ticket reference.',
      },
      {
        title: 'Immutable Compliance',
        description: 'Audit entries cannot be modified or deleted by anyone, ensuring complete legal and operational accountability.',
      },
    ],
  },
];

export function InteractiveFeatures() {
  const [activeTab, setActiveTab] = useState<FeatureItem['id']>('rbac');

  // RBAC State
  const [selectedRole, setSelectedRole] = useState<'owner' | 'admin' | 'agent'>('owner');

  // RLS State
  const [selectedTenant, setSelectedTenant] = useState<'kwanza' | 'savanna'>('kwanza');

  // Vault State
  const [revealedKey, setRevealedKey] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Rules State
  const [ruleTone, setRuleTone] = useState<'warm' | 'formal' | 'bilingual'>('warm');

  // Audit State
  const [auditFilter, setAuditFilter] = useState<'all' | 'security' | 'team'>('all');

  const activeFeature = FEATURES.find((f) => f.id === activeTab) ?? FEATURES[0]!;

  return (
    <div className="w-full">
      {/* ── Section Header ── */}
      <div className="flex flex-col items-start max-w-3xl">
        <div className="inline-flex items-center gap-2">
          <span className="size-2 rounded-full bg-[var(--orange-500)]" aria-hidden />
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--orange-500)]">
            Core Platform Architecture
          </p>
        </div>
        <h2 className="display text-[32px] sm:text-[42px] font-normal tracking-tight text-[var(--text-primary)] mt-3 leading-tight">
          Engineered for enterprise security, privacy, and team control.
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] mt-3 leading-relaxed">
          Before routing a single customer message, aLcassa guarantees database-level privacy boundaries,
          encrypted credentials, and customizable AI brand guidelines.
        </p>
      </div>

      {/* ── Clean Tab Switcher (No Dev Numerals) ── */}
      <div className="mt-10 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-sunken)] min-w-max">
          {FEATURES.map((feature) => {
            const isActive = feature.id === activeTab;
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--surface-base)] text-[var(--text-primary)] font-medium shadow-sm border border-[var(--ink-200)]'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-base)]/50'
                }`}
              >
                <Icon
                  size={16}
                  stroke={1.75}
                  className={isActive ? 'text-[var(--orange-500)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'}
                />
                <span>{feature.tabLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Interactive Architectural Stage ── */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-base)] p-6 sm:p-8 shadow-sm">
        
        {/* Left Column: Feature Value & Interactive Switchers (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div>
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--orange-600)] font-medium bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                {activeFeature.badge}
              </span>
              <span className="font-mono text-[11px] text-[var(--text-tertiary)]">
                PRODUCTION READY
              </span>
            </div>

            <h3 className="text-[22px] sm:text-[25px] font-normal tracking-tight text-[var(--text-primary)] mt-3.5 leading-snug">
              {activeFeature.title}
            </h3>

            <p className="text-[13.5px] sm:text-[14px] text-[var(--text-secondary)] mt-2.5 leading-relaxed">
              {activeFeature.subtitle}
            </p>

            {/* Benefits Checklist */}
            <div className="mt-6 space-y-3.5 pt-6 border-t border-[var(--border-subtle)]">
              {activeFeature.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                    <IconCheck size={12} stroke={2.5} className="text-[var(--green-600)]" />
                  </div>
                  <div>
                    <span className="text-[13.5px] font-medium text-[var(--text-primary)] block">
                      {benefit.title}
                    </span>
                    <span className="text-[12.5px] text-[var(--text-secondary)] leading-normal mt-0.5 block">
                      {benefit.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Live Demonstrations & Controls */}
          <div className="pt-6 border-t border-[var(--border-subtle)] bg-[var(--surface-sunken)]/50 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 p-6 sm:p-8 rounded-b-2xl">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
              Interactive Preview Controls
            </p>

            {/* 1. RBAC Switcher */}
            {activeTab === 'rbac' && (
              <div className="grid grid-cols-3 gap-2">
                {(['owner', 'admin', 'agent'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer text-center ${
                      selectedRole === role
                        ? 'bg-[var(--surface-base)] text-[var(--text-primary)] shadow-sm border border-[var(--ink-200)]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-base)]/40'
                    }`}
                  >
                    {role === 'owner' ? 'Business Owner' : role === 'admin' ? 'Manager / Admin' : 'Support Agent'}
                  </button>
                ))}
              </div>
            )}

            {/* 2. RLS Switcher */}
            {activeTab === 'rls' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedTenant('kwanza')}
                  className={`py-2 px-3 rounded-lg text-xs transition-all cursor-pointer text-left ${
                    selectedTenant === 'kwanza'
                      ? 'bg-[var(--surface-base)] text-[var(--text-primary)] font-medium shadow-sm border border-[var(--ink-200)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="block font-medium">Kwanza Logistics</span>
                  <span className="text-[10.5px] text-[var(--text-tertiary)]">Nairobi Workspace</span>
                </button>
                <button
                  onClick={() => setSelectedTenant('savanna')}
                  className={`py-2 px-3 rounded-lg text-xs transition-all cursor-pointer text-left ${
                    selectedTenant === 'savanna'
                      ? 'bg-[var(--surface-base)] text-[var(--text-primary)] font-medium shadow-sm border border-[var(--ink-200)]'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="block font-medium">Studio Savanna</span>
                  <span className="text-[10.5px] text-[var(--text-tertiary)]">Kilimani Workspace</span>
                </button>
              </div>
            )}

            {/* 3. Vault Switcher */}
            {activeTab === 'vault' && (
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => setRevealedKey(!revealedKey)}
                  className="flex items-center gap-2 py-2 px-3.5 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-base)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer"
                >
                  {revealedKey ? <IconEyeOff size={14} /> : <IconEye size={14} />}
                  <span>{revealedKey ? 'Mask API Secret' : 'Reveal Secret Key'}</span>
                </button>
                <button
                  onClick={() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 1500);
                  }}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <IconCopy size={13} />
                  <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Key'}</span>
                </button>
              </div>
            )}

            {/* 4. Rules Switcher */}
            {activeTab === 'rules' && (
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'warm', label: 'Warm Professional', sub: 'Friendly advice' },
                    { id: 'formal', label: 'Corporate Strict', sub: 'Direct enterprise' },
                    { id: 'bilingual', label: 'Bilingual Sheng', sub: 'Swahili / English' },
                  ] as const
                ).map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setRuleTone(tone.id)}
                    className={`py-2 px-2.5 rounded-lg text-left transition-all cursor-pointer ${
                      ruleTone === tone.id
                        ? 'bg-[var(--surface-base)] text-[var(--text-primary)] font-medium shadow-sm border border-[var(--ink-200)]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="block text-xs font-medium">{tone.label}</span>
                    <span className="text-[10px] text-[var(--text-tertiary)] block">{tone.sub}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 5. Audit Switcher */}
            {activeTab === 'audit' && (
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'all', label: 'All Activities' },
                    { id: 'security', label: 'Support Sessions' },
                    { id: 'team', label: 'Rule Changes' },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setAuditFilter(f.id)}
                    className={`py-2 px-2.5 rounded-lg text-xs transition-all cursor-pointer text-center ${
                      auditFilter === f.id
                        ? 'bg-[var(--surface-base)] text-[var(--text-primary)] font-medium shadow-sm border border-[var(--ink-200)]'
                        : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: High-Fidelity Client-Facing Visual Demonstration (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-[var(--ink-200)] bg-[var(--surface-sunken)] overflow-hidden">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-[var(--ink-200)] bg-[var(--surface-base)] px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[var(--green-500)]" />
              <span className="font-mono text-[11px] text-[var(--text-secondary)] uppercase tracking-wider">
                {activeTab === 'rbac' && 'Role Permissions & Access Scope'}
                {activeTab === 'rls' && 'Dedicated Database Boundary · Active'}
                {activeTab === 'vault' && 'Argon2id Salted Cryptographic Vault'}
                {activeTab === 'rules' && 'Live AI Assistant Response Preview'}
                {activeTab === 'audit' && 'Immutable Audit Trail'}
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)] font-mono">
              ZERO CONFIG OVERHEAD
            </span>
          </div>

          {/* Dynamic Content Viewport */}
          <div className="flex-1 p-5 text-[13px] leading-relaxed flex flex-col justify-center">
            
            {/* 1. RBAC VISUALIZER */}
            {activeTab === 'rbac' && (
              <div className="space-y-4">
                {/* Active Role Card */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-10 rounded-full overflow-hidden border border-[var(--border-strong)]">
                        <Image
                          src={
                            selectedRole === 'owner'
                              ? '/avatars/japheth.jpg'
                              : selectedRole === 'admin'
                              ? '/avatars/amina.jpg'
                              : '/avatars/kevin.jpg'
                          }
                          alt="Team member"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-medium text-[var(--text-primary)]">
                          {selectedRole === 'owner' && 'Japheth Njoroge'}
                          {selectedRole === 'admin' && 'Amina Wanjiku'}
                          {selectedRole === 'agent' && 'Kevin Omondi'}
                        </div>
                        <div className="text-[11.5px] text-[var(--text-secondary)]">
                          {selectedRole === 'owner' && 'Operations Director · Kwanza Logistics'}
                          {selectedRole === 'admin' && 'Customer Support Manager'}
                          {selectedRole === 'agent' && 'Support Agent (Nairobi Hub)'}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--orange-600)] font-semibold bg-amber-500/10 px-2.5 py-1 rounded-md">
                      {selectedRole.toUpperCase()}
                    </span>
                  </div>

                  {/* Permissions Checklist Table */}
                  <div className="mt-3.5 space-y-2">
                    {[
                      { label: 'Multi-Channel Inbox & Chat Resolution', allowed: true },
                      { label: 'AI Assistant Rules & Tone Configuration', allowed: selectedRole !== 'agent' },
                      { label: 'Invite & Manage Team Members', allowed: selectedRole !== 'agent' },
                      { label: 'Manage API Credentials & Billing', allowed: selectedRole === 'owner' },
                    ].map((perm, idx) => (
                      <div key={idx} className="flex items-center justify-between py-1 px-2 rounded-lg bg-[var(--surface-sunken)] text-xs">
                        <span className="text-[var(--text-secondary)]">{perm.label}</span>
                        <div className="flex items-center gap-1.5 font-medium">
                          {perm.allowed ? (
                            <span className="text-[var(--green-600)] flex items-center gap-1">
                              <IconCheck size={13} stroke={2.5} /> Enabled
                            </span>
                          ) : (
                            <span className="text-rose-600 flex items-center gap-1">
                              <IconX size={13} stroke={2.5} /> Restricted
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 2. RLS VISUALIZER */}
            {activeTab === 'rls' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                    <span className="font-medium text-[var(--text-primary)]">
                      {selectedTenant === 'kwanza' ? 'Kwanza Logistics Workspace' : 'Studio Savanna Workspace'}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--green-600)] bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      100% ISOLATED
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] mt-2.5">
                    {selectedTenant === 'kwanza'
                      ? 'Live queries only access Kwanza Logistics dispatch inquiries. Zero cross-visibility with Studio Savanna.'
                      : 'Live queries only access Studio Savanna bridal inquiries. Zero cross-visibility with Kwanza Logistics.'}
                  </p>

                  <div className="mt-3 space-y-2">
                    {selectedTenant === 'kwanza' ? (
                      <>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-sunken)] text-xs">
                          <span className="font-medium text-[var(--text-primary)]">Dispatch Inquiries (WhatsApp API)</span>
                          <span className="text-[var(--text-tertiary)] font-mono">14 Active Chats</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-sunken)] text-xs">
                          <span className="font-medium text-[var(--text-primary)]">Mombasa Fleet Notifications</span>
                          <span className="text-[var(--text-tertiary)] font-mono">6 Resolved</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-sunken)] text-xs">
                          <span className="font-medium text-[var(--text-primary)]">Bridal Styling Requests (Instagram)</span>
                          <span className="text-[var(--text-tertiary)] font-mono">8 Active Chats</span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-sunken)] text-xs">
                          <span className="font-medium text-[var(--text-primary)]">VIP Lookbook Consultations</span>
                          <span className="text-[var(--text-tertiary)] font-mono">3 Scheduled</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. VAULT VISUALIZER */}
            {activeTab === 'vault' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[var(--text-primary)]">
                      Production Webhook &amp; Channel Key
                    </span>
                    <span className="text-[10.5px] font-mono text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded">
                      ONE-TIME REVEAL
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--surface-sunken)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)] font-semibold tracking-wider">
                    {revealedKey ? 'alc_live_9f83a27e4c19d4b0086a' : 'alc_live_••••••••••••••••••••••••'}
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--surface-sunken)] space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                      <span>Stored Argon2id Hash (Uncrackable)</span>
                      <span className="text-[var(--green-600)] font-medium">PROTECTED</span>
                    </div>
                    <p className="font-mono text-[11px] text-[var(--green-600)] break-all">
                      $argon2id$v=19$m=65536,t=3,p=4$dGVzdF9zYWx0...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. RULES VISUALIZER */}
            {activeTab === 'rules' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5 mb-3">
                    <div className="flex items-center gap-2">
                      <IconBrandWhatsapp size={16} className="text-[var(--green-600)]" />
                      <span className="text-xs font-medium text-[var(--text-primary)]">
                        Live AI Simulated Reply
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--green-600)] bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      SYNCED IN &lt; 5s
                    </span>
                  </div>

                  {/* Customer Prompt */}
                  <div className="bg-[var(--surface-sunken)] p-2.5 rounded-lg text-xs mb-2.5">
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)] block">Customer Inquiry:</span>
                    <span className="text-[var(--text-primary)]">
                      &quot;Habari, can you confirm when my order from Mombasa will arrive in Nairobi?&quot;
                    </span>
                  </div>

                  {/* AI Response based on selected tone */}
                  <div className="border border-[var(--border-subtle)] bg-[var(--surface-base)] p-3 rounded-lg text-xs leading-relaxed">
                    <span className="text-[10px] font-mono text-[var(--orange-600)] font-semibold block mb-1">
                      AI Assistant ({ruleTone === 'warm' ? 'Warm Professional' : ruleTone === 'formal' ? 'Corporate Strict' : 'Bilingual Sheng'}):
                    </span>
                    {ruleTone === 'warm' && (
                      <p className="text-[var(--text-primary)]">
                        &quot;Hello! Thank you for checking in with Kwanza Logistics. Your Mombasa dispatch (#KW-902) is currently on the highway and scheduled for arrival at the Westlands hub by 4:30 PM today. Let me know if you&apos;d like live SMS tracking!&quot;
                      </p>
                    )}
                    {ruleTone === 'formal' && (
                      <p className="text-[var(--text-primary)]">
                        &quot;Consignment #KW-902 is in transit between Mombasa and Nairobi. Estimated delivery: Today at 16:30 EAT. A designated agent will contact you upon warehouse receipt.&quot;
                      </p>
                    )}
                    {ruleTone === 'bilingual' && (
                      <p className="text-[var(--text-primary)]">
                        &quot;Habari! Mzigo wako wa Mombasa (#KW-902) uko njiani fiti kabisa, unatarajiwa kufika Nairobi Westlands hub saa 10:30 jioni ya leo. Tukutumie alert kwa SMS ikishafika?&quot;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 5. AUDIT VISUALIZER */}
            {activeTab === 'audit' && (
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">
                      Support Session Opened (Ticket #8291)
                    </span>
                    <span className="text-[10.5px] font-mono text-[var(--text-tertiary)]">2 mins ago</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Platform Support mode authorized by Japheth Njoroge for channel diagnostics.
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-[var(--green-600)] flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-[var(--green-500)]" /> Cryptographic Integrity Verified
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-base)] shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[var(--text-primary)]">
                      WhatsApp Escalation Rule Updated
                    </span>
                    <span className="text-[10.5px] font-mono text-[var(--text-tertiary)]">1 hour ago</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Amina Wanjiku updated automatic VIP escalation keyword triggers.
                  </p>
                  <div className="mt-2 text-[10px] font-mono text-[var(--green-600)] flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-[var(--green-500)]" /> Cryptographic Integrity Verified
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Footer Bar */}
          <div className="border-t border-[var(--ink-200)] bg-[var(--surface-base)] px-4 py-2.5 flex items-center justify-between text-[11px] text-[var(--text-tertiary)] font-mono">
            <span>ENTERPRISE GUARANTEE</span>
            <span className="text-[var(--text-primary)] font-medium">ALCASSA SECURE CORE</span>
          </div>
        </div>

      </div>
    </div>
  );
}
