'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  IconUsers,
  IconShieldLock,
  IconKey,
  IconMessageCircle,
  IconHistory,
  IconCheck,
  IconX,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconBrandWhatsapp,
  IconDatabase,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface FeatureItem {
  id: 'roles' | 'privacy' | 'vault' | 'voice' | 'log';
  icon: TablerIcon;
  tabLabel: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  benefits: {
    title: string;
    description: string;
  }[];
}

const FEATURES: FeatureItem[] = [
  {
    id: 'roles',
    icon: IconUsers,
    tabLabel: 'Who sees what',
    eyebrow: 'Team access',
    title: 'Give your team exactly what they need. Nothing more.',
    subtitle:
      'Set up your support team with the right level of access from day one — owners, managers, and frontline agents each see a different, appropriate slice of the account.',
    benefits: [
      {
        title: 'Business owner',
        description: 'Full control — billing, connected channels, security settings, and the whole team.',
      },
      {
        title: 'Manager',
        description: "Sets up the AI assistant's replies, invites agents, and checks how the team is doing.",
      },
      {
        title: 'Support agent',
        description: 'A clean inbox to answer customers in — no access to billing or account settings.',
      },
    ],
  },
  {
    id: 'privacy',
    icon: IconShieldLock,
    tabLabel: 'Your data, separated',
    eyebrow: 'Data privacy',
    title: "Your customers' conversations never mix with anyone else's.",
    subtitle:
      'Every business on aLcassa has its own separated space. Another company on the platform cannot see your customer messages, contacts, or order details — ever.',
    benefits: [
      {
        title: 'A boundary around every business',
        description: 'Your workspace is kept apart from every other business on the platform, no exceptions.',
      },
      {
        title: 'Nothing to configure',
        description: "This isn't a setting you turn on. It's how the platform is built, for every customer.",
      },
      {
        title: 'Checked before every release',
        description: 'We test that separation holds before any update goes out, not after.',
      },
    ],
  },
  {
    id: 'vault',
    icon: IconKey,
    tabLabel: 'Keys stay hidden',
    eyebrow: 'Credentials',
    title: 'Connect WhatsApp and Instagram without leaving your keys lying around.',
    subtitle:
      "When you connect a channel, we show you the access key once, so you can save it somewhere safe. After that, even we can't see it again.",
    benefits: [
      {
        title: 'Shown once, on purpose',
        description: "Your key appears the moment it's created. If you lose it, you generate a new one — the old one just stops working.",
      },
      {
        title: 'Not stored in a readable form',
        description: 'We keep a one-way scrambled version, not the key itself. There is nothing for anyone to steal and reuse.',
      },
      {
        title: 'Swap a key without going offline',
        description: 'Rotate a credential or cut off a team member’s access in one click, mid-conversation, with no interruption.',
      },
    ],
  },
  {
    id: 'voice',
    icon: IconMessageCircle,
    tabLabel: "Your brand's voice",
    eyebrow: 'AI tone',
    title: 'Decide exactly how your AI assistant sounds.',
    subtitle:
      'Pick a tone that matches your business, and every automated reply follows it — across WhatsApp, Instagram, Messenger, and your website, all at once.',
    benefits: [
      {
        title: 'Three starting tones',
        description: 'Warm and personal, direct and professional, or bilingual in Swahili and English — pick what fits.',
      },
      {
        title: 'Tricky questions go to a person',
        description: 'Billing disputes, complicated logistics, or your best customers get handed to your team automatically.',
      },
      {
        title: 'Changes apply right away',
        description: 'Adjust the tone once and it updates everywhere your business talks to customers, in seconds.',
      },
    ],
  },
  {
    id: 'log',
    icon: IconHistory,
    tabLabel: 'A record of everything',
    eyebrow: 'Activity log',
    title: 'See who did what, and when.',
    subtitle:
      'Every important change to your account — who joined, what got updated, when support looked in — is written down and kept, in order, for good.',
    benefits: [
      {
        title: 'Every change, on the record',
        description: 'Role changes, AI tone updates, and account settings — who made the change and exactly when.',
      },
      {
        title: 'Support visits are logged too',
        description: "If aLcassa's own team ever helps with your account, that visit shows up here with a ticket number.",
      },
      {
        title: 'Nothing can be quietly removed',
        description: 'Entries can’t be edited or deleted by anyone — yours, ours, or anyone else’s.',
      },
    ],
  },
];

const ROLE_LABELS: Record<'owner' | 'admin' | 'agent', string> = {
  owner: 'Business owner',
  admin: 'Manager',
  agent: 'Support agent',
};

