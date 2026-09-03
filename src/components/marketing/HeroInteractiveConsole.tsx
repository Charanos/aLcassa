'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  IconBrandWhatsapp,
  IconBrandInstagram,
  IconBrandMessenger,
  IconMessage,
  IconArrowRight,
  IconSend,
  IconCircleCheck,
  IconCheck,
  IconClock,
  IconShieldLock,
  IconCpu,
  IconSearch,
  IconBell,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Mark } from '../brand/Mark';
import { StatusBadge, type StatusBadgeTone } from '@/components/ui/StatusBadge';

type ChannelType = 'whatsapp' | 'instagram' | 'messenger' | 'webchat';

const getChannelTone = (id: ChannelType): StatusBadgeTone => {
  switch (id) {
    case 'whatsapp':
      return 'success';
    case 'instagram':
      return 'danger';
    case 'messenger':
      return 'info';
    case 'webchat':
      return 'warning';
  }
};

interface ConversationItem {
  id: ChannelType;
  channelName: string;
  icon: TablerIcon;
  color: string;
  badgeBg: string;
  avatarUrl: string;
  senderName: string;
  senderBusiness: string;
  senderRole: string;
  snippet: string;
  time: string;
  fullMessage: string;
  suggestedReply: string;
  ruleTag: string;
  ruleLatency: string;
  quickActions: string[];
}

const CONVERSATIONS: ConversationItem[] = [
  {
    id: 'whatsapp',
    channelName: 'WhatsApp',
    icon: IconBrandWhatsapp,
    color: '#16a34a',
    badgeBg: 'rgba(22, 163, 74, 0.12)',
    avatarUrl: '/avatars/japheth.jpg',
    senderName: 'Japheth Njoroge',
    senderBusiness: 'Kwanza Logistics',
    senderRole: 'Operations Director (Nairobi Depot)',
    snippet: 'Any update on the Mombasa delivery?',
    time: 'Just now',
    fullMessage:
      'Habari! Just checking — any update on when our Mombasa container clears for delivery to the Westlands warehouse?',
    suggestedReply:
      'Habari Japheth! Your container cleared Mtito Andei at 11:20am. It should reach the Westlands warehouse by 4:30pm today.',
    ruleTag: 'Rule #04 · Logistics Live Ingest',
    ruleLatency: '1.1s',
    quickActions: ['Attach live tracking link', 'Assign to dispatch'],
  },
  {
    id: 'instagram',
    channelName: 'Instagram',
    icon: IconBrandInstagram,
    color: '#e11d48',
    badgeBg: 'rgba(225, 29, 72, 0.12)',
    avatarUrl: '/avatars/amina.jpg',
    senderName: 'Amina Wanjiku',
    senderBusiness: 'Studio Savanna',
    senderRole: 'Creative Director (Kilimani)',
    snippet: 'Any slots free this Saturday?',
    time: '2m ago',
    fullMessage:
      'Loved the bridal lookbook on your story! Do you have any slots free for a private fitting this Saturday?',
    suggestedReply:
      'Hi Amina! We have 2:00pm and 4:30pm open this Saturday in Kilimani. Want me to hold 2:00pm for you?',
    ruleTag: 'Rule #09 · Appointment Auto-Triage',
    ruleLatency: '0.9s',
    quickActions: ['Check calendar', 'Move to bookings'],
  },
  {
    id: 'messenger',
    channelName: 'Messenger',
    icon: IconBrandMessenger,
    color: '#2563eb',
    badgeBg: 'rgba(37, 99, 235, 0.12)',
    avatarUrl: '/avatars/kevin.jpg',
    senderName: 'Kevin Omondi',
    senderBusiness: 'PayPulse Africa',
    senderRole: 'Lead Systems Architect',
    snippet: 'Can we get a call today?',
    time: '5m ago',
    fullMessage:
      "Hi there, we're reviewing your platform for our team and had a couple of questions. Could someone call us today?",
    suggestedReply:
      "Hi Kevin, happy to help. I've booked you a 20-minute call with our team today at 3:00pm — does that work for you?",
    ruleTag: 'Rule #17 · Enterprise Lead Routing',
    ruleLatency: '1.4s',
    quickActions: ['Book the call', 'Flag as priority'],
  },
  {
    id: 'webchat',
    channelName: 'Website chat',
    icon: IconMessage,
    color: '#d97706',
    badgeBg: 'rgba(217, 119, 6, 0.12)',
    avatarUrl: '/avatars/faith.jpg',
    senderName: 'Dr. Faith Chebet',
    senderBusiness: 'AfyaCare Diagnostics',
    senderRole: 'Medical Operations Director',
    snippet: 'Is our patient data kept separate?',
    time: '8m ago',
    fullMessage:
      'Quick question before we sign up — is our patient data kept fully separate from your other clients on the platform?',
    suggestedReply:
      'Good afternoon Dr. Chebet — yes. Your data is fully separated from every other business on the platform, always.',
    ruleTag: 'Rule #12 · Healthcare Tenancy Isolation',
    ruleLatency: '1.2s',
    quickActions: ['Share security whitepaper', 'Book technical walkthrough'],
  },
];

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const listener = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, []);
  return reduced;
}

