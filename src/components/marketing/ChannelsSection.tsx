'use client';

import { useState, useEffect } from 'react';
import {
  IconBrandWhatsapp,
  IconBrandInstagram,
  IconBrandMessenger,
  IconMessage,
  IconCheck,
  IconRoute,
  IconShieldLock,
  IconShieldCheck,
  IconClock,
  IconKeyOff,
  IconFileCode,
  IconDatabase,
  type Icon as TablerIcon,
} from '@tabler/icons-react';

interface ChannelItem {
  id: 'whatsapp' | 'instagram' | 'messenger' | 'webchat';
  name: string;
  badge: string;
  icon: TablerIcon;
  accentHex: string;
  glowColor: string;
  channelTag: string;
  headline: string;
  description: string;
  capabilities: string[];
  simulation: {
    customerName: string;
    customerCompany: string;
    channelDetail: string;
    inboundText: string;
    inboundTime: string;
    aiRoutingAction: string;
    aiConfidence: string;
    resolvedResponse: string;
    resolvedTime: string;
    agentName: string;
  };
}

const CHANNELS: ChannelItem[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    badge: 'Meta Cloud API',
    icon: IconBrandWhatsapp,
    accentHex: '#22c55e',
    glowColor: 'rgba(34, 197, 94, 0.15)',
    channelTag: 'WHATSAPP_CLOUD_GATEWAY',
    headline: 'Direct Meta Cloud API streaming for mission-critical logistics & orders.',
    description:
      'Native integration with official WhatsApp Cloud webhooks. Automatically dispatch delivery tracking, order invoices, and route high-urgency customer inquiries.',
    capabilities: [
      'Official Meta Cloud API direct webhook streaming',
      'Interactive quick-reply actions & media document attachments',
      'Automated dispatch alerts & after-hours customer triage',
    ],
    simulation: {
      customerName: 'Japheth Njoroge',
      customerCompany: 'Kwanza Logistics (Nairobi)',
      channelDetail: 'WhatsApp Business · +254 712 ••• 890',
      inboundText: 'Habari, could you confirm when our Mombasa container batch #KW-902 clears for Westlands warehouse delivery?',
      inboundTime: '11:42 EAT',
      aiRoutingAction: 'Matched keyword "Mombasa container" → Auto-Queried Fleet Database',
      aiConfidence: '99.4% intent match',
      resolvedResponse: 'Habari Japheth! Batch #KW-902 cleared Mtito Andei checkpoint at 11:20 AM. Estimated warehouse arrival: 4:30 PM today.',
      resolvedTime: '11:42:04 EAT (< 4s automated resolution)',
      agentName: 'Automated Inbound Dispatch Engine',
    },
  },
  {
    id: 'instagram',
    name: 'Instagram Direct',
    badge: 'Story & DM Sync',
    icon: IconBrandInstagram,
    accentHex: '#f43f5e',
    glowColor: 'rgba(244, 63, 94, 0.15)',
    channelTag: 'INSTAGRAM_GRAPH_V21',
    headline: 'Convert Instagram Story mentions & lookbook DMs into scheduled appointments.',
    description:
      'Aggregate customer direct messages and story reactions without team members juggling mobile credentials. Keep your luxury, retail, or creative brand responsive 24/7.',
    capabilities: [
      'Instant Story reply and reel mention aggregation',
      'Lookbook triage with automated VIP fitting scheduler',
      'Seamless handoff from automated triage to senior stylists',
    ],
    simulation: {
      customerName: 'Amina Wanjiku',
      customerCompany: 'Studio Savanna (Kilimani)',
      channelDetail: 'Instagram Direct · @aminaw_creative',
      inboundText: 'Loved the new bridal lookbook showcase on your story! Are there slots available for a private fitting this Saturday in Kilimani?',
      inboundTime: '12:05 EAT',
      aiRoutingAction: 'Story Reply Triage → Category: Bridal Consultation (Kilimani)',
      aiConfidence: '98.8% intent match',
      resolvedResponse: 'Hello Amina! We have 2:00 PM and 4:30 PM slots available this Saturday at our Kilimani studio. Shall we reserve 2:00 PM for you?',
      resolvedTime: '12:05:03 EAT (< 3s automated resolution)',
      agentName: 'Studio Savanna Concierge Desk',
    },
  },
  {
    id: 'messenger',
    name: 'Facebook Messenger',
    badge: 'Enterprise Pages',
    icon: IconBrandMessenger,
    accentHex: '#3b82f6',
    glowColor: 'rgba(59, 130, 246, 0.15)',
    channelTag: 'MESSENGER_WEBHOOK_INGEST',
    headline: 'Consolidate multiple brand page inboxes into a structured resolution queue.',
    description:
      'Manage multiple brand and regional business pages from one dashboard. Enrich inbound leads, qualify technical requirements, and resolve customer support tickets.',
    capabilities: [
      'Multi-page Facebook Messenger synchronisation',
      'Automated lead qualification & CRM contact creation',
      'Encrypted webhook payload verification with HMAC SHA-256',
    ],
    simulation: {
      customerName: 'Kevin Omondi',
      customerCompany: 'PayPulse Africa (Westlands)',
      channelDetail: 'Facebook Messenger · PayPulse Enterprise Support',
      inboundText: 'Hello, our engineering team is reviewing your scoped tenant API credentials. Can we arrange an architect walkthrough today?',
      inboundTime: '13:15 EAT',
      aiRoutingAction: 'Enterprise Lead Tagged → Priority: High → Systems Architect Escalation',
      aiConfidence: '97.6% intent match',
      resolvedResponse: 'Hello Kevin! Absolutely. We have scheduled a 20-minute technical session with our systems architect for today at 3:00 PM.',
      resolvedTime: '13:15:05 EAT (< 5s escalation)',
      agentName: 'PayPulse Systems Desk',
    },
  },
  {
    id: 'webchat',
    name: 'Website Chat Widget',
    badge: 'Real-time WebSocket',
    icon: IconMessage,
    accentHex: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.15)',
    channelTag: 'WEBSOCKET_STREAM_V1',
    headline: 'Sub-15kb embeddable widget with dedicated database-level data isolation.',
    description:
      'A featherweight web widget that loads in milliseconds. Features real-time WebSocket connectivity, tenant branding customization, and instantaneous AI greetings.',
    capabilities: [
      'Lightweight sub-15kb script with zero layout shifts',
      'Persistent conversation memory across customer browser sessions',
      'PostgreSQL RLS guaranteed patient & client data privacy',
    ],
    simulation: {
      customerName: 'Dr. Faith Chebet',
      customerCompany: 'AfyaCare Diagnostics',
      channelDetail: 'Portal Chat · portal.afyacare.co.ke/diag',
      inboundText: 'Is clinical laboratory diagnostic data transmitted over this web chat isolated under our dedicated tenant boundary?',
      inboundTime: '14:30 EAT',
      aiRoutingAction: 'Security Verification Query → Checked Tenant Isolation Protocol',
      aiConfidence: '99.9% intent match',
      resolvedResponse: 'Good afternoon Dr. Chebet. Yes, all web chat traffic is segregated at the PostgreSQL query layer via RLS, ensuring 100% tenant data isolation.',
      resolvedTime: '14:30:02 EAT (< 2s security response)',
      agentName: 'AfyaCare Dedicated Portal Desk',
    },
  },
];