const ROLE_PEOPLE: Record<
  'owner' | 'admin' | 'agent',
  { name: string; role: string; avatarUrl: string; initials: string; color: string }
> = {
  owner: {
    name: 'Japheth Njoroge',
    role: 'Kwanza Logistics',
    avatarUrl: '/avatars/japheth.jpg',
    initials: 'JN',
    color: '#16a34a',
  },
  admin: {
    name: 'Amina Wanjiku',
    role: 'Studio Savanna',
    avatarUrl: '/avatars/amina.jpg',
    initials: 'AW',
    color: '#e11d48',
  },
  agent: {
    name: 'Kevin Omondi',
    role: 'Support agent, Nairobi',
    avatarUrl: '/avatars/kevin.jpg',
    initials: 'KO',
    color: '#2563eb',
  },
};

const TONE_LABELS: Record<'warm' | 'formal' | 'bilingual', string> = {
  warm: 'Warm and personal',
  formal: 'Direct and professional',
  bilingual: 'Swahili and English',
};

const TONE_REPLIES: Record<'warm' | 'formal' | 'bilingual', string> = {
  warm:
    'Hello! Thanks for checking in with Kwanza Logistics. Your Mombasa delivery (#KW-902) is on the road and should reach the Westlands hub by 4:30pm today. Want live tracking by SMS?',
  formal:
    'Consignment #KW-902 is in transit from Mombasa to Nairobi. Estimated delivery: today at 16:30 EAT. Our team will confirm on arrival.',
  bilingual:
    'Habari! Mzigo wako wa Mombasa (#KW-902) uko njiani, unatarajiwa kufika Westlands saa kumi na mbili jioni ya leo. Tukutumie SMS ikifika?',
};

