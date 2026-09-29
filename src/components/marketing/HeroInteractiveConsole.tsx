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
  IconCpu,
  IconSearch,
  IconBell,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Mark } from '../brand/Mark';
import { StatusBadge, type StatusBadgeTone } from '@/components/primitives/StatusBadge';

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
    { scope: containerRef, dependencies: [reducedMotion] },
  );

  // Subtle thread transition on conversation switch
  useEffect(() => {
    if (!chatViewRef.current || reducedMotion) return;
    gsap.fromTo(
      chatViewRef.current,
      { opacity: 0, y: 5 },
      { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out' },
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
      className="relative mx-auto w-full max-w-[1320px] pt-6 text-left select-none"
    >
      <span className="sr-only">
        Interactive live preview of the aLcassa omnichannel tenant workspace with live customer
        conversation on {active.channelName} and rule-driven assistant resolution.
      </span>

      {/* Atmospheric Ambient Backlight */}
      <div
        className="hero-console-glow pointer-events-none absolute -inset-6 rounded-slab opacity-20 blur-3xl transition-colors duration-700"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${active.color} 0%, transparent 65%)`,
        }}
        aria-hidden="true"
      />

      {/* Master Workspace Console Frame */}
      <div className="relative z-10 overflow-hidden rounded-card border border-[var(--ink-200)] bg-[var(--ink-0)] shadow-[0_24px_70px_-18px_rgba(0,0,0,0.07)] sm:rounded-hero">
        {/* Top Header Bar: Workspace Shell */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ink-100)] bg-[var(--ink-50)]/70 px-5 py-3.5 backdrop-blur-md sm:px-6">
          {/* Brand & Workspace breadcrumbs */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-inherit no-underline hover:text-inherit"
              aria-label="aLcassa homepage"
            >
              <Mark size={28} />
              <span className="text-base font-medium tracking-tight text-[var(--text-primary)]">
                aLcassa
              </span>
            </Link>
            <span className="text-[var(--ink-300)]" aria-hidden="true">
              |
            </span>
            <div className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">Acme Corp HQ</span>
              <span className="text-[var(--ink-300)]">·</span>
              <span className="text-[var(--text-tertiary)]">Unified Inbound</span>
            </div>
          </div>

          {/* Center: Search Bar with "Every channel, one inbox" placeholder */}
          <div className="hidden w-[280px] items-center gap-2 rounded-overlay border border-[var(--ink-200)]/80 bg-[var(--ink-0)] px-3 py-1.5 text-sm text-[var(--text-secondary)] shadow-xs transition-all focus-within:border-[var(--blue-500)] focus-within:ring-2 focus-within:ring-[var(--blue-500)]/15 md:flex lg:w-[320px]">
            <IconSearch
              size={14}
              className="shrink-0 text-[var(--text-tertiary)]"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Every channel, one inbox"
              className="w-full cursor-default bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
              readOnly
              aria-label="Search inbox"
            />
            <kbd className="hidden items-center rounded border border-[var(--ink-200)]/80 bg-[var(--ink-50)] px-1.5 py-0.5 font-mono text-3xs text-[var(--text-tertiary)] lg:inline-flex">
              ⌘K
            </kbd>
          </div>

          {/* Right: Production-Grade Dashboard Control Cluster */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* 1. Connected Channels Micro-Dock */}
            <div className="hidden items-center gap-2 rounded-full border border-[var(--ink-200)]/80 bg-[var(--surface-sunken)] py-1 pr-2.5 pl-1.5 shadow-2xs sm:flex">
              <div className="flex items-center -space-x-1.5">
                <span
                  className="grid size-5 place-items-center rounded-full bg-[#16a34a] text-white shadow-xs ring-2 ring-white"
                  title="WhatsApp connected"
                  aria-label="WhatsApp channel active"
                >
                  <IconBrandWhatsapp size={11} stroke={2.5} />
                </span>
                <span
                  className="grid size-5 place-items-center rounded-full bg-[#e11d48] text-white shadow-xs ring-2 ring-white"
                  title="Instagram connected"
                  aria-label="Instagram channel active"
                >
                  <IconBrandInstagram size={11} stroke={2.5} />
                </span>
                <span
                  className="grid size-5 place-items-center rounded-full bg-[#2563eb] text-white shadow-xs ring-2 ring-white"
                  title="Messenger connected"
                  aria-label="Messenger channel active"
                >
                  <IconBrandMessenger size={11} stroke={2.5} />
                </span>
                <span
                  className="grid size-5 place-items-center rounded-full bg-[#d97706] text-white shadow-xs ring-2 ring-white"
                  title="Webchat connected"
                  aria-label="Website chat channel active"
                >
                  <IconMessage size={11} stroke={2.5} />
                </span>
              </div>
              <span className="font-mono text-2xs font-medium text-[var(--text-secondary)]">
                4 live
              </span>
            </div>

            {/* Subtle Divider */}
            <div className="hidden h-4 w-px bg-[var(--ink-200)] sm:block" aria-hidden="true" />

            {/* 3. Notification Activity Bell */}
            <button
              type="button"
              className="relative cursor-pointer rounded-overlay p-1.5 text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
              aria-label="1 unread inbound notification"
            >
              <IconBell size={16} stroke={1.8} />
              <span className="ring-1.5 absolute top-1 right-1 size-1.5 rounded-full bg-[var(--orange-500)] ring-white" />
            </button>

            {/* 4. Active Tenant Operator Profile */}
            <div className="flex items-center gap-2 pl-0.5">
              <div className="relative">
                <div className="size-6 overflow-hidden rounded-full shadow-2xs ring-1 ring-[var(--ink-200)]">
                  <Image
                    src="/avatars/wanjiru.jpg"
                    alt="Operator Wanjiru Maina"
                    width={24}
                    height={24}
                    className="size-full object-cover"
                    unoptimized
                  />
                </div>
                <span className="absolute right-0 bottom-0 size-2 rounded-full bg-emerald-500 ring-[1.5px] ring-white" />
              </div>
              <span className="hidden font-mono text-xs font-medium text-[var(--text-secondary)] xl:inline-block">
                Wanjiru M.
              </span>
            </div>
          </div>
        </div>

        {/* Two-Column Main Workspace */}
        <div className="grid grid-cols-1 divide-y divide-[var(--ink-100)] md:grid-cols-[330px_1fr] md:divide-x md:divide-y-0">
          {/* Left Column: Clean Conversation List (No generic left border) */}
          <div className="flex flex-col gap-1.5 bg-[var(--ink-50)]/30 p-3 sm:p-4">
            <div className="mb-1 flex items-center justify-between px-2 py-1">
              <span className="font-mono text-xs font-medium tracking-wider text-[var(--text-tertiary)] uppercase">
                Recent Inbound
              </span>
              <span className="font-mono text-2xs text-[var(--text-tertiary)]">
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
                  className={`group relative flex min-h-[64px] cursor-pointer items-start gap-3 rounded-card p-3 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)] ${
                    isSelected
                      ? 'scale-[1.01] border border-[var(--ink-200)]/80 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]'
                      : 'border border-transparent hover:bg-white/60'
                  }`}
                >
                  {/* Avatar with Channel Ring Indicator */}
                  <div className="relative mt-0.5 shrink-0">
                    <div
                      className={`relative size-11 overflow-hidden rounded-full transition-all duration-200 ${
                        isSelected
                          ? 'shadow-xs ring-2 ring-offset-2'
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
                      className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-white text-white shadow-xs"
                      style={{ background: item.color }}
                    >
                      <Icon size={11} stroke={2.5} aria-hidden="true" />
                    </span>
                  </div>

                  {/* Customer & Message Meta */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-base font-medium text-[var(--text-primary)]">
                        {item.senderName}
                      </span>
                      {isSelected ? (
                        <StatusBadge tone="success" variant="pill" size="sm">
                          Viewing
                        </StatusBadge>
                      ) : (
                        <span className="shrink-0 font-mono text-2xs text-[var(--text-tertiary)]">
                          {item.time}
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 truncate text-sm text-[var(--text-secondary)]">
                      {sent ? (
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                          <IconCheck size={12} stroke={2.5} />
                          Resolved
                        </span>
                      ) : (
                        item.snippet
                      )}
                    </p>

                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className="truncate font-mono text-2xs text-[var(--text-tertiary)]">
                        {item.senderBusiness}
                      </span>
                      <StatusBadge tone={getChannelTone(item.id)} variant="squircle" size="sm">
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
            className="flex min-h-[470px] flex-col justify-between bg-[var(--ink-0)] p-5 text-left sm:p-7"
          >
            <div>
              {/* Thread Header: Contact Identity & Compliance */}
              <div className="flex items-center justify-between gap-3 border-b border-[var(--ink-100)] pb-5">
                <div className="flex items-center gap-3.5">
                  <div className="relative shrink-0">
                    <div className="relative size-11 overflow-hidden rounded-full shadow-xs ring-1 ring-[var(--ink-200)]">
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
                      className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full text-white shadow-xs"
                      style={{ background: active.color }}
                    >
                      <active.icon size={11} stroke={2.5} aria-hidden="true" />
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-md font-medium text-[var(--text-primary)]">
                        {active.senderName}
                      </h4>
                    </div>
                    <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
                      {active.senderRole} · {active.senderBusiness}
                    </p>
                  </div>
                </div>

                {/* Tenancy & Security Badge */}
                <StatusBadge tone={getChannelTone(active.id)} variant="pill" size="md">
                  {active.channelName}
                </StatusBadge>
              </div>

              {/* Message Feed Stream */}
              <div className="mt-6 flex flex-col gap-4">
                {/* 1. Customer Inbound Bubble (Clean, unboxed styling) */}
                <div className="max-w-[82%] self-start">
                  <div className="rounded-card rounded-tl-bar bg-[var(--surface-sunken)] p-4 text-left text-base leading-relaxed text-[var(--text-primary)] shadow-xs">
                    <p>{active.fullMessage}</p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 px-1 font-mono text-2xs text-[var(--text-tertiary)]">
                    <IconClock size={12} />
                    <span>{active.time}</span>
                    <span>·</span>
                    <span>Inbound via {active.channelName}</span>
                  </div>
                </div>

                {/* 2. Co-pilot Pre-Drafted Assistant Resolution */}
                {!isSent ? (
                  <div className="mt-2 rounded-card border border-[var(--ink-200)]/90 bg-[var(--ink-50)]/40 p-5 text-left transition-all">
                    {/* Header: Rule Matching & Latency */}
                    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ink-100)] pb-3">
                      <div className="flex items-center gap-2 font-mono text-sm font-medium text-[var(--text-primary)]">
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
                    <p className="text-left text-base leading-relaxed text-[var(--text-primary)]">
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
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ink-100)] pt-3.5">
                      <button
                        type="button"
                        onClick={handleSendReply}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[var(--blue-500)] px-5 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-[var(--blue-600)] hover:shadow-md active:scale-95"
                      >
                        <IconSend size={14} aria-hidden="true" />
                        <span>Send this reply</span>
                      </button>

                      {/* Micro actions to attach */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="mr-1 font-mono text-2xs text-[var(--text-tertiary)]">
                          Attach:
                        </span>
                        {active.quickActions.map((action) => {
                          const isAttached = activeActions[active.id] === action;
                          return (
                            <button
                              key={action}
                              type="button"
                              onClick={() => toggleAction(action)}
                              className={`cursor-pointer rounded-full px-3 py-1 text-sm font-medium transition-all ${
                                isAttached
                                  ? 'border border-blue-300 bg-blue-100 text-[var(--blue-700)]'
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
                    <div
                      className="max-w-[82%] self-end"
                      /* tailwindcss-animate is not installed in this project, so the
             animate-in/fade-in/slide-in-* utilities were inert — this
             arrived with no transition at all. globals.css already defines
             the keyframes below, and its reduced-motion block covers them. */
                      style={{ animation: 'panel-in var(--duration-slow) var(--ease-out)' }}
                    >
                      <div className="rounded-card rounded-tr-bar bg-[var(--blue-500)] p-4 text-left text-base leading-relaxed text-white shadow-sm">
                        <p>{active.suggestedReply}</p>
                        {activeActions[active.id] && (
                          <div className="mt-2 border-t border-white/20 pt-2 font-mono text-sm text-white/90">
                            📎 {activeActions[active.id]}
                          </div>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-end gap-1.5 px-1 font-mono text-2xs text-[var(--text-tertiary)]">
                        <span>Just now</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-medium text-emerald-600">
                          <IconCheck size={12} stroke={2.5} />
                          Dispatched via {active.channelName} Cloud API
                        </span>
                      </div>
                    </div>

                    {/* Single-line Resolved Status Banner */}
                    <div
                      className="mt-2 flex items-center justify-between rounded-overlay border border-emerald-200/80 bg-emerald-50/90 px-4 py-2 text-sm text-emerald-800"
                      style={{ animation: 'overlay-in var(--duration-base) var(--ease-standard)' }}
                    >
                      <span className="flex items-center gap-2">
                        <IconCircleCheck size={15} className="shrink-0 text-emerald-600" />
                        <span>Thread resolved and logged to immutable audit stream</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleResetSent(active.id)}
                        className="cursor-pointer text-sm font-medium text-emerald-700 hover:underline"
                      >
                        Reset demo
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bottom Bar: Guided Step Switcher */}
            <div className="mt-6 flex items-center justify-between border-t border-[var(--ink-100)] pt-4">
              <div className="flex items-center gap-1.5 font-mono text-xs text-[var(--text-tertiary)]">
                <span>
                  Scenario {selectedIndex + 1} of {CONVERSATIONS.length}
                </span>
                <span>·</span>
                <span className="capitalize">{active.id}</span>
              </div>

              <button
                type="button"
                onClick={handleSimulateNext}
                disabled={isSimulating}
                className="group flex min-h-[34px] cursor-pointer items-center gap-2 rounded-full border border-[var(--ink-200)] bg-[var(--ink-0)] px-4 py-1.5 text-sm font-medium text-[var(--text-secondary)] shadow-xs transition-all hover:border-[var(--ink-300)] hover:bg-[var(--ink-50)] hover:text-[var(--text-primary)] disabled:opacity-60"
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