export function ChannelsSection() {
  const [activeId, setActiveId] = useState<ChannelItem['id']>('whatsapp');
  const activeChannel = CHANNELS.find((c) => c.id === activeId) ?? CHANNELS[0]!;

  const [secondsRemaining, setSecondsRemaining] = useState(1434);
  const [isRevoked, setIsRevoked] = useState(false);

  useEffect(() => {
    if (isRevoked) return;
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 1800));
    }, 1000);
    return () => clearInterval(timer);
  }, [isRevoked]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full">
      {/* ── Right-Aligned Alternating Header ── */}
      <div className="flex flex-col items-end text-right max-w-3xl ml-auto">
        <div className="inline-flex items-center gap-2">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--orange-500)]">
            Omnichannel & Security Hub
          </p>
          <span className="size-2 rounded-full bg-[var(--orange-500)]" aria-hidden />
        </div>
        <h2 className="display text-[32px] sm:text-[42px] font-normal tracking-tight text-[var(--text-primary)] mt-3 leading-tight">
          Where the messages come from.<br className="hidden sm:block" /> How they remain secure.
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] mt-3 leading-relaxed">
          Four distinct channels converge into a single unified workspace. Every inbound payload is analyzed, routed, and resolved while strictly contained within your dedicated Row Level Security boundary.
        </p>
      </div>

      {/* ── Inverted Dark Chrome Enclosure (Breaking Monotony) ── */}
      <div
        className="mt-12 overflow-hidden rounded-2xl border transition-all"
        style={{
          background: 'var(--invert-card-bg)',
          borderColor: 'var(--invert-card-border)',
          color: 'var(--invert-card-fg)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Top Control Bar: Channel Dock Switcher */}
        <div className="border-b border-white/10 bg-black/30 p-3 sm:p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {CHANNELS.map((channel) => {
              const isActive = channel.id === activeId;
              const Icon = channel.icon;
              return (
                <button
                  key={channel.id}
                  onClick={() => setActiveId(channel.id)}
                  className={`group relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white/10 border-white/20 shadow-lg'
                      : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.07] hover:border-white/10'
                  }`}
                  style={{
                    boxShadow: isActive ? `0 0 20px ${channel.glowColor}` : 'none',
                  }}
                >
                  <div
                    className="size-8 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                    style={{
                      backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                    }}
                  >
                    <Icon size={18} stroke={1.75} style={{ color: channel.accentHex }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-white truncate block">
                        {channel.name}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-white/50 block truncate">
                      {channel.badge}
                    </span>
                  </div>

                  {isActive && (
                    <span
                      className="size-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: channel.accentHex }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tier 1: Omnichannel Command Stage (Left: Specs, Right: White Console) ── */}
        <div className="p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left 5 Cols: Architecture, Guarantees & Capabilities */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/10 bg-white/5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: activeChannel.accentHex }}
                  />
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-white/80">
                    {activeChannel.channelTag}
                  </span>
                </div>

                <h3 className="text-[22px] sm:text-[26px] font-normal tracking-tight text-white mt-3.5 leading-snug">
                  {activeChannel.headline}
                </h3>

                <p className="text-[13.5px] text-white/70 mt-2.5 leading-relaxed">
                  {activeChannel.description}
                </p>
              </div>

              {/* Core Capabilities */}
              <div className="space-y-3 pt-5 border-t border-white/10">
                {activeChannel.capabilities.map((cap, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[13px] text-white/90">
                    <div className="size-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <IconCheck size={11} stroke={2.5} className="text-emerald-400" />
                    </div>
                    <span>{cap}</span>
                  </div>
                ))}
              </div>

              {/* Security Seal Note */}
              <div className="flex items-center gap-2 font-mono text-[11px] text-white/50 pt-2">
                <IconShieldLock size={14} className="text-emerald-400" />
                <span>Zero cross-tenant exposure · RLS Enforced</span>
              </div>
            </div>

            {/* Right 7 Cols: Live Inbound Payload & Unified Stream Visualizer (White Console) */}
            <div className="lg:col-span-7 rounded-xl border border-[var(--ink-300)] bg-white p-5 sm:p-6 space-y-5 shadow-2xl text-[var(--text-primary)]">
              
              {/* Telemetry Header */}
              <div className="flex items-center justify-between border-b border-[var(--ink-200)] pb-3 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-[var(--green-500)]" />
                  <span className="text-[var(--text-primary)] font-semibold">{activeChannel.simulation.channelDetail}</span>
                </div>
                <span className="text-[var(--green-600)] bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
                  STREAMING ONLINE
                </span>
              </div>

              {/* Customer Identity Bar */}
              <div className="flex items-center justify-between bg-[var(--surface-sunken)] p-3 rounded-lg border border-[var(--border-subtle)]">
                <div>
                  <span className="text-xs font-semibold text-[var(--text-primary)] block">
                    {activeChannel.simulation.customerName}
                  </span>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {activeChannel.simulation.customerCompany}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[10.5px] text-[var(--text-tertiary)] block">Inbound Gateway</span>
                  <span
                    className="font-mono text-[11px] font-semibold"
                    style={{ color: activeChannel.accentHex }}
                  >
                    {activeChannel.name}
                  </span>
                </div>
              </div>

              {/* Live Inbound Message Frame */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10.5px] text-[var(--text-tertiary)]">
                  <span>INBOUND CUSTOMER PAYLOAD:</span>
                  <span>{activeChannel.simulation.inboundTime}</span>
                </div>
                <div className="bg-[var(--surface-sunken)] border border-[var(--border-subtle)] p-3.5 rounded-xl text-[13px] text-[var(--text-primary)] leading-relaxed shadow-xs">
                  &quot;{activeChannel.simulation.inboundText}&quot;
                </div>
              </div>

              {/* Smart Routing Telemetry Chip */}
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-900">
                  <IconRoute size={15} className="text-[var(--green-600)]" />
                  <span className="text-[11.5px] font-medium">{activeChannel.simulation.aiRoutingAction}</span>
                </div>
                <span className="font-mono text-[10.5px] text-emerald-800 bg-white border border-emerald-300 px-2 py-0.5 rounded font-semibold shadow-xs">
                  {activeChannel.simulation.aiConfidence}
                </span>
              </div>

              {/* Outbound Dispatch Response */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10.5px] text-[var(--text-tertiary)]">
                  <span>UNIFIED WORKSPACE RESOLUTION:</span>
                  <span className="text-[var(--green-600)] font-medium">{activeChannel.simulation.resolvedTime}</span>
                </div>
                <div className="p-3.5 rounded-xl text-[13px] text-white bg-[var(--blue-500)] leading-relaxed shadow-sm">
                  {activeChannel.simulation.resolvedResponse}
                </div>
              </div>

              {/* Footer Status Bar */}
              <div className="pt-2 flex items-center justify-between font-mono text-[10.5px] text-[var(--text-tertiary)] border-t border-[var(--border-subtle)]">
                <span>RESPONDER: {activeChannel.simulation.agentName.toUpperCase()}</span>
                <span className="text-[var(--text-primary)] font-medium">ALCASSA SECURE OMNICHANNEL CORE</span>
              </div>

            </div>
          </div>
        </div>

        {/* ── Tier 2: Enterprise Security & Isolation (ALTERNATING: Left: White Console, Right: Specs) ── */}
        <div className="border-t border-white/10 bg-black/20 p-6 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left 7 Cols: Telemetry Support Console & Live RLS Terminal (Alternated) */}
            <div className="lg:col-span-7 rounded-xl border border-[var(--ink-300)] bg-white p-5 sm:p-6 space-y-4 shadow-2xl transition-all text-[var(--text-primary)]">
              
              {/* Telemetry Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-[var(--ink-200)] pb-3.5 gap-2 font-mono text-[11px]">
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${isRevoked ? 'bg-rose-500' : 'bg-[var(--green-500)]'}`} />
                  <span className="text-[var(--text-primary)] font-semibold">
                    {isRevoked ? 'SESSION TERMINATED' : 'ACTIVE SUPPORT SESSION #SES-8829'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full font-medium ${
                    isRevoked
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-[var(--green-600)] border border-emerald-500/20'
                  }`}>
                    {isRevoked ? 'TOKEN DESTROYED' : 'SCOPED RLS ENFORCED'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (isRevoked) {
                        setIsRevoked(false);
                        setSecondsRemaining(1800);
                      } else {
                        setIsRevoked(true);
                      }
                    }}
                    className={`text-[10.5px] font-mono px-2.5 py-1 rounded transition-colors cursor-pointer font-semibold ${
                      isRevoked
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {isRevoked ? 'Re-authorize' : 'Revoke Access'}
                  </button>
                </div>
              </div>

              {/* Target & Session Metadata Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--surface-sunken)] p-3 rounded-lg border border-[var(--border-subtle)] text-xs">
                <div>
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)] uppercase block">Target Workspace</span>
                  <span className="font-semibold text-[var(--text-primary)]">Acme Logistics (#829)</span>
                  <span className="text-[11px] text-[var(--text-secondary)] block">Nairobi Hub · Mombasa Road</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[var(--text-tertiary)] uppercase block">Operator & Scope</span>
                  <span className="font-semibold text-[var(--text-primary)]">support_ops@alcassa.internal</span>
                  <span className="text-[11px] text-[var(--text-secondary)] block">Ticket #4829 (Read-Only Isolation)</span>
                </div>
              </div>

              {/* Countdown Bar */}
              <div className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                isRevoked
                  ? 'bg-zinc-100 border-zinc-300 text-zinc-600'
                  : 'bg-rose-50/80 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-2">
                  <IconClock size={16} className={isRevoked ? 'text-zinc-500' : 'text-rose-600'} />
                  <span className="text-[12px] font-medium">
                    {isRevoked ? 'Hard-Kill Triggered (Epoch Cleared)' : 'Automated Hard-Kill Expiry:'}
                  </span>
                </div>
                <span className={`font-mono text-[14px] font-bold tracking-widest ${
                  isRevoked ? 'text-zinc-500' : 'text-rose-600'
                }`}>
                  {isRevoked ? '00:00 (REVOKED)' : formatTime(secondsRemaining)}
                </span>
              </div>

              {/* Live Row Level Security Query Sandbox */}
              <div className="space-y-1.5 font-mono">
                <div className="flex items-center justify-between text-[10.5px] text-[var(--text-tertiary)]">
                  <div className="flex items-center gap-1.5">
                    <IconDatabase size={13} className="text-[var(--text-secondary)]" />
                    <span>POSTGRESQL RLS ENFORCEMENT LAYER:</span>
                  </div>
                  <span className="text-emerald-700 font-semibold">100% ISOLATED</span>
                </div>
                <div className="bg-[#18181b] text-emerald-400 p-3 rounded-lg text-[11px] leading-relaxed border border-zinc-700 shadow-inner overflow-x-auto">
                  <span className="text-blue-400">SELECT</span> * <span className="text-blue-400">FROM</span> tenant_inbox_messages<br />
                  <span className="text-blue-400">WHERE</span> tenant_id = <span className="text-amber-300">&apos;acme_829&apos;</span> <span className="text-zinc-400">-- [RLS Policy: Zero cross-leakage]</span><br />
                  <span className="text-blue-400">AND</span> session_mode = <span className="text-amber-300">&apos;READ_ONLY&apos;</span>;
                </div>
              </div>

              {/* Audit Trail Row */}
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between text-[10.5px] font-mono text-[var(--text-tertiary)]">
                  <span>REAL-TIME AUDIT DISPATCH LOG:</span>
                  <span className="text-[var(--green-600)] font-semibold">APPEND-ONLY SECURE</span>
                </div>
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-lg text-[11.5px] text-emerald-900">
                  <div className="flex items-center gap-2 truncate">
                    <IconCheck size={14} className="text-[var(--green-600)] shrink-0" />
                    <span className="truncate">
                      {isRevoked
                        ? 'Admin manual revocation recorded in tenant audit stream.'
                        : 'Query logged: Inspector accessed invoice #KW-902 · Scoped Token Verified'}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-700 bg-white border border-emerald-300 px-1.5 py-0.5 rounded shrink-0 font-medium">
                    VERIFIED
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-between font-mono text-[10px] text-[var(--text-tertiary)] border-t border-[var(--border-subtle)]">
                <span>AUTH: ARGON2ID_EPHEMERAL_KEY</span>
                <span className="text-[var(--text-primary)] font-medium">KENYA DPA 2019 COMPLIANT</span>
              </div>
            </div>

            {/* Right 5 Cols: Security Guarantees & Editorial Copy (Alternated) */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-[var(--orange-500)]/30 bg-[var(--orange-500)]/15">
                  <IconShieldCheck size={15} className="text-[var(--orange-500)]" />
                  <span className="font-mono text-[10.5px] uppercase tracking-wider text-[var(--orange-500)] font-semibold">
                    Zero Trust Support Protocol
                  </span>
                </div>

                <h3 className="text-[24px] sm:text-[28px] font-normal tracking-tight text-white mt-4 leading-snug">
                  You can see every time we look at your workspace.
                </h3>

                <p className="text-[13.5px] text-white/70 mt-3 leading-relaxed">
                  When our support team opens your account, they do it through a scoped session bound by exactly the same Row Level Security rules that protect you from every other business on the platform. Not a master key. The session is read-only, it expires after thirty minutes, it is written to your own activity log with a reason, and you can end it yourself at any time.
                </p>
              </div>

              {/* Security Metrics Breakdown */}
              <div className="space-y-3.5 pt-5 border-t border-white/10">
                <div className="flex items-start gap-3 text-white">
                  <div className="size-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <IconKeyOff size={16} className="text-[var(--orange-500)]" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-medium text-white">Zero Master Keys</h4>
                    <p className="text-[12px] text-white/60 mt-0.5 leading-relaxed">
                      No superadmin credentials exist. Every session requires a distinct ephemeral token hashed with Argon2id.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-white">
                  <div className="size-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <IconClock size={16} className="text-rose-400" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-medium text-white">30-Min Strict Expiry</h4>
                    <p className="text-[12px] text-white/60 mt-0.5 leading-relaxed">
                      Support sessions automatically self-destruct upon countdown expiration or instantly when revoked by your workspace admins.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-white">
                  <div className="size-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <IconFileCode size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-medium text-white">Immutable Audit Ledger</h4>
                    <p className="text-[12px] text-white/60 mt-0.5 leading-relaxed">
                      Every read query is timestamped and permanently signed to your workspace compliance activity feed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance Seal */}
              <div className="flex items-center gap-2 font-mono text-[11px] text-white/50 pt-2 border-t border-white/10">
                <IconShieldLock size={14} className="text-emerald-400" />
                <span>Audited for Kenya DPA 2019 & ISO/IEC 27001 Tenancy Isolation</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
