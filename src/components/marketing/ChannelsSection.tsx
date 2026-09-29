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
import { StatusBadge } from '@/components/primitives/StatusBadge';

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

  const mm = Math.floor(secondsLeft / 60)
    .toString()
    .padStart(2, '0');
  const ss = (secondsLeft % 60).toString().padStart(2, '0');

  return (
    <div className="w-full">
      {/* ── Right-Aligned Section Header (Alternating Cadence) ── */}
      <div className="mb-10 ml-auto flex max-w-3xl flex-col items-end text-right sm:mb-14">
        <div className="mb-2.5 inline-flex items-center gap-2">
          <p className="font-mono text-xs font-medium tracking-wider text-[var(--orange-500)] uppercase">
            Getting in touch
          </p>
          <span className="size-2 rounded-full bg-[var(--orange-500)]" aria-hidden="true" />
        </div>
        <h2 className="display text-2xl leading-[1.12] font-normal tracking-tight text-[var(--text-primary)] sm:text-3xl">
          Customers message you everywhere. You answer from one place.
        </h2>
        <p className="mt-3.5 text-md leading-relaxed text-[var(--text-secondary)] sm:text-md">
          WhatsApp, Instagram, Messenger, your website — every conversation lands in a single inbox,
          answered fast, without anyone digging for the right information.
        </p>
      </div>

      {/* ── UNIFIED INVERTED SECTION (Deep Slate Canvas with Atmospheric Depth) ── */}
      <div
        className="relative overflow-hidden rounded-slab border text-left transition-all"
        style={{
          background: 'linear-gradient(180deg, #0d121c 0%, #080c14 100%)',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          color: '#F9FAFB',
          boxShadow: '0 30px 80px -20px rgba(0, 0, 0, 0.65)',
        }}
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          className="pointer-events-none absolute -top-32 left-1/4 h-[350px] w-[600px] rounded-full bg-blue-600/10 blur-[130px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute right-1/4 -bottom-32 h-[350px] w-[600px] rounded-full bg-amber-600/10 blur-[130px]"
          aria-hidden="true"
        />

        {/* ================================================================= */}
        {/* TIER 1: Omnichannel Inbound Command Stage                         */}
        {/* ================================================================= */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-14">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Left 7 Cols: Phone-Style Real Customer Thread Card (Airy, Spacious & Beautiful) */}
            <div className="order-2 flex justify-center lg:order-1 lg:col-span-7 lg:justify-start">
              <div className="w-full max-w-[590px]">
                <div
                  className="rounded-slab p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)] transition-all sm:p-8"
                  style={{
                    background: '#FFFFFF',
                    color: 'var(--text-primary)',
                  }}
                >
                  {/* Thread Header */}
                  <div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--ink-100)] pb-5">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-card border border-black/5 shadow-xs"
                        style={{ backgroundColor: active.accentSoft }}
                      >
                        <active.icon size={22} stroke={1.8} style={{ color: active.accentHex }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-md font-medium text-[var(--text-primary)]">
                            {active.handle}
                          </span>
                          <span
                            className="size-2 animate-pulse rounded-full bg-emerald-500"
                            aria-hidden="true"
                          />
                        </div>
                        <span className="mt-0.5 block font-mono text-xs text-[var(--text-tertiary)]">
                          Verified Business Channel · via {active.name}
                        </span>
                      </div>
                    </div>

                    <StatusBadge tone="success" variant="pill" size="md" icon={IconCheck}>
                      Answered
                    </StatusBadge>
                  </div>

                  {/* Context Timeline Divider */}
                  <div className="my-3 flex items-center justify-center">
                    <StatusBadge tone="neutral" variant="pill" size="sm">
                      Today · 11:40 AM
                    </StatusBadge>
                  </div>

                  {/* Message Bubbles Stream (Unrestricted, Airy, Natural Left-Aligned Flow) */}
                  <div className="flex min-h-[200px] flex-col justify-center space-y-4 py-2">
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
                          <div className={`max-w-[90%] text-left sm:max-w-[85%]`}>
                            <div
                              className="px-5 py-3.5 text-left text-base leading-[1.55] shadow-xs"
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
                              <p className="m-0 text-left">{bubble.text}</p>
                            </div>
                            <div
                              className={`mt-1.5 flex items-center gap-1.5 px-2 font-mono text-xs text-[var(--text-tertiary)] ${
                                isCustomer ? 'justify-start' : 'justify-end'
                              }`}
                            >
                              <span>{bubble.time}</span>
                              {!isCustomer && (
                                <span className="font-medium text-emerald-600">
                                  ✓✓ Automated reply
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Resolution Footnote */}
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--ink-100)] pt-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600">
                        <IconCheck size={12} stroke={2.5} />
                      </div>
                      <span className="truncate font-normal sm:whitespace-normal">
                        {active.note}
                      </span>
                    </div>
                    <StatusBadge tone="success" variant="squircle" size="sm">
                      ⚡ 4s latency
                    </StatusBadge>
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Cols: Interactive Channel Selector & Guarantees */}
            <div className="order-1 flex flex-col justify-between space-y-6 lg:order-2 lg:col-span-5">
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
                      className={`group flex min-h-[62px] cursor-pointer items-center gap-4 rounded-card px-4.5 py-3.5 text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60 ${
                        isActive
                          ? 'scale-[1.01] border border-white/25 bg-white/[0.12] shadow-xl'
                          : 'border border-white/[0.06] bg-white/[0.03] hover:border-white/15 hover:bg-white/[0.07]'
                      }`}
                    >
                      <div
                        className="flex size-11 shrink-0 items-center justify-center rounded-overlay transition-all duration-200"
                        style={{
                          backgroundColor: isActive
                            ? channel.accentHex
                            : 'rgba(255, 255, 255, 0.08)',
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
                          className="block text-md font-medium transition-colors"
                          style={{ color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.75)' }}
                        >
                          {channel.name}
                        </span>
                        {isActive && (
                          <span className="mt-0.5 block text-sm leading-snug text-white/65">
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
              <div className="space-y-3.5 border-t border-white/10 pt-6">
                {active.bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15">
                      <IconCheck
                        size={12}
                        stroke={2.5}
                        className="text-emerald-400"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-base leading-relaxed text-white/80">{bullet}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Architectural Separator between Omnichannel & Security Permit ── */}
        <div className="relative z-10 mx-6 border-t border-white/10 sm:mx-10 lg:mx-28" />

        {/* ================================================================= */}
        {/* TIER 2: Trust & Ephemeral Support Permit Stage                    */}
        {/* ================================================================= */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-14">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-14">
            {/* Left 5 Cols: Editorial Security Guarantees */}
            <div className="space-y-6 lg:col-span-5">
              <div>
                <h3 className="display mt-1 text-xl leading-[1.15] font-normal tracking-tight text-white sm:text-2xl">
                  If someone on our team ever opens your account, you’ll know.
                </h3>
                <p className="mt-3.5 text-md leading-relaxed text-white/75 sm:text-md">
                  Nobody at Alcassa has a master key to every business on the platform. When our
                  support team needs to help with your account, they request access to yours
                  specifically. It’s time-limited, it’s read-only, and it shows up in your activity
                  log the moment it happens.
                </p>
              </div>

              {/* 3 Core Security Invariants */}
              <div className="space-y-4 border-t border-white/10 pt-4">
                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-card border border-white/10 bg-white/[0.07] text-white shadow-xs">
                    <IconLock size={18} stroke={1.75} aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-white">No shared master password</h4>
                    <p className="mt-0.5 text-sm leading-relaxed text-white/65">
                      Every visit uses a fresh, one-time key tied to one person and one account.
                      Nothing reused, nothing shared.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-card border border-white/10 bg-white/[0.07] text-white shadow-xs">
                    <IconClock size={18} stroke={1.75} aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-white">Access expires on its own</h4>
                    <p className="mt-0.5 text-sm leading-relaxed text-white/65">
                      Thirty minutes, then it’s gone — or you can end it yourself, right now, from
                      this screen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-card border border-white/10 bg-white/[0.07] text-white shadow-xs">
                    <IconEye size={18} stroke={1.75} aria-hidden="true" />
                  </div>
                  <div>
                    <h4 className="text-base font-medium text-white">
                      Every visit is on the record
                    </h4>
                    <p className="mt-0.5 text-sm leading-relaxed text-white/65">
                      Who looked, when, and why — written to your account’s history and impossible
                      to quietly edit out.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-white/10 pt-4 font-mono text-xs text-white/50">
                <IconShieldLock size={15} className="text-emerald-400" />
                <span>Handled under Kenya’s Data Protection Act, 2019.</span>
              </div>
            </div>

            {/* Right 7 Cols: The Interactive "Support Permit" Canvas */}
            <div className="flex justify-center lg:col-span-7 lg:justify-end">
              <div className="w-full max-w-[590px]">
                <div
                  className="space-y-6 rounded-slab p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.1)] transition-all sm:p-9"
                  style={{
                    background: '#FFFFFF',
                    color: 'var(--text-primary)',
                  }}
                >
                  {/* Permit Header */}
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--ink-100)] pb-4">
                    <div>
                      <span className="block font-mono text-xs text-[var(--text-tertiary)]">
                        This is what you’d see right now, in your own dashboard
                      </span>
                      <h4 className="mt-1 text-lg font-medium text-[var(--text-primary)]">
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
                  <div className="grid grid-cols-2 gap-4 rounded-card border border-[var(--ink-200)]/60 bg-[var(--surface-sunken)]/70 p-4">
                    <div>
                      <span className="block font-mono text-xs text-[var(--text-tertiary)]">
                        Opened by
                      </span>
                      <span className="mt-0.5 block text-base font-medium text-[var(--text-primary)]">
                        Wanjiru, Support
                      </span>
                    </div>
                    <div>
                      <span className="block font-mono text-xs text-[var(--text-tertiary)]">
                        Reason given
                      </span>
                      <span className="mt-0.5 block text-base font-medium text-[var(--text-primary)]">
                        Ticket #4829, invoice question
                      </span>
                    </div>
                  </div>

                  {/* Live Countdown Clock Bar */}
                  <div
                    className="flex items-center justify-between rounded-card border p-4.5 transition-colors"
                    style={{
                      background: granted ? '#fff7ed' : 'var(--surface-sunken)',
                      borderColor: granted ? 'rgba(249, 115, 22, 0.2)' : 'var(--ink-200)',
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconClock
                        size={19}
                        className={
                          granted ? 'text-[var(--orange-500)]' : 'text-[var(--text-tertiary)]'
                        }
                        aria-hidden="true"
                      />
                      <span className="text-base font-medium text-[var(--text-primary)]">
                        {granted ? 'Closes automatically in' : 'Access closed'}
                      </span>
                    </div>
                    <span
                      className="font-mono text-xl font-medium tracking-tight tabular-nums"
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
                    className="flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3.5 text-base font-medium shadow-sm transition-all hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue-500)] active:scale-[0.99]"
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
                  <div className="border-t border-[var(--ink-100)] pt-4">
                    <span className="mb-2.5 block font-mono text-xs tracking-wider text-[var(--text-tertiary)] uppercase">
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
