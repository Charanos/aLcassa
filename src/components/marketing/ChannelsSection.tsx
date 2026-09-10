'use client';

import { useState, useEffect, useRef } from 'react';
import {
  IconBrandWhatsapp,
  IconBrandInstagram,
  IconBrandMessenger,
  IconMessage,
  IconCheck,
  IconX,
  IconLock,
  IconClock,
  IconEye,
  IconArrowRight,
  IconPlayerPlay,
  IconPlayerPause,
  IconShieldLock,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

/* ---------------------------------------------------------------------- */
/*  Content & Data Model (100% Preserved Revamped Type)                  */
/* ---------------------------------------------------------------------- */

interface Bubble {
  from: 'customer' | 'reply';
  text: string;
  time: string;
}

interface ChannelItem {
  id: 'whatsapp' | 'instagram' | 'messenger' | 'webchat';
  name: string;
  handle: string;
  icon: TablerIcon;
  accentHex: string;
  accentSoft: string;
  oneLiner: string;
  bullets: string[];
  thread: Bubble[];
  note: string;
}

const CHANNELS: ChannelItem[] = [
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    handle: 'Kwanza Logistics',
    icon: IconBrandWhatsapp,
    accentHex: '#16a34a',
    accentSoft: '#dcfce7',
    oneLiner: 'Your busiest channel, handled the way customers already expect.',
    bullets: [
      'Delivery updates and invoices sent the moment they matter',
      'Photos, PDFs, and voice notes come through same as always',
      'After hours, urgent messages still reach someone',
    ],
    thread: [
      {
        from: 'customer',
        text: 'Habari, any update on when container batch KW-902 clears for our Westlands delivery?',
        time: '11:42',
      },
      {
        from: 'reply',
        text: 'Habari Japheth! Batch KW-902 cleared Mtito Andei at 11:20am. Should reach the warehouse by 4:30pm today.',
        time: '11:42',
      },
    ],
    note: 'Answered in 4 seconds, straight from the tracking system — no one had to go look it up.',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    handle: 'Studio Savanna',
    icon: IconBrandInstagram,
    accentHex: '#e11d48',
    accentSoft: '#ffe4e6',
    oneLiner: 'Turn story replies and DMs into actual bookings.',
    bullets: [
      'Story mentions and comment replies land in the same inbox',
      'Booking requests get matched to real open slots',
      'Nothing sits unread in a personal account overnight',
    ],
    thread: [
      {
        from: 'customer',
        text: 'Loved the bridal lookbook on your story! Any slots for a private fitting this Saturday?',
        time: '12:05',
      },
      {
        from: 'reply',
        text: 'Hi Amina! We have 2pm and 4:30pm open this Saturday in Kilimani. Want me to hold 2pm for you?',
        time: '12:05',
      },
    ],
    note: 'Checked the real booking calendar before replying, so the slot is actually free.',
  },
  {
    id: 'messenger',
    name: 'Messenger',
    handle: 'PayPulse Africa',
    icon: IconBrandMessenger,
    accentHex: '#2563eb',
    accentSoft: '#dbeafe',
    oneLiner: 'One inbox for every page you run, not five separate logins.',
    bullets: [
      'All your business pages come into one shared view',
      'Serious leads get flagged so they don’t wait in line',
      'New contacts save straight into your customer list',
    ],
    thread: [
      {
        from: 'customer',
        text: 'Hi, our engineering team is reviewing your API access. Could we get a walkthrough today?',
        time: '13:15',
      },
      {
        from: 'reply',
        text: 'Hi Kevin, happy to help. I’ve booked you a 20-minute session with our technical lead today at 3pm.',
        time: '13:15',
      },
    ],
    note: 'Flagged as a serious lead and handed straight to the right person.',
  },
  {
    id: 'webchat',
    name: 'Website chat',
    handle: 'AfyaCare Diagnostics',
    icon: IconMessage,
    accentHex: '#d97706',
    accentSoft: '#fef3c7',
    oneLiner: 'A chat bubble for your site that loads instantly and stays put.',
    bullets: [
      'Loads in a blink — visitors never wait on it',
      'Remembers a conversation even if someone closes the tab',
      'Looks and sounds like your business, not a generic bot',
    ],
    thread: [
      {
        from: 'customer',
        text: 'Is patient data from this chat kept separate from your other clients’ data?',
        time: '14:30',
      },
      {
        from: 'reply',
        text: 'Good afternoon Dr. Chebet — yes. Your data is fully separated from every other business on the platform, always.',
        time: '14:30',
      },
    ],
    note: 'A question worth taking seriously — answered plainly, no hedging.',
  },
];