export function InteractiveFeatures() {
  const [activeTab, setActiveTab] = useState<FeatureItem['id']>('roles');

  const [selectedRole, setSelectedRole] = useState<'owner' | 'admin' | 'agent'>('owner');
  const [selectedTenant, setSelectedTenant] = useState<'kwanza' | 'savanna'>('kwanza');
  const [revealedKey, setRevealedKey] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [ruleTone, setRuleTone] = useState<'warm' | 'formal' | 'bilingual'>('warm');

  const activeFeature = FEATURES.find((f) => f.id === activeTab) ?? FEATURES[0]!;
  const activePerson = ROLE_PEOPLE[selectedRole];

  return (
    <div className="w-full text-left">
      {/* Section Header */}
      <div className="flex flex-col items-start max-w-3xl">
        <div className="inline-flex items-center gap-2 mb-2">
          <span className="size-2 rounded-full bg-[var(--orange-500)]" aria-hidden="true" />
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--orange-500)]">
            What’s underneath
          </p>
        </div>
        <h2 className="display text-[32px] sm:text-[42px] font-normal tracking-tight text-[var(--text-primary)] mt-1 leading-tight">
          Built to be trusted with your customers, not just used by them.
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] mt-3 leading-relaxed">
          Before a single message gets routed, your team’s access, your customers’ data, and your AI assistant’s voice are all already set up the way you’d want them.
        </p>
      </div>

      {/* Elegant Segmented Pill Tab Switcher */}
      <div className="mt-8 overflow-x-auto pb-2 scrollbar-none">
        <div className="inline-flex items-center gap-1 p-1.5 rounded-full border border-[var(--ink-200)]/80 bg-[var(--surface-sunken)] shadow-xs">
          {FEATURES.map((feature) => {
            const isActive = feature.id === activeTab;
            const Icon = feature.icon;
            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => setActiveTab(feature.id)}
                aria-pressed={isActive}
                className={`group flex items-center gap-2 px-4.5 py-2 rounded-full text-[13px] transition-all cursor-pointer min-h-[40px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--orange-500)] ${
                  isActive
                    ? 'bg-white text-[var(--text-primary)] font-medium shadow-xs border border-[var(--ink-200)]/70'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/50 border border-transparent'
                }`}
              >
                <Icon
                  size={15}
                  stroke={1.8}
                  aria-hidden="true"
                  className={isActive ? 'text-[var(--orange-500)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]'}
                />
                <span>{feature.tabLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Architectural Stage (De-boxed, cohesive 2-column layout) */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-stretch rounded-3xl border border-[var(--ink-200)] bg-[var(--ink-0)] p-6 sm:p-9 shadow-[0_24px_70px_-18px_rgba(0,0,0,0.06)]">
        
        {/* Left Column: Core Value Proposition & Interactive Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            <StatusBadge tone="brand" variant="pill" size="sm" className="mb-2">
              {activeFeature.eyebrow}
            </StatusBadge>

            <h3 className="text-[23px] sm:text-[26px] font-normal tracking-tight text-[var(--text-primary)] mt-3.5 leading-snug">
              {activeFeature.title}
            </h3>

            <p className="text-[14px] text-[var(--text-secondary)] mt-2.5 leading-relaxed">
              {activeFeature.subtitle}
            </p>

            {/* Benefits Checklist */}
            <div className="mt-6 space-y-4 pt-6 border-t border-[var(--ink-100)]">
              {activeFeature.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="size-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/80 flex items-center justify-center shrink-0 mt-0.5">
                    <IconCheck size={12} stroke={2.5} aria-hidden="true" />
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

          {/* Integrated Interactive Controls (Try it) */}
          <div className="pt-6 mt-8 border-t border-[var(--ink-100)]">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
              {activeTab === 'log' ? 'Live Ledger View' : 'Try this setting'}
            </p>

            {activeTab === 'roles' && (
              <div className="grid grid-cols-3 gap-2">
                {(['owner', 'admin', 'agent'] as const).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    aria-pressed={selectedRole === role}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer text-center min-h-[40px] ${
                      selectedRole === role
                        ? 'bg-[var(--surface-base)] text-[var(--text-primary)] shadow-xs border border-[var(--ink-200)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border border-transparent'
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTenant('kwanza')}
                  aria-pressed={selectedTenant === 'kwanza'}
                  className={`py-2 px-3 rounded-xl text-xs transition-all cursor-pointer text-left min-h-[44px] ${
                    selectedTenant === 'kwanza'
                      ? 'bg-[var(--surface-base)] text-[var(--text-primary)] font-medium shadow-xs border border-[var(--ink-200)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border border-transparent'
                  }`}
                >
                  <span className="block font-medium">Kwanza Logistics</span>
                  <span className="font-mono text-[10.5px] text-[var(--text-tertiary)]">Nairobi Workspace</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTenant('savanna')}
                  aria-pressed={selectedTenant === 'savanna'}
                  className={`py-2 px-3 rounded-xl text-xs transition-all cursor-pointer text-left min-h-[44px] ${
                    selectedTenant === 'savanna'
                      ? 'bg-[var(--surface-base)] text-[var(--text-primary)] font-medium shadow-xs border border-[var(--ink-200)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border border-transparent'
                  }`}
                >
                  <span className="block font-medium">Studio Savanna</span>
                  <span className="font-mono text-[10.5px] text-[var(--text-tertiary)]">Kilimani Workspace</span>
                </button>
              </div>
            )}

            {activeTab === 'vault' && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setRevealedKey(!revealedKey)}
                  className="flex items-center gap-2 py-2 px-4 rounded-full border border-[var(--ink-200)] bg-[var(--surface-base)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] transition-colors cursor-pointer min-h-[38px] shadow-xs"
                >
                  {revealedKey ? <IconEyeOff size={14} aria-hidden="true" /> : <IconEye size={14} aria-hidden="true" />}
                  <span>{revealedKey ? 'Hide secret key' : 'Reveal secret key'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 1500);
                  }}
                  className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--surface-sunken)] border border-[var(--ink-200)]/70 px-3.5 py-2 rounded-full cursor-pointer min-h-[38px] transition-colors"
                >
                  <IconCopy size={13} aria-hidden="true" />
                  <span role="status">{isCopied ? 'Copied to clipboard' : 'Copy key'}</span>
                </button>
              </div>
            )}

            {activeTab === 'voice' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['warm', 'formal', 'bilingual'] as const).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setRuleTone(tone)}
                    aria-pressed={ruleTone === tone}
                    className={`py-2 px-2.5 rounded-xl text-left transition-all cursor-pointer min-h-[40px] ${
                      ruleTone === tone
                        ? 'bg-[var(--surface-base)] text-[var(--text-primary)] font-medium shadow-xs border border-[var(--ink-200)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] border border-transparent'
                    }`}
                  >
                    <span className="block text-xs font-medium">{TONE_LABELS[tone]}</span>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'log' && (
              <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
                A live, cryptographically signed ledger of recent actions from this account is maintained in PostgreSQL.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Architectural Live Visual Demonstration */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-[var(--ink-200)]/90 bg-[var(--ink-50)]/30 overflow-hidden shadow-xs">
          
          {/* Top Bar of the Canvas */}
          <div className="flex items-center justify-between border-b border-[var(--ink-100)] bg-white px-5 py-3.5">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              <span className="font-mono text-[11.5px] font-medium text-[var(--text-secondary)]">
                {activeTab === 'roles' && 'Role Access Scope Matrix'}
                {activeTab === 'privacy' && 'Isolated PostgreSQL Tenancy Boundary'}
                {activeTab === 'vault' && 'Ephemeral Secret Key Vault'}
                {activeTab === 'voice' && 'Multi-Channel AI Voice Tuning'}
                {activeTab === 'log' && 'Immutable Audit Ledger'}
              </span>
            </div>
            <span className="font-mono text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-sunken)] px-2 py-0.5 rounded border border-[var(--ink-200)]/60">
              Live Gateway
            </span>
          </div>

          {/* Body Canvas */}
          <div className="flex-1 p-5 sm:p-6 text-[13px] leading-relaxed flex flex-col justify-center">

            {/* 1. Roles Simulation */}
            {activeTab === 'roles' && (
              <div className="space-y-4">
                {/* Active Person Header */}
                <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-[var(--ink-200)]/80 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="relative size-11 rounded-full overflow-hidden ring-1 ring-[var(--ink-200)] shadow-xs">
                      <Image
                        src={activePerson.avatarUrl}
                        alt={activePerson.name}
                        width={44}
                        height={44}
                        className="size-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="text-[14px] font-semibold text-[var(--text-primary)]">
                        {activePerson.name}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
                        {activePerson.role}
                      </div>
                    </div>
                  </div>
                  <StatusBadge tone="brand" variant="pill" size="md">
                    {ROLE_LABELS[selectedRole]}
                  </StatusBadge>
                </div>

                {/* Permissions Grid */}
                <div className="bg-white rounded-2xl p-4 border border-[var(--ink-200)]/80 shadow-xs space-y-2.5">
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--text-tertiary)] block mb-2">
                    Permissions in this slice
                  </span>
                  {[
                    { label: 'Reply to customers across every channel', allowed: true },
                    { label: 'Set up the AI assistant’s tone and rules', allowed: selectedRole !== 'agent' },
                    { label: 'Invite and manage the team', allowed: selectedRole !== 'agent' },
                    { label: 'See billing and channel credentials', allowed: selectedRole === 'owner' },
                  ].map((perm, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 px-3 rounded-xl bg-[var(--surface-sunken)]/70 text-xs"
                    >
                      <span className="text-[var(--text-secondary)] font-normal">{perm.label}</span>
                      {perm.allowed ? (
                        <StatusBadge tone="success" variant="squircle" size="sm" icon={IconCheck}>
                          Can do this
                        </StatusBadge>
                      ) : (
                        <StatusBadge tone="neutral" variant="squircle" size="sm" icon={IconX}>
                          Not visible
                        </StatusBadge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Privacy Simulation */}
            {activeTab === 'privacy' && (
              <div className="bg-white rounded-2xl p-5 border border-[var(--ink-200)]/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--ink-100)]">
                  <div className="flex items-center gap-2">
                    <IconDatabase size={17} className="text-emerald-600" />
                    <span className="font-medium text-[14px] text-[var(--text-primary)]">
                      {selectedTenant === 'kwanza' ? 'Kwanza Logistics Workspace' : 'Studio Savanna Workspace'}
                    </span>
                  </div>
                  <StatusBadge tone="success" variant="pill" dot size="md">
                    Strictly Isolated
                  </StatusBadge>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {selectedTenant === 'kwanza'
                    ? "This workspace only ever sees Kwanza's own conversations. Studio Savanna's customers are invisible to it, and always will be."
                    : "This workspace only ever sees Studio Savanna's own conversations. Kwanza's customers are invisible to it, and always will be."}
                </p>

                <div className="space-y-2 pt-1">
                  {selectedTenant === 'kwanza' ? (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-sunken)]/80 text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Dispatch questions, WhatsApp</span>
                        <StatusBadge tone="success" variant="squircle" size="sm">
                          14 active · Inbound only
                        </StatusBadge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-sunken)]/80 text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Mombasa fleet updates</span>
                        <StatusBadge tone="neutral" variant="squircle" size="sm">
                          6 resolved
                        </StatusBadge>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-sunken)]/80 text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Bridal styling requests, Instagram</span>
                        <StatusBadge tone="danger" variant="squircle" size="sm">
                          8 active · Inbound only
                        </StatusBadge>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface-sunken)]/80 text-xs">
                        <span className="font-medium text-[var(--text-primary)]">Lookbook consultations</span>
                        <StatusBadge tone="neutral" variant="squircle" size="sm">
                          3 scheduled
                        </StatusBadge>
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--ink-100)] flex items-center justify-between font-mono text-[10.5px] text-[var(--text-tertiary)]">
                  <span>RLS Security Policy #01</span>
                  <span>Cross-tenant queries return 0 rows</span>
                </div>
              </div>
            )}

            {/* 3. Vault Simulation */}
            {activeTab === 'vault' && (
              <div className="bg-white rounded-2xl p-5 border border-[var(--ink-200)]/80 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconKey size={16} className="text-amber-600" />
                    <span className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                      WhatsApp channel key
                    </span>
                  </div>
                  <StatusBadge tone="warning" variant="pill" size="sm">
                    Shown once
                  </StatusBadge>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--surface-sunken)] border border-[var(--ink-200)] font-mono text-[12.5px] text-[var(--text-primary)] tracking-wider">
                  {revealedKey ? 'alc_live_9f83a27e4c19d4b0086a' : 'alc_live_••••••••••••••••••••'}
                </div>

                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  Save this somewhere safe once you copy it — we only keep a scrambled version on our
                  side, so we can’t show it to you again, and neither can anyone else.
                </p>

                <div className="pt-2 border-t border-[var(--ink-100)] flex items-center justify-between font-mono text-[10.5px] text-[var(--text-tertiary)]">
                  <span>Argon2id Memory-Hard Hashing</span>
                  <span>Zero Plaintext Persistence</span>
                </div>
              </div>
            )}

            {/* 4. Voice Simulation */}
            {activeTab === 'voice' && (
              <div className="bg-white rounded-2xl p-5 border border-[var(--ink-200)]/80 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--ink-100)]">
                  <div className="flex items-center gap-2">
                    <IconBrandWhatsapp size={17} className="text-[var(--green-600)]" aria-hidden="true" />
                    <span className="text-[13.5px] font-semibold text-[var(--text-primary)]">
                      Customer Question & AI Response
                    </span>
                  </div>
                  <StatusBadge tone="brand" variant="pill" size="sm">
                    {TONE_LABELS[ruleTone]}
                  </StatusBadge>
                </div>

                {/* Inbound Customer Bubble */}
                <div className="self-start max-w-[90%]">
                  <div className="bg-[var(--surface-sunken)] p-3.5 rounded-2xl rounded-tl-xs text-[13px] text-[var(--text-primary)]">
                    <span className="font-mono text-[10px] text-[var(--text-tertiary)] block mb-1">
                      Customer inquiry:
                    </span>
                    “Habari, can you confirm when my order from Mombasa will arrive in Nairobi?”
                  </div>
                </div>

                {/* Outbound AI Assistant Bubble */}
                <div className="self-end max-w-[90%] ml-auto">
                  <div className="bg-[var(--blue-500)] p-3.5 rounded-2xl rounded-tr-xs text-[13px] text-white leading-relaxed shadow-sm">
                    <span className="font-mono text-[10px] text-white/80 block mb-1">
                      AI Assistant ({TONE_LABELS[ruleTone]}):
                    </span>
                    <p>{TONE_REPLIES[ruleTone]}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-1.5 font-mono text-[10px] text-[var(--text-tertiary)] px-1">
                    <span>Instantly dispatched</span>
                    <span>·</span>
                    <span className="text-emerald-600 font-medium">✓ Delivered</span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Activity Log Simulation */}
            {activeTab === 'log' && (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl border border-[var(--ink-200)]/80 bg-white shadow-xs">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                      Support session opened · Ticket #8291
                    </span>
                    <span className="font-mono text-[10.5px] text-[var(--text-tertiary)] shrink-0">2 min ago</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                    Approved by Japheth Njoroge for a channel connection issue.
                  </p>
                  <div className="mt-2 pt-2 border-t border-[var(--ink-100)] flex items-center justify-between font-mono text-[10px] text-[var(--text-tertiary)]">
                    <span>Actor: japheth@kwanza.co.ke</span>
                    <StatusBadge tone="success" variant="squircle" size="sm" icon={IconCheck}>
                      Signed hash verified
                    </StatusBadge>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[var(--ink-200)]/80 bg-white shadow-xs">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                      WhatsApp escalation rule updated
                    </span>
                    <span className="font-mono text-[10.5px] text-[var(--text-tertiary)] shrink-0">1 hour ago</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1.5">
                    Amina Wanjiku changed which keywords route to a person instead of the AI.
                  </p>
                  <div className="mt-2 pt-2 border-t border-[var(--ink-100)] flex items-center justify-between font-mono text-[10px] text-[var(--text-tertiary)]">
                    <span>Actor: amina@studiosavanna.ke</span>
                    <StatusBadge tone="success" variant="squircle" size="sm" icon={IconCheck}>
                      Signed hash verified
                    </StatusBadge>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}