'use client';

import {
  IconBrandWhatsappFilled,
  IconBrandInstagram,
  IconBrandMessengerFilled,
  IconMessageCircle,
  IconLock,
  IconActivity,
  IconKey,
  IconServerCog,
} from '@tabler/icons-react';
import type { Icon as TablerIcon } from '@tabler/icons-react';
import React from 'react';
import { IconTile } from '@/components/primitives/IconTile';

/** Decorative product illustration, excluded from assistive navigation. */
export function AuthIllustration() {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative mx-16 aspect-[5/3] w-full max-w-[900px] select-none"
    >
      <div className="pointer-events-none absolute top-[50%] left-[50%] h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--blue-500)]/5 blur-[120px]" />

      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMid meet"
        style={{ zIndex: 0 }}
      >
        <defs>
          <linearGradient id="flow-wa" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#25D366" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="flow-ig" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E1306C" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="flow-ms" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00B2FF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="flow-web" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="flow-out" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#94A3B8" stopOpacity="0.1" />
          </linearGradient>

          <filter id="orb-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g strokeWidth="1" fill="none" opacity="0.2">
          <path id="path-wa" d="M 200 120 C 280 120, 290 300, 370 300" stroke="#94A3B8" />
          <path id="path-ig" d="M 200 240 C 280 240, 290 300, 370 300" stroke="#94A3B8" />
          <path id="path-ms" d="M 200 360 C 280 360, 290 300, 370 300" stroke="#94A3B8" />
          <path id="path-web" d="M 200 480 C 280 480, 290 300, 370 300" stroke="#94A3B8" />

          <path id="path-out-1" d="M 630 300 C 710 300, 690 210, 770 210" stroke="#94A3B8" />
          <path id="path-out-2" d="M 630 300 C 710 300, 690 390, 770 390" stroke="#94A3B8" />
        </g>

        <g strokeWidth="1.5" fill="none" opacity="0.6">
          <path d="M 200 120 C 280 120, 290 300, 370 300" stroke="url(#flow-wa)" />
          <path d="M 200 240 C 280 240, 290 300, 370 300" stroke="url(#flow-ig)" />
          <path d="M 200 360 C 280 360, 290 300, 370 300" stroke="url(#flow-ms)" />
          <path d="M 200 480 C 280 480, 290 300, 370 300" stroke="url(#flow-web)" />
          <path d="M 630 300 C 710 300, 690 210, 770 210" stroke="url(#flow-out)" />
          <path d="M 630 300 C 710 300, 690 390, 770 390" stroke="url(#flow-out)" />
        </g>

        <g filter="url(#orb-glow)">
          <circle r="3" fill="#25D366">
            <animateMotion
              dur="4s"
              repeatCount="indefinite"
              path="M 200 120 C 280 120, 290 300, 370 300"
            />
          </circle>
          <circle r="3" fill="#E1306C">
            <animateMotion
              dur="4s"
              begin="1s"
              repeatCount="indefinite"
              path="M 200 240 C 280 240, 290 300, 370 300"
            />
          </circle>
          <circle r="3" fill="#00B2FF">
            <animateMotion
              dur="4s"
              begin="2s"
              repeatCount="indefinite"
              path="M 200 360 C 280 360, 290 300, 370 300"
            />
          </circle>
          <circle r="3" fill="#F59E0B">
            <animateMotion
              dur="4s"
              begin="3s"
              repeatCount="indefinite"
              path="M 200 480 C 280 480, 290 300, 370 300"
            />
          </circle>

          <circle r="3.5" fill="#3B82F6">
            <animateMotion
              dur="3s"
              begin="0.5s"
              repeatCount="indefinite"
              path="M 630 300 C 710 300, 690 210, 770 210"
            />
          </circle>
          <circle r="3.5" fill="#3B82F6">
            <animateMotion
              dur="3s"
              begin="2s"
              repeatCount="indefinite"
              path="M 630 300 C 710 300, 690 390, 770 390"
            />
          </circle>
        </g>
      </svg>

      <div className="absolute inset-0 h-full w-full" style={{ zIndex: 10 }}>
        <div className="absolute top-[20%] left-[5%] w-[150px] -translate-y-1/2">
          <ChannelCard title="WhatsApp" icon={IconBrandWhatsappFilled} brand="#25D366" />
        </div>
        <div className="absolute top-[40%] left-[5%] w-[150px] -translate-y-1/2">
          <ChannelCard title="Instagram" icon={IconBrandInstagram} brand="#E1306C" />
        </div>
        <div className="absolute top-[60%] left-[5%] w-[150px] -translate-y-1/2">
          <ChannelCard title="Messenger" icon={IconBrandMessengerFilled} brand="#00B2FF" />
        </div>
        <div className="absolute top-[80%] left-[5%] w-[150px] -translate-y-1/2">
          <ChannelCard title="Web Chat" icon={IconMessageCircle} brand="var(--amber-500)" />
        </div>

        <div className="absolute top-[50%] left-[50%] w-[240px] -translate-x-1/2 -translate-y-1/2">
          <div className="relative rounded-overlay bg-[#0A0F1A] p-3.5 text-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/10 backdrop-blur-3xl transition-transform duration-700 hover:scale-[1.02]">
            <div className="pointer-events-none absolute inset-0 rounded-overlay bg-gradient-to-b from-white/[0.04] to-transparent" />

            <div className="relative mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-overlay bg-[linear-gradient(135deg,#3B82F6_0%,#1D4ED8_100%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] ring-1 ring-[#0A0F1A]">
                  <IconLock size={16} stroke={2} className="text-white drop-shadow-sm" />
                </div>
                <div>
                  <span className="mb-1 block font-sans text-sm leading-none font-medium tracking-tight whitespace-nowrap text-white">
                    Your Workspace
                  </span>
                  <span className="block font-sans text-xs leading-none font-medium tracking-tight whitespace-nowrap text-[var(--blue-200)]/50">
                    Enterprise Console
                  </span>
                </div>
              </div>
              <IconServerCog size={16} stroke={1.5} className="shrink-0 text-white/20" />
            </div>

            <div className="relative mb-3 h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="relative">
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-3xs font-medium tracking-[0.15em] whitespace-nowrap text-white/50 uppercase">
                  Workspace boundary
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute top-[35%] right-[5%] w-[180px] -translate-y-1/2">
          <FeatureCard
            title="Assistant Rules"
            subtitle="Workspace guidance"
            icon={IconActivity}
            tone="danger"
          />
        </div>

        <div className="absolute top-[65%] right-[5%] w-[180px] -translate-y-1/2">
          <FeatureCard
            title="API Credentials"
            subtitle="Coming next"
            icon={IconKey}
            tone="warning"
          />
        </div>
      </div>
    </div>
  );
}