/* ---------------------------------------------------------------------- */
/*  Component: Unified Inverted Channels & Security Hub                   */
/* ---------------------------------------------------------------------- */

export function ChannelsSection() {
  const [activeId, setActiveId] = useState<ChannelItem['id']>('whatsapp');
  const active = CHANNELS.find((c) => c.id === activeId) ?? CHANNELS[0]!;

  const [typedIn, setTypedIn] = useState(false);
  useEffect(() => {
    setTypedIn(false);
    const t = setTimeout(() => setTypedIn(true), 120);
    return () => clearTimeout(t);
  }, [activeId]);

  // Support Session Permit Countdown State
  const SESSION_LENGTH = 30 * 60;
  const [secondsLeft, setSecondsLeft] = useState(SESSION_LENGTH - 366); // ~23:54 remaining
  const [granted, setGranted] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!granted) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [granted]);

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className="w-full">
      {/* ── Right-Aligned Section Header (Alternating Cadence) ── */}
      <div className="flex flex-col items-end text-right max-w-3xl ml-auto mb-10 sm:mb-14">
        <div className="inline-flex items-center gap-2 mb-2.5">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-wider text-[var(--orange-500)]">
            Getting in touch
          </p>
          <span className="size-2 rounded-full bg-[var(--orange-500)]" aria-hidden="true" />
        </div>
        <h2 className="display text-[32px] sm:text-[44px] font-normal tracking-tight text-[var(--text-primary)] leading-[1.12]">
          Customers message you everywhere. You answer from one place.
        </h2>
        <p className="text-[16px] sm:text-[17px] text-[var(--text-secondary)] mt-3.5 leading-relaxed">
          WhatsApp, Instagram, Messenger, your website — every conversation lands in a single
          inbox, answered fast, without anyone digging for the right information.
        </p>
      </div>

      {/* ── UNIFIED INVERTED SECTION (Deep Slate Canvas with Atmospheric Depth) ── */}
      <div
        className="relative overflow-hidden rounded-[36px] border transition-all text-left"
        style={{
          background: 'linear-gradient(180deg, #0d121c 0%, #080c14 100%)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          color: '#F9FAFB',
          boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          className="absolute -top-32 left-1/4 w-[600px] h-[350px] bg-blue-600/10 blur-[130px] pointer-events-none rounded-full"
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-32 right-1/4 w-[600px] h-[350px] bg-amber-600/10 blur-[130px] pointer-events-none rounded-full"
          aria-hidden="true"
        />

        {/* ================================================================= */}
        {/* TIER 1: Omnichannel Inbound Command Stage                         */}
        {/* ================================================================= */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left 7 Cols: Phone-Style Real Customer Thread Card (Airy, Spacious & Beautiful) */}
            <div className="lg:col-span-7 order-2 lg:order-1 flex justify-center lg:justify-start">
              <div className="w-full max-w-[590px]">
                <div
                  className="rounded-[30px] p-6 sm:p-8 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)] transition-all"
                  style={{
                    background: '#FFFFFF',
                    color: 'var(--text-primary)',
                  }}
                >
                  {/* Thread Header */}
                  <div className="flex items-center justify-between gap-3 pb-5 mb-5 border-b border-[var(--ink-100)]">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="size-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs border border-black/5"
                        style={{ backgroundColor: active.accentSoft }}
                      >
                        <active.icon size={22} stroke={1.8} style={{ color: active.accentHex }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[16px] font-semibold text-[var(--text-primary)] truncate">
                            {active.handle}
                          </span>
                          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
                        </div>
                        <span className="font-mono text-[11px] text-[var(--text-tertiary)] block mt-0.5">
                          Verified Business Channel · via {active.name}
                        </span>
                      </div>
                    </div>

                    <StatusBadge
                      tone="success"
                      variant="pill"
                      size="md"
                      icon={IconCheck}
                    >
                      Answered
                    </StatusBadge>
                  </div>

                  {/* Context Timeline Divider */}
                  <div className="flex items-center justify-center my-3">
                    <StatusBadge tone="neutral" variant="pill" size="sm">
                      Today · 11:40 AM
                    </StatusBadge>
                  </div>

                  {/* Message Bubbles Stream (Unrestricted, Airy, Natural Left-Aligned Flow) */}
                  <div className="space-y-4 min-h-[200px] flex flex-col justify-center py-2">
                    {active.thread.map((bubble, i) => {
                      const isCustomer = bubble.from === 'customer';
                      return (
                        <div
                          key={i}
                          className={`flex ${isCustomer ? 'justify-start' : 'justify-end'} motion-safe:transition-all motion-safe:duration-500`}
                          style={{
                            opacity: typedIn ? 1 : 0,
                            transform: typedIn ? 'translateY(0)' : 'translateY(6px)',
                            transitionDelay: `${i * 160}ms`,
                          }}
                        >
                          {/* Chat Bubble Container with Explicit Left Alignment for Internal Content */}
                          <div className={`max-w-[90%] sm:max-w-[85%] text-left`}>
                            <div
                              className="px-5 py-3.5 text-[14.5px] leading-[1.55] shadow-xs text-left"
                              style={
                                isCustomer
                                  ? {
                                      background: 'var(--surface-sunken)',
                                      color: 'var(--text-primary)',
                                      borderRadius: '20px 20px 20px 4px',
                                      border: '1px solid var(--ink-200)',
                                    }
                                  : {
                                      background: active.accentHex,
                                      color: '#FFFFFF',
                                      borderRadius: '20px 20px 4px 20px',
                                      boxShadow: `0 4px 16px ${active.accentHex}44`,
                                    }
                              }
                            >
                              <p className="text-left m-0">{bubble.text}</p>
                            </div>
                            <div
                              className={`flex items-center gap-1.5 font-mono text-[11px] text-[var(--text-tertiary)] mt-1.5 px-2 ${
                                isCustomer ? 'justify-start' : 'justify-end'
                              }`}
                            >
                              <span>{bubble.time}</span>
                              {!isCustomer && (
                                <span className="text-emerald-600 font-medium">✓✓ Automated reply</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Resolution Footnote */}
                  <div className="mt-5 pt-4 border-t border-[var(--ink-100)] flex items-center justify-between gap-3 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                        <IconCheck size={12} stroke={2.5} />
                      </div>
                      <span className="truncate sm:whitespace-normal font-normal">{active.note}</span>
                    </div>
                    <StatusBadge tone="success" variant="squircle" size="sm">
                      ⚡ 4s latency
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Interactive Channel Selector & Guarantees */}
            <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col justify-between space-y-6">
              <div className="flex flex-col gap-2.5">
                {CHANNELS.map((channel) => {
                  const isActive = channel.id === activeId;
                  const Icon = channel.icon;
                  return (
                    <button
                      key={channel.id}
                      type="button"
                      onClick={() => setActiveId(channel.id)}
                      aria-pressed={isActive}
                      aria-label={`Show ${channel.name} example conversation`}
                      className={`group flex items-center gap-4 rounded-2xl px-4.5 py-3.5 text-left transition-all duration-200 cursor-pointer min-h-[62px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                        isActive
                          ? 'bg-white/[0.12] border border-white/25 shadow-xl scale-[1.01]'
                          : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/15'
                      }`}
                    >
                      <div
                        className="size-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200"
                        style={{
                          backgroundColor: isActive ? channel.accentHex : 'rgba(255, 255, 255, 0.08)',
                          boxShadow: isActive ? `0 0 18px ${channel.accentHex}77` : 'none',
                        }}
                      >
                        <Icon
                          size={21}
                          stroke={1.8}
                          style={{ color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.65)' }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <span
                          className="text-[15.5px] font-medium block transition-colors"
                          style={{ color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.75)' }}
                        >
                          {channel.name}
                        </span>
                        {isActive && (
                          <span className="text-[13px] text-white/65 block mt-0.5 leading-snug">
                            {channel.oneLiner}
                          </span>
                        )}
                      </div>

                      <IconArrowRight
                        size={17}
                        aria-hidden="true"
                        className="shrink-0 transition-all duration-200"
                        style={{
                          opacity: isActive ? 0.9 : 0,
                          transform: isActive ? 'translateX(0)' : 'translateX(-4px)',
                          color: '#fff',
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Active Channel Bullets */}
              <div className="pt-6 border-t border-white/10 space-y-3.5">
                {active.bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="size-5 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0 mt-0.5">
                      <IconCheck size={12} stroke={2.5} className="text-emerald-400" aria-hidden="true" />
                    </div>
                    <span className="text-[14px] text-white/80 leading-relaxed">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* ── Architectural Separator between Omnichannel & Security Permit ── */}
        <div className="relative z-10 border-t border-white/10 mx-6 sm:mx-10 lg:mx-28" />

        {/* ================================================================= */}
        {/* TIER 2: Trust & Ephemeral Support Permit Stage                    */}
        {/* ================================================================= */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            
            {/* Left 5 Cols: Editorial Security Guarantees */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <h3 className="display text-[28px] sm:text-[36px] font-normal tracking-tight text-white mt-1 leading-[1.15]">
                  If someone on our team ever opens your account, you’ll know.
                </h3>
                <p className="text-[15px] sm:text-[16px] text-white/75 mt-3.5 leading-relaxed">
                  Nobody at Alcassa has a master key to every business on the platform. When our
                  support team needs to help with your account, they request access to yours
                  specifically. It’s time-limited, it’s read-only, and it shows up in your activity
                  log the moment it happens.
                </p>
              </div>

              {/* 3 Core Security Invariants */}
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-start gap-3.5">
                  <div className="size-10 rounded-2xl flex items-center justify-center shrink-0 bg-white/[0.07] border border-white/10 text-white mt-0.5 shadow-xs">
                    <IconLock size={18} stroke={1.75} aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-[14.5px] font-medium text-white">No shared master password</h4>
                    <p className="text-[13px] text-white/65 mt-0.5 leading-relaxed">
                      Every visit uses a fresh, one-time key tied to one person and one account. Nothing reused, nothing shared.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="size-10 rounded-2xl flex items-center justify-center shrink-0 bg-white/[0.07] border border-white/10 text-white mt-0.5 shadow-xs">
                    <IconClock size={18} stroke={1.75} aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-[14.5px] font-medium text-white">Access expires on its own</h4>
                    <p className="text-[13px] text-white/65 mt-0.5 leading-relaxed">
                      Thirty minutes, then it’s gone — or you can end it yourself, right now, from this screen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="size-10 rounded-2xl flex items-center justify-center shrink-0 bg-white/[0.07] border border-white/10 text-white mt-0.5 shadow-xs">
                    <IconEye size={18} stroke={1.75} aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-[14.5px] font-medium text-white">Every visit is on the record</h4>
                    <p className="text-[13px] text-white/65 mt-0.5 leading-relaxed">
                      Who looked, when, and why — written to your account’s history and impossible to quietly edit out.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center gap-2 font-mono text-[11px] text-white/50">
                <IconShieldLock size={15} className="text-emerald-400" />
                <span>Handled under Kenya’s Data Protection Act, 2019.</span>
              </div>
            </div>

            {/* Right 7 Cols: The Interactive "Support Permit" Canvas */}
            <div className="lg:col-span-7 flex justify-center lg:justify-end">
              <div className="w-full max-w-[590px]">
                <div
                  className="rounded-[30px] p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)] transition-all space-y-6"
                  style={{
                    background: '#FFFFFF',
                    color: 'var(--text-primary)',
                  }}
                >
                  {/* Permit Header */}
                  <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-[var(--ink-100)]">
                    <div>
                      <span className="font-mono text-[11px] text-[var(--text-tertiary)] block">
                        This is what you’d see right now, in your own dashboard
                      </span>
                      <h4 className="text-[18px] font-semibold text-[var(--text-primary)] mt-1">
                        Support access to Kwanza Logistics
                      </h4>
                    </div>
                    <StatusBadge
                      tone={granted ? 'success' : 'neutral'}
                      variant="pill"
                      dot
                      pulse={granted}
                      size="md"
                    >
                      {granted ? 'Currently open' : 'Closed'}
                    </StatusBadge>
                  </div>

                  {/* Who + Why Meta Grid */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-[var(--surface-sunken)]/70 border border-[var(--ink-200)]/60">
                    <div>
                      <span className="font-mono text-[11px] text-[var(--text-tertiary)] block">Opened by</span>
                      <span className="text-[14px] font-medium text-[var(--text-primary)] block mt-0.5">
                        Wanjiru, Support
                      </span>
                    </div>
                    <div>
                      <span className="font-mono text-[11px] text-[var(--text-tertiary)] block">Reason given</span>
                      <span className="text-[14px] font-medium text-[var(--text-primary)] block mt-0.5">
                        Ticket #4829, invoice question
                      </span>
                    </div>
                  </div>

                  {/* Live Countdown Clock Bar */}
                  <div
                    className="flex items-center justify-between rounded-2xl p-4.5 transition-colors border"
                    style={{
                      background: granted ? '#fff7ed' : 'var(--surface-sunken)',
                      borderColor: granted ? 'rgba(249, 115, 22, 0.2)' : 'var(--ink-200)',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconClock
                        size={19}
                        className={granted ? 'text-[var(--orange-500)]' : 'text-[var(--text-tertiary)]'}
                        aria-hidden="true"
                      />
                      <span className="text-[14px] font-medium text-[var(--text-primary)]">
                        {granted ? 'Closes automatically in' : 'Access closed'}
                      </span>
                    </div>
                    <span
                      className="font-mono font-semibold text-[22px] tracking-tight tabular-nums"
                      style={{ color: granted ? 'var(--orange-500)' : 'var(--text-tertiary)' }}
                      aria-hidden="true"
                    >
                      {granted ? `${mm}:${ss}` : '00:00'}
                    </span>
                  </div>

                  {/* Interactive Revoke/Start Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (granted) {
                        setGranted(false);
                      } else {
                        setGranted(true);
                        setSecondsLeft(SESSION_LENGTH);
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-full py-3.5 min-h-[48px] text-[14px] font-medium transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)]"
                    style={
                      granted
                        ? { background: 'var(--text-primary)', color: '#fff' }
                        : { background: 'var(--blue-500)', color: '#fff' }
                    }
                  >
                    {granted ? (
                      <>
                        <IconPlayerPause size={17} aria-hidden="true" />
                        <span>End this session now</span>
                      </>
                    ) : (
                      <>
                        <IconPlayerPlay size={17} aria-hidden="true" />
                        <span>Start a new session</span>
                      </>
                    )}
                  </button>

                  {/* Permission Scope Checklist */}
                  <div className="pt-4 border-t border-[var(--ink-100)]">
                    <span className="font-mono text-[11px] text-[var(--text-tertiary)] block mb-2.5 uppercase tracking-wider">
                      What this lets them see
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: 'View this account only', ok: true },
                        { label: 'Read-only, no edits', ok: true },
                        { label: 'Other businesses on the platform', ok: false },
                        { label: 'Anything after it expires', ok: false },
                      ].map((item, i) => (
                        <StatusBadge
                          key={i}
                          tone={item.ok ? 'success' : 'neutral'}
                          variant="pill"
                          size="md"
                          icon={item.ok ? IconCheck : IconX}
                        >
                          {item.label}
                        </StatusBadge>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}