'use client';

import { useState, useRef, useEffect } from 'react';
import {
  IconBrandWhatsapp,
  IconBrandInstagram,
  IconBrandMessenger,
  IconMessage,
  IconCpu,
  IconArrowRight,
  IconSearch,
  IconCircleCheck,
  IconClock,
  IconRoute,
  IconGauge,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

type ChannelType = 'whatsapp' | 'instagram' | 'messenger' | 'webchat';

interface ConversationItem {
  id: ChannelType;
  channelName: string;
  sublabel: string;
  icon: TablerIcon;
  color: string;
  badgeBg: string;
  senderName: string;
  senderRole: string;
  avatarUrl: string;
  snippet: string;
  time: string;
  unread: boolean;
  fullMessage: string;
  aiRuleTrigger: string;
  aiLatency: string;
  aiResolution: string;
  quickActions: string[];
}

const CONVERSATIONS: ConversationItem[] = [
  {
    id: 'whatsapp',
    channelName: 'WhatsApp Business API',
    sublabel: 'Verified Direct Channel',
    icon: IconBrandWhatsapp,
    color: '#16a34a',
    badgeBg: 'rgba(22, 163, 74, 0.08)',
    senderName: 'Japheth Njoroge',
    senderRole: 'Operations Director · Kwanza Logistics (Nairobi)',
    avatarUrl: '/avatars/japheth.jpg',
    snippet: 'Expanding dispatch team for Mombasa depot',
    time: 'Just now',
    unread: true,
    fullMessage: 'Habari Brian! We are expanding our fleet operations for the Mombasa depot this week. Can we provision 4 extra agent seats to our workspace before Friday?',
    aiRuleTrigger: 'Rule #04: "Tenant Seat Expansion" · Verified Tenant Admin Role',
    aiLatency: '0.38s',
    aiResolution: 'Validated tenant admin authorization. 4 agent seats provisioned in tenant workspace. Prorated balance queued in billing meter with zero downtime.',
    quickActions: ['Confirm Provisioning', 'Send Billing Receipt', 'View Fleet Usage'],
  },
  {
    id: 'instagram',
    channelName: 'Instagram Direct',
    sublabel: 'Meta Graph Messaging',
    icon: IconBrandInstagram,
    color: '#e11d48',
    badgeBg: 'rgba(225, 29, 72, 0.08)',
    senderName: 'Amina Wanjiku',
    senderRole: 'Creative Director · Studio Savanna (Kilimani)',
    avatarUrl: '/avatars/amina.jpg',
    snippet: 'Custom AI triage rules for bridal bookings',
    time: '2m ago',
    unread: true,
    fullMessage: 'Hey team! We receive over 250 WhatsApp & Instagram inquiries weekly for bridal bookings. Can we configure custom auto-triage rules for high-value client bookings?',
    aiRuleTrigger: 'Rule #12: "Automated Lead Routing" · Sentiment: High Intent (0.97)',
    aiLatency: '0.29s',
    aiResolution: 'Configured keyword trigger: [wedding, bridal, quote] -> Routed to VIP triage inbox with automated confirmation response.',
    quickActions: ['Preview Rule Logic', 'Test Rule Simulator', 'Assign to Lead Agent'],
  },
  {
    id: 'messenger',
    channelName: 'Facebook Messenger',
    sublabel: 'Meta Webhook Receiver',
    icon: IconBrandMessenger,
    color: '#2563eb',
    badgeBg: 'rgba(37, 99, 235, 0.08)',
    senderName: 'Kevin Omondi',
    senderRole: 'Lead Systems Architect · PayPulse Africa (Westlands)',
    avatarUrl: '/avatars/kevin.jpg',
    snippet: 'Scoped API key validation for message webhook',
    time: '5m ago',
    unread: false,
    fullMessage: 'Good morning! We are integrating our core backend with aLcassa webhooks. Where do we verify the tenant-scoped webhook signing keys?',
    aiRuleTrigger: 'Rule #09: "M2M Webhook Integration" · Scoped API Key Policy',
    aiLatency: '0.45s',
    aiResolution: 'API keys are strictly isolated per tenant in PostgreSQL RLS with Argon2id hashing. Directed to Settings > API Credentials with sample HMAC payload.',
    quickActions: ['Open API Documentation', 'Rotate Secret Key', 'Test Event Dispatch'],
  },
  {
    id: 'webchat',
    channelName: 'Live Website Chat',
    sublabel: 'WebSocket Secure Stream',
    icon: IconMessage,
    color: '#d97706',
    badgeBg: 'rgba(217, 119, 6, 0.08)',
    senderName: 'Dr. Faith Chebet',
    senderRole: 'Medical Operations Director · AfyaCare Diagnostics',
    avatarUrl: '/avatars/faith.jpg',
    snippet: 'Patient data privacy & tenant boundary isolation',
    time: '8m ago',
    unread: false,
    fullMessage: 'We are assessing aLcassa for patient appointment messaging across 6 branch clinics. Does the architecture guarantee complete data isolation between clinics?',
    aiRuleTrigger: 'Rule #01: "PostgreSQL Row-Level Security Enforced"',
    aiLatency: '0.22s',
    aiResolution: 'Every database query runs under Postgres Row-Level Security (RLS) on tenant_id with zero master key exposure. Branch tenant records are 100% segregated.',
    quickActions: ['Download Security Spec', 'Schedule Compliance Demo', 'Contact Brian'],
  },
];

export function HeroInteractiveConsole() {
  const [selectedId, setSelectedId] = useState<ChannelType>('whatsapp');
  const [isSimulating, setIsSimulating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatViewRef = useRef<HTMLDivElement>(null);

  const active = CONVERSATIONS.find((c) => c.id === selectedId) ?? CONVERSATIONS[0]!;

  // Smooth floating animation on perimeter telemetry tags
  useGSAP(() => {
    gsap.to('.telemetry-tag-1', {
      y: '-=5',
      duration: 4.0,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
    gsap.to('.telemetry-tag-2', {
      y: '-=6',
      duration: 4.6,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
      delay: 0.5,
    });
  }, { scope: containerRef });

  // Conversation switch transition
  useEffect(() => {
    if (chatViewRef.current) {
      gsap.fromTo(
        chatViewRef.current,
        { opacity: 0, y: 6 },
        { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' }
      );
    }
  }, [selectedId]);

  const handleSimulateNext = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      const currentIndex = CONVERSATIONS.findIndex((c) => c.id === selectedId);
      const nextIndex = (currentIndex + 1) % CONVERSATIONS.length;
      setSelectedId(CONVERSATIONS[nextIndex]!.id);
    }, 550);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-[1200px] mx-auto select-none">
      {/* ── Soft Ambient Backlight Glow ───────────────────────────────── */}
      <div
        className="pointer-events-none absolute -inset-6 rounded-[32px] opacity-30 blur-3xl transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${active.color} 0%, transparent 65%)`,
        }}
      />

      {/* ── Precision Telemetry Badges Flanking the Console (Clean, No Blinking) ── */}
      <div className="telemetry-tag-1 pointer-events-none absolute -top-4 -left-3 z-30 hidden lg:flex items-center gap-2 rounded-full border border-[var(--ink-200)] bg-[var(--ink-0)] px-3.5 py-1 text-[11px] font-sans shadow-md backdrop-blur-md">
        <span className="size-2 rounded-full bg-[var(--green-500)]" />
        <span className="text-[var(--text-primary)] font-medium">PostgreSQL RLS Active · tenant_vault_01</span>
      </div>

      <div className="telemetry-tag-2 pointer-events-none absolute -top-4 -right-3 z-30 hidden lg:flex items-center gap-2 rounded-full border border-[var(--ink-200)] bg-[var(--ink-0)] px-3.5 py-1 text-[11px] font-sans shadow-md backdrop-blur-md">
        <IconRoute size={14} className="text-[var(--orange-500)]" />
        <span className="text-[var(--text-primary)] font-medium">AI Rule Propagation &lt; 5s</span>
      </div>

      {/* ── The Master Console Frame (Expansive & Aligned with Strip) ── */}
      <div className="relative z-10 overflow-hidden rounded-2xl border border-[var(--ink-200)] bg-[var(--ink-0)] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07)] transition-all">
        
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-[var(--ink-100)] bg-[var(--ink-50)]/90 px-5 py-3.5 backdrop-blur-md">
          {/* Left: Platform Brand / Active Workspace */}
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-[var(--green-500)]" />
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
              <span>aLcassa Unified Workspace</span>
              <span className="text-[var(--ink-300)]">/</span>
              <span className="font-normal text-[var(--text-secondary)]">Live Inbound Streams</span>
            </div>
          </div>

          {/* Center Search Bar */}
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-[var(--ink-200)] bg-[var(--ink-0)] px-3.5 py-1.5 text-[11.5px] text-[var(--text-tertiary)] shadow-xs w-[320px]">
            <IconSearch size={13} className="text-[var(--ink-400)]" />
            <span className="flex-1 truncate">Filter messages or search rules...</span>
            <kbd className="rounded bg-[var(--ink-100)] px-1.5 py-0.5 text-[9.5px] font-mono font-semibold text-[var(--text-secondary)]">⌘K</kbd>
          </div>

          {/* Right: Live Stream & Latency Indicator */}
          <div className="flex items-center gap-2 text-[11.5px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--green-100)] px-3 py-1 font-medium text-[var(--green-500)]">
              <span className="size-1.5 rounded-full bg-[var(--green-500)]" />
              4 INBOUND FEEDS ONLINE
            </span>
          </div>
        </div>

        {/* Console Body: 2-Pane Workstation (Left: Stream Feed, Right: Active Thread & Rules) */}
        <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] divide-y md:divide-y-0 md:divide-x divide-[var(--ink-100)]">
          
          {/* Left Pane: Multi-Channel Inbox List */}
          <div className="bg-[var(--ink-50)]/40 p-3 flex flex-col gap-1.5">
            <div className="px-2 py-1 flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Inbound Feeds
              </span>
              <span className="rounded-full bg-[var(--ink-200)] px-2 py-0.2 text-[10px] font-medium text-[var(--text-primary)]">
                4 Active
              </span>
            </div>

            {CONVERSATIONS.map((item) => {
              const isSelected = item.id === selectedId;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={`group relative flex items-start gap-3.5 rounded-xl p-3 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--ink-0)] border border-[var(--ink-200)] shadow-sm'
                      : 'hover:bg-[var(--ink-0)]/60 border border-transparent'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={item.avatarUrl}
                      alt={item.senderName}
                      className="size-11 rounded-full object-cover ring-1 ring-[var(--ink-200)] shadow-xs"
                    />
                    <span
                      className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full text-white shadow-xs"
                      style={{ background: item.color }}
                    >
                      <Icon size={11} stroke={2.5} />
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-sans text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                        {item.senderName}
                      </span>
                      <span className="text-[10.5px] text-[var(--text-tertiary)] shrink-0">
                        {item.time}
                      </span>
                    </div>

                    <p className="font-sans text-[12px] text-[var(--text-secondary)] truncate mt-0.5">
                      {item.snippet}
                    </p>

                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: item.badgeBg, color: item.color }}
                      >
                        {item.channelName.split(' ')[0]}
                      </span>
                      <span className="text-[10.5px] text-[var(--text-tertiary)] truncate">
                        {item.sublabel}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Pane: Live Active Thread & AI Rule Processing */}
          <div ref={chatViewRef} className="p-5 sm:p-7 bg-[var(--ink-0)] flex flex-col justify-between min-h-[400px]">
            <div>
              {/* Thread Header */}
              <div className="flex items-center justify-between border-b border-[var(--ink-100)] pb-4">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <img
                      src={active.avatarUrl}
                      alt={active.senderName}
                      className="size-11 rounded-full object-cover ring-2 ring-[var(--ink-100)] shadow-xs"
                    />
                    <span
                      className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full text-white shadow-xs"
                      style={{ background: active.color }}
                    >
                      <active.icon size={11} stroke={2.5} />
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-sans text-[15px] font-semibold text-[var(--text-primary)]">
                        {active.senderName}
                      </h4>
                      <span
                        className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: active.badgeBg, color: active.color }}
                      >
                        {active.channelName}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--text-tertiary)]">
                      {active.senderRole}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                  <IconClock size={14} className="text-[var(--text-tertiary)]" />
                  <span>Avg Latency: &lt; 5s</span>
                </div>
              </div>

              {/* Message Feed */}
              <div className="mt-5 flex flex-col gap-4">
                {/* Incoming customer message */}
                <div className="self-start max-w-[88%] rounded-2xl rounded-tl-sm border border-[var(--ink-200)] bg-[var(--ink-50)] p-4 text-[14px] leading-relaxed text-[var(--text-primary)] shadow-xs">
                  {active.fullMessage}
                </div>

                {/* AI Assistant Rule Trace Card (No Sparkles / No Lightning) */}
                <div className="rounded-xl border border-[var(--blue-200)] bg-[var(--blue-50)]/80 p-3.5 text-[12.5px]">
                  <div className="flex items-center justify-between text-[11.5px] font-semibold text-[var(--blue-600)]">
                    <span className="flex items-center gap-1.5">
                      <IconCpu size={15} className="text-[var(--blue-500)]" />
                      AI RULE MATCH &amp; AUTOMATED RESOLUTION
                    </span>
                    <span className="flex items-center gap-1 rounded bg-white/90 px-2 py-0.5 text-[10.5px] font-medium text-[var(--orange-500)] shadow-xs">
                      <IconGauge size={12} />
                      {active.aiLatency} execution
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] font-mono text-[var(--text-secondary)]">
                    {active.aiRuleTrigger}
                  </p>
                  <p className="mt-1.5 font-sans text-[13px] text-[var(--text-primary)] font-medium">
                    {active.aiResolution}
                  </p>
                </div>

                {/* Response bubble */}
                <div className="self-end max-w-[88%] rounded-2xl rounded-tr-sm bg-[var(--blue-500)] p-4 text-[14px] leading-relaxed text-white shadow-sm">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-mono text-white/80">
                    <span className="flex items-center gap-1.5 text-white font-medium">
                      <IconCircleCheck size={13} />
                      Automated Instant Response
                    </span>
                    <span>Just now</span>
                  </div>
                  <p className="text-[13.5px] leading-relaxed text-white/95">
                    {active.aiResolution.split('.')[0]}. Confirmation ticket generated and dispatched.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Quick Action Bar */}
            <div className="mt-6 border-t border-[var(--ink-100)] pt-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11.5px] uppercase tracking-wider text-[var(--text-tertiary)] mr-1">
                  Actions:
                </span>
                {active.quickActions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className="rounded-lg border border-[var(--ink-200)] bg-[var(--ink-0)] px-3 py-1 text-[12px] font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--ink-50)] hover:border-[var(--ink-400)] shadow-xs"
                  >
                    {action}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleSimulateNext}
                disabled={isSimulating}
                className="group flex cursor-pointer items-center gap-2 rounded-lg bg-[var(--ink-900)] px-3.5 py-1.5 text-[12.5px] font-medium text-white transition-all hover:bg-[var(--ink-800)] active:scale-95 shadow-xs"
              >
                <span>{isSimulating ? 'Switching...' : 'Simulate Next Inbound'}</span>
                <IconArrowRight
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </div>
        </div>

        {/* Global Security & Channel Health Footer (Accurate to Docs) */}
        <div className="flex flex-wrap items-center justify-between border-t border-[var(--ink-100)] bg-[var(--ink-50)]/80 px-5 py-3 text-[11.5px] text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[var(--green-500)]" />
            <span className="font-medium text-[var(--text-primary)]">PostgreSQL Row-Level Security</span>
            <span className="text-[var(--ink-300)]">·</span>
            <span>Enforced per tenant_id</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Machine-Readable Rules Cache &lt; 5s</span>
            <span className="text-[var(--ink-300)]">·</span>
            <span className="text-[var(--green-500)] font-medium">0 Master Key Vulnerabilities</span>
          </div>
        </div>

      </div>
    </div>
  );
}