export function HeroInteractiveConsole() {
  const [selectedId, setSelectedId] = useState<ChannelType>('webchat');
  const [isSimulating, setIsSimulating] = useState(false);
  const [sentIds, setSentIds] = useState<Set<ChannelType>>(new Set());
  const [activeActions, setActiveActions] = useState<Record<string, string | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const chatViewRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const active = CONVERSATIONS.find((c) => c.id === selectedId) ?? CONVERSATIONS[0]!;
  const isSent = sentIds.has(active.id);
  const selectedIndex = CONVERSATIONS.findIndex((c) => c.id === selectedId);

  // Soft ambient floating backlight
  useGSAP(
    () => {
      if (reducedMotion) return;
      gsap.to('.hero-console-glow', {
        scale: 1.04,
        duration: 6,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
      });
    },
    { scope: containerRef, dependencies: [reducedMotion] }
  );

  // Subtle thread transition on conversation switch
  useEffect(() => {
    if (!chatViewRef.current || reducedMotion) return;
    gsap.fromTo(
      chatViewRef.current,
      { opacity: 0, y: 5 },
      { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' }
    );
  }, [selectedId, reducedMotion]);

  const handleSimulateNext = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
      const nextIndex = (selectedIndex + 1) % CONVERSATIONS.length;
      setSelectedId(CONVERSATIONS[nextIndex]!.id);
    }, 320);
  };

  const handleSendReply = () => {
    setSentIds((prev) => new Set(prev).add(active.id));
  };

  const handleResetSent = (id: ChannelType) => {
    setSentIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleAction = (action: string) => {
    setActiveActions((prev) => ({
      ...prev,
      [active.id]: prev[active.id] === action ? null : action,
    }));
  };

  return (
    <div
      ref={containerRef}
      className="relative pt-6 w-full max-w-[1320px] mx-auto select-none text-left"
    >
      <span className="sr-only">
        Interactive live preview of the aLcassa omnichannel tenant workspace with live customer conversation
        on {active.channelName} and rule-driven assistant resolution.
      </span>

      {/* Atmospheric Ambient Backlight */}
      <div
        className="hero-console-glow pointer-events-none absolute -inset-6 rounded-[36px] opacity-20 blur-3xl transition-colors duration-700"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${active.color} 0%, transparent 65%)`,
        }}
        aria-hidden="true"
      />

      {/* Master Workspace Console Frame */}
      <div className="relative z-10 overflow-hidden rounded-2xl sm:rounded-3xl border border-[var(--ink-200)] bg-[var(--ink-0)] shadow-[0_24px_70px_-18px_rgba(0,0,0,0.07)]">
        
        {/* Top Header Bar: Workspace Shell */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ink-100)] bg-[var(--ink-50)]/70 px-5 sm:px-6 py-3.5 backdrop-blur-md">
          {/* Brand & Workspace breadcrumbs */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-inherit no-underline hover:text-inherit"
              aria-label="aLcassa homepage"
            >
              <Mark size={28} />
              <span className="text-[13.5px] font-semibold tracking-tight text-[var(--text-primary)]">
                aLcassa
              </span>
            </Link>
            <span className="text-[var(--ink-300)]" aria-hidden="true">|</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">Acme Corp HQ</span>
              <span className="text-[var(--ink-300)]">·</span>
              <span className="text-[var(--text-tertiary)]">Unified Inbound</span>
            </div>
          </div>

          {/* Center: Search Bar with "Every channel, one inbox" placeholder */}
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-[var(--ink-200)]/80 bg-[var(--ink-0)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)] shadow-xs w-[280px] lg:w-[320px] transition-all focus-within:border-[var(--blue-500)] focus-within:ring-2 focus-within:ring-[var(--blue-500)]/15">
            <IconSearch size={14} className="text-[var(--text-tertiary)] shrink-0" aria-hidden="true" />
            <input
              type="text"
              placeholder="Every channel, one inbox"
              className="w-full bg-transparent text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none cursor-default"
              readOnly
              aria-label="Search inbox"
            />
            <kbd className="hidden lg:inline-flex items-center font-mono text-[9.5px] text-[var(--text-tertiary)] bg-[var(--ink-50)] border border-[var(--ink-200)]/80 px-1.5 py-0.5 rounded">
              ⌘K
            </kbd>
          </div>

          {/* Right: Production-Grade Dashboard Control Cluster */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* 1. Connected Channels Micro-Dock */}
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-[var(--surface-sunken)] border border-[var(--ink-200)]/80 py-1 pl-1.5 pr-2.5 shadow-2xs">
              <div className="flex -space-x-1.5 items-center">
                <span
                  className="grid size-5 place-items-center rounded-full bg-[#16a34a] text-white ring-2 ring-white shadow-xs"
                  title="WhatsApp connected"
                  aria-label="WhatsApp channel active"
                >
                  <IconBrandWhatsapp size={11} stroke={2.5} />
                </span>
                <span
                  className="grid size-5 place-items-center rounded-full bg-[#e11d48] text-white ring-2 ring-white shadow-xs"
                  title="Instagram connected"
                  aria-label="Instagram channel active"
                >
                  <IconBrandInstagram size={11} stroke={2.5} />
                </span>
                <span
                  className="grid size-5 place-items-center rounded-full bg-[#2563eb] text-white ring-2 ring-white shadow-xs"
                  title="Messenger connected"
                  aria-label="Messenger channel active"
                >
                  <IconBrandMessenger size={11} stroke={2.5} />
                </span>
                <span
                  className="grid size-5 place-items-center rounded-full bg-[#d97706] text-white ring-2 ring-white shadow-xs"
                  title="Webchat connected"
                  aria-label="Website chat channel active"
                >
                  <IconMessage size={11} stroke={2.5} />
                </span>
              </div>
              <span className="font-mono text-[10.5px] font-medium text-[var(--text-secondary)]">
                4 live
              </span>
            </div>

            {/* Subtle Divider */}
            <div className="h-4 w-px bg-[var(--ink-200)] hidden sm:block" aria-hidden="true" />

            {/* 3. Notification Activity Bell */}
            <button
              type="button"
              className="relative p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-sunken)] rounded-lg transition-colors cursor-pointer"
              aria-label="1 unread inbound notification"
            >
              <IconBell size={16} stroke={1.8} />
              <span className="absolute top-1 right-1 size-1.5 rounded-full bg-[var(--orange-500)] ring-1.5 ring-white" />
            </button>

            {/* 4. Active Tenant Operator Profile */}
            <div className="flex items-center gap-2 pl-0.5">
              <div className="relative">
                <div className="size-6 rounded-full overflow-hidden ring-1 ring-[var(--ink-200)] shadow-2xs">
                  <Image
                    src="/avatars/wanjiru.jpg"
                    alt="Operator Wanjiru Maina"
                    width={24}
                    height={24}
                    className="size-full object-cover"
                    unoptimized
                  />
                </div>
                <span className="absolute bottom-0 right-0 size-2 rounded-full bg-emerald-500 ring-[1.5px] ring-white" />
              </div>
              <span className="hidden xl:inline-block font-mono text-[11px] text-[var(--text-secondary)] font-medium">
                Wanjiru M.
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Main Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-[330px_1fr] divide-y md:divide-y-0 md:divide-x divide-[var(--ink-100)]">
          
          {/* Left Column: Clean Conversation List (No generic left border) */}
          <div className="bg-[var(--ink-50)]/30 p-3 sm:p-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-2 py-1 mb-1">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
                Recent Inbound
              </span>
              <span className="font-mono text-[10.5px] text-[var(--text-tertiary)]">
                {CONVERSATIONS.length} Active
              </span>
            </div>

            {CONVERSATIONS.map((item) => {
              const isSelected = item.id === selectedId;
              const Icon = item.icon;
              const sent = sentIds.has(item.id);

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  aria-pressed={isSelected}
                  aria-label={`Open conversation with ${item.senderName} on ${item.channelName}`}
                  className={`group relative flex items-start gap-3 rounded-2xl p-3 text-left transition-all duration-200 cursor-pointer min-h-[64px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)] ${
                    isSelected
                      ? 'bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] border border-[var(--ink-200)]/80 scale-[1.01]'
                      : 'hover:bg-white/60 border border-transparent'
                  }`}
                >
                  {/* Avatar with Channel Ring Indicator */}
                  <div className="relative shrink-0 mt-0.5">
                    <div
                      className={`relative size-11 rounded-full overflow-hidden transition-all duration-200 ${
                        isSelected
                          ? 'ring-2 ring-offset-2 shadow-xs'
                          : 'ring-1 ring-[var(--ink-200)]/60'
                      }`}
                      style={{
                        borderColor: item.color,
                        boxShadow: isSelected ? `0 0 0 2px ${item.color}` : undefined,
                      }}
                    >
                      <Image
                        src={item.avatarUrl}
                        alt={item.senderName}
                        width={44}
                        height={44}
                        className="size-full object-cover"
                        unoptimized
                      />
                    </div>
                    <span
                      className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-white text-white shadow-xs"
                      style={{ background: item.color }}
                    >
                      <Icon size={11} stroke={2.5} aria-hidden="true" />
                    </span>
                  </div>

                  {/* Customer & Message Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[13.5px] font-semibold text-[var(--text-primary)] truncate">
                        {item.senderName}
                      </span>
                      {isSelected ? (
                        <StatusBadge tone="success" variant="pill" size="sm">
                          Viewing
                        </StatusBadge>
                      ) : (
                        <span className="font-mono text-[10.5px] text-[var(--text-tertiary)] shrink-0">
                          {item.time}
                        </span>
                      )}
                    </div>

                    <p className="text-[12px] text-[var(--text-secondary)] truncate mt-0.5">
                      {sent ? (
                        <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
                          <IconCheck size={12} stroke={2.5} />
                          Resolved
                        </span>
                      ) : (
                        item.snippet
                      )}
                    </p>

                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] text-[var(--text-tertiary)] truncate">
                        {item.senderBusiness}
                      </span>
                      <StatusBadge
                        tone={getChannelTone(item.id)}
                        variant="squircle"
                        size="sm"
                      >
                        {item.channelName}
                      </StatusBadge>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Live Thread (De-boxed & spacious layout) */}
          <div
            ref={chatViewRef}
            className="p-5 sm:p-7 bg-[var(--ink-0)] flex flex-col justify-between min-h-[470px] text-left"
          >
            <div>
              {/* Thread Header: Contact Identity & Compliance */}
              <div className="flex items-center justify-between gap-3 pb-5 border-b border-[var(--ink-100)]">
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <div className="relative size-11 rounded-full overflow-hidden ring-1 ring-[var(--ink-200)] shadow-xs">
                      <Image
                        src={active.avatarUrl}
                        alt={active.senderName}
                        width={44}
                        height={44}
                        className="size-full object-cover"
                        unoptimized
                      />
                    </div>
                    <span
                      className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full text-white shadow-xs"
                      style={{ background: active.color }}
                    >
                      <active.icon size={11} stroke={2.5} aria-hidden="true" />
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-[15.5px] font-semibold text-[var(--text-primary)]">
                        {active.senderName}
                      </h4>
                    </div>
                    <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                      {active.senderRole} · {active.senderBusiness}
                    </p>
                  </div>
                </div>

                {/* Tenancy & Security Badge */}
                <StatusBadge
                  tone={getChannelTone(active.id)}
                  variant="pill"
                  size="md"
                >
                  {active.channelName}
                </StatusBadge>
              </div>

              {/* Message Feed Stream */}
              <div className="mt-6 flex flex-col gap-4">
                
                {/* 1. Customer Inbound Bubble (Clean, unboxed styling) */}
                <div className="self-start max-w-[82%]">
                  <div className="rounded-2xl rounded-tl-xs bg-[var(--surface-sunken)] p-4 text-[14px] text-left leading-relaxed text-[var(--text-primary)] shadow-xs">
                    <p>{active.fullMessage}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[10.5px] text-[var(--text-tertiary)] px-1">
                    <IconClock size={12} />
                    <span>{active.time}</span>
                    <span>·</span>
                    <span>Inbound via {active.channelName}</span>
                  </div>
                </div>

                {/* 2. Co-pilot Pre-Drafted Assistant Resolution */}
                {!isSent ? (
                  <div className="mt-2 rounded-2xl border border-[var(--ink-200)]/90 bg-[var(--ink-50)]/40 p-5 text-left transition-all">
                    {/* Header: Rule Matching & Latency */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--ink-100)] mb-3.5">
                      <div className="flex items-center gap-2 font-mono text-[11.5px] font-semibold text-[var(--text-primary)]">
                        <IconCpu size={14} className="text-[var(--orange-500)]" />
                        <span>AI Assistant Suggested Reply</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge tone="neutral" variant="squircle" size="sm">
                          {active.ruleTag}
                        </StatusBadge>
                        <StatusBadge tone="success" variant="squircle" size="sm">
                          ⚡ {active.ruleLatency}
                        </StatusBadge>
                      </div>
                    </div>

                    {/* Pre-drafted reply copy */}
                    <p className="text-[14px] text-left leading-relaxed text-[var(--text-primary)]">
                      {active.suggestedReply}
                    </p>

                    {/* Optional Attached Quick Action pill */}
                    {activeActions[active.id] && (
                      <div className="mt-3">
                        <StatusBadge tone="info" variant="pill" size="md" icon={IconCheck}>
                          Attached to dispatch: {activeActions[active.id]}
                        </StatusBadge>
                      </div>
                    )}

                    {/* Dispatch Button & Quick Actions */}
                    <div className="mt-4 pt-3.5 border-t border-[var(--ink-100)] flex flex-wrap items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={handleSendReply}
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--blue-500)] hover:bg-[var(--blue-600)] px-5 py-2 text-[13px] font-medium text-white transition-all shadow-sm hover:shadow-md cursor-pointer active:scale-95"
                      >
                        <IconSend size={14} aria-hidden="true" />
                        <span>Send this reply</span>
                      </button>

                      {/* Micro actions to attach */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono text-[10.5px] text-[var(--text-tertiary)] mr-1">
                          Attach:
                        </span>
                        {active.quickActions.map((action) => {
                          const isAttached = activeActions[active.id] === action;
                          return (
                            <button
                              key={action}
                              type="button"
                              onClick={() => toggleAction(action)}
                              className={`rounded-full px-3 py-1 text-[11.5px] font-medium transition-all cursor-pointer ${
                                isAttached
                                  ? 'bg-blue-100 text-[var(--blue-700)] border border-blue-300'
                                  : 'border border-[var(--ink-200)] bg-white text-[var(--text-secondary)] hover:bg-[var(--ink-50)]'
                              }`}
                            >
                              {action} {isAttached && '✓'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Outbound Dispatched Message Bubble */}
                    <div className="self-end max-w-[82%] animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="rounded-2xl rounded-tr-xs bg-[var(--blue-500)] p-4 text-[14px] text-left leading-relaxed text-white shadow-sm">
                        <p>{active.suggestedReply}</p>
                        {activeActions[active.id] && (
                          <div className="mt-2 pt-2 border-t border-white/20 text-[11.5px] font-mono text-white/90">
                            📎 {activeActions[active.id]}
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-end gap-1.5 font-mono text-[10.5px] text-[var(--text-tertiary)] px-1">
                        <span>Just now</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                          <IconCheck size={12} stroke={2.5} />
                          Dispatched via {active.channelName} Cloud API
                        </span>
                      </div>
                    </div>

                    {/* Single-line Resolved Status Banner */}
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-emerald-50/90 border border-emerald-200/80 px-4 py-2 text-[12.5px] text-emerald-800 animate-in fade-in duration-200">
                      <span className="flex items-center gap-2">
                        <IconCircleCheck size={15} className="text-emerald-600 shrink-0" />
                        <span>Thread resolved and logged to immutable audit stream</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetSent(active.id)}
                        className="text-[11.5px] font-medium text-emerald-700 hover:underline cursor-pointer"
                      >
                        Reset demo
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Bar: Guided Step Switcher */}
            <div className="mt-6 pt-4 border-t border-[var(--ink-100)] flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-tertiary)]">
                <span>Scenario {selectedIndex + 1} of {CONVERSATIONS.length}</span>
                <span>·</span>
                <span className="capitalize">{active.id}</span>
              </div>

              <button
                type="button"
                onClick={handleSimulateNext}
                disabled={isSimulating}
                className="group flex cursor-pointer items-center gap-2 rounded-full border border-[var(--ink-200)] bg-[var(--ink-0)] px-4 py-1.5 text-[12.5px] font-medium text-[var(--text-secondary)] transition-all hover:bg-[var(--ink-50)] hover:border-[var(--ink-300)] hover:text-[var(--text-primary)] min-h-[34px] disabled:opacity-60 shadow-xs"
              >
                <span>{isSimulating ? 'Switching…' : 'See next message'}</span>
                <IconArrowRight
                  size={14}
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}