function ChannelCard({
  title,
  icon,
  brand,
}: {
  title: string;
  icon: TablerIcon;

  brand: string;
}) {
  return (
    <div
      className="group flex w-full items-center gap-3.5 rounded-card p-2.5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{
        background: 'color-mix(in oklab, var(--surface-raised) 80%, transparent)',
        boxShadow: 'var(--shadow-sm), inset 0 0 0 1px var(--border-subtle)',
      }}
    >
      <IconTile
        icon={icon}
        glyphColor={brand}
        size="lg"
        className="transition-transform duration-300 group-hover:scale-105 group-hover:rotate-2 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-hover:rotate-0"
      />
      <div
        className="text-sm tracking-tight"
        style={{ color: 'var(--text-primary)', fontWeight: 500 }}
      >
        {title}
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  subtitle,
  icon,
  tone,
}: {
  title: string;
  subtitle: string;
  icon: TablerIcon;
  tone: 'danger' | 'warning';
}) {
  return (
    <div
      className="flex w-full items-start gap-3 rounded-card p-3.5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{
        background: 'color-mix(in oklab, var(--surface-raised) 80%, transparent)',
        boxShadow: 'var(--shadow-sm), inset 0 0 0 1px var(--border-subtle)',
      }}
    >
      <IconTile icon={icon} tone={tone} size="lg" className="mt-0.5" />
      <div>
        <div
          className="mb-1 font-mono text-3xs leading-tight tracking-[0.1em] uppercase"
          style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}
        >
          {title}
        </div>
        <div
          className="text-sm leading-snug"
          style={{ color: 'var(--text-secondary)', fontWeight: 500 }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}
