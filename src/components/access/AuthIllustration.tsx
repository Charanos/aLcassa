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

export function AuthIllustration() {
  return (
    /*
     * ⚠ `aria-hidden` — IT WAS MISSING, AND THAT IS NOT A DETAIL HERE.
     *
     * Everything inside is a drawing OF an interface: channel names, a fake
     * workspace card, "LIVE & ISOLATED", "Shown once". Without this, a screen
     * reader announces all of it as page content immediately after "Sign in to
     * your workspace" — roughly twenty words of decoration between the heading
     * and the email field, on the screen where someone is trying to get in.
     * It is already `pointer-events-none` and `select-none`; this completes
     * the same statement for the accessibility tree.
     *
     * The type sizes inside are deliberately left off the UI scale for the
     * same reason — at this size they are marks in a drawing, not typography
     * a reader is expected to parse.
     *
     * No alt text replaces it, deliberately. It illustrates what the product
     * does, which the marketing site says in prose; the sign-in page's content
     * is the form.
     */
    <div
      aria-hidden
      className="relative w-full max-w-[900px] aspect-[5/3] mx-16 select-none pointer-events-none"
    >
      
      {/* ── Subtle Ambient Lighting ── */}
      <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--blue-500)]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* ── Precision SVG Connection Lines (1000x600 Grid) ── */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" style={{ zIndex: 0 }}>
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

        {/* Base Structural Tracks */}
        <g strokeWidth="1" fill="none" opacity="0.2">
          <path id="path-wa" d="M 200 120 C 280 120, 290 300, 370 300" stroke="#94A3B8" />
          <path id="path-ig" d="M 200 240 C 280 240, 290 300, 370 300" stroke="#94A3B8" />
          <path id="path-ms" d="M 200 360 C 280 360, 290 300, 370 300" stroke="#94A3B8" />
          <path id="path-web" d="M 200 480 C 280 480, 290 300, 370 300" stroke="#94A3B8" />
          
          <path id="path-out-1" d="M 630 300 C 710 300, 690 210, 770 210" stroke="#94A3B8" />
          <path id="path-out-2" d="M 630 300 C 710 300, 690 390, 770 390" stroke="#94A3B8" />
        </g>

        {/* Gradient overlays for the tracks */}
        <g strokeWidth="1.5" fill="none" opacity="0.6">
          <path d="M 200 120 C 280 120, 290 300, 370 300" stroke="url(#flow-wa)" />
          <path d="M 200 240 C 280 240, 290 300, 370 300" stroke="url(#flow-ig)" />
          <path d="M 200 360 C 280 360, 290 300, 370 300" stroke="url(#flow-ms)" />
          <path d="M 200 480 C 280 480, 290 300, 370 300" stroke="url(#flow-web)" />
          <path d="M 630 300 C 710 300, 690 210, 770 210" stroke="url(#flow-out)" />
          <path d="M 630 300 C 710 300, 690 390, 770 390" stroke="url(#flow-out)" />
        </g>

        {/* Animated Data Orbs */}
        <g filter="url(#orb-glow)">
          <circle r="3" fill="#25D366">
            <animateMotion dur="4s" repeatCount="indefinite" path="M 200 120 C 280 120, 290 300, 370 300" />
          </circle>
          <circle r="3" fill="#E1306C">
            <animateMotion dur="4s" begin="1s" repeatCount="indefinite" path="M 200 240 C 280 240, 290 300, 370 300" />
          </circle>
          <circle r="3" fill="#00B2FF">
            <animateMotion dur="4s" begin="2s" repeatCount="indefinite" path="M 200 360 C 280 360, 290 300, 370 300" />
          </circle>
          <circle r="3" fill="#F59E0B">
            <animateMotion dur="4s" begin="3s" repeatCount="indefinite" path="M 200 480 C 280 480, 290 300, 370 300" />
          </circle>
          
          <circle r="3.5" fill="#3B82F6">
            <animateMotion dur="3s" begin="0.5s" repeatCount="indefinite" path="M 630 300 C 710 300, 690 210, 770 210" />
          </circle>
          <circle r="3.5" fill="#3B82F6">
            <animateMotion dur="3s" begin="2s" repeatCount="indefinite" path="M 630 300 C 710 300, 690 390, 770 390" />
          </circle>
        </g>
      </svg>

      {/* ── Absolute HTML Nodes (Coordinates matched to 1000x600 SVG) ── */}
      <div className="absolute inset-0 h-full w-full" style={{ zIndex: 10 }}>
        
        {/* INBOUND CHANNELS (Left) */}
        {/* Placed precisely at left 5% (50px on 1000px width), with 150px width -> Ends at 200px */}
        <div className="absolute top-[20%] left-[5%] -translate-y-1/2 w-[150px]">
          <ChannelCard title="WhatsApp" icon={IconBrandWhatsappFilled} brand="#25D366" />
        </div>
        <div className="absolute top-[40%] left-[5%] -translate-y-1/2 w-[150px]">
          <ChannelCard title="Instagram" icon={IconBrandInstagram} brand="#E1306C" />
        </div>
        <div className="absolute top-[60%] left-[5%] -translate-y-1/2 w-[150px]">
          <ChannelCard title="Messenger" icon={IconBrandMessengerFilled} brand="#00B2FF" />
        </div>
        <div className="absolute top-[80%] left-[5%] -translate-y-1/2 w-[150px]">
          <ChannelCard title="Web Chat" icon={IconMessageCircle} brand="var(--amber-500)" />
        </div>

        {/* WORKSPACE HUB (Center) */}
        {/* Sleek, horizontally-proportioned card. Center left is at 500px, width 240px -> 380px to 620px */}
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[240px]">
          <div className="relative rounded-xl bg-[#0A0F1A] p-3.5 text-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.05)] ring-1 ring-white/10 backdrop-blur-3xl transition-transform hover:scale-[1.02] duration-700">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
            
            <div className="relative flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* Sleek, minimal icon box */}
                <div className="flex items-center justify-center size-9 shrink-0 rounded-lg bg-[linear-gradient(135deg,#3B82F6_0%,#1D4ED8_100%)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)] ring-1 ring-[#0A0F1A]">
                  <IconLock size={16} stroke={2} className="text-white drop-shadow-sm" />
                </div>
                <div>
                  <span className="block font-sans text-[13px] font-medium tracking-tight text-white leading-none mb-1 whitespace-nowrap">Your Workspace</span>
                  <span className="block font-sans text-[11px] text-[var(--blue-200)]/50 tracking-tight font-medium leading-none whitespace-nowrap">Enterprise Console</span>
                </div>
              </div>
              <IconServerCog size={16} stroke={1.5} className="text-white/20 shrink-0" />
            </div>
            
            {/* Extremely subtle divider */}
            <div className="relative h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3" />

            <div className="relative">
              <div className="flex items-center justify-center gap-2">
                <div className="relative flex items-center justify-center size-2">
                  <span className="absolute inset-[-2px] rounded-full bg-[var(--success-fg)]/40 animate-pulse"></span>
                  <span className="absolute size-1.5 rounded-full bg-[var(--success-fg)]"></span>
                </div>
                <span className="font-mono text-[9.5px] font-medium tracking-[0.15em] uppercase text-[var(--success-fg)]/90 whitespace-nowrap">Live & Isolated</span>
              </div>
            </div>
          </div>
        </div>

        {/* OUTBOUND FEATURES (Right) */}
        {/* Placed precisely at right 5% (50px on 1000px width), with 180px width -> Left edge is 770px */}
        <div className="absolute top-[35%] right-[5%] -translate-y-1/2 w-[180px]">
          <FeatureCard title="Assistant Rules" subtitle="Live in under 5s" icon={IconActivity} tone="danger" />
        </div>

        <div className="absolute top-[65%] right-[5%] -translate-y-1/2 w-[180px]">
          <FeatureCard title="API Credentials" subtitle="Shown once" icon={IconKey} tone="warning" />
        </div>

      </div>
    </div>
  );
}

/**
 * ⚠ THE ICON BOX IN BOTH CARDS IS NOW `IconTile`, AND IT WAS HAND-ROLLED TWICE
 * HERE BEFORE IT WAS HAND-ROLLED TWICE ON THE SIGN-IN PAGES.
 *
 * Four inline copies of the same idea — a rounded square holding a glyph, lifted
 * off the surface — and all four had drifted: `p-2.5` here, `p-2` below,
 * `size-8 rounded-xl` on one sign-in page, `size-6 rounded-md` on the other.
 * None of them could be reused because none of them was a component.
 *
 * The tile is the right treatment for exactly what these cards hold: a CHANNEL
 * and a CAPABILITY are objects, not statuses, which is the distinction
 * `IconTile` exists to keep. So the illustration, the two sign-in doors and the
 * profile's device list now draw the same tile, which is what makes the demo
 * doors look like they belong to this product rather than to that one screen.
 *
 * ⚠ THE BRAND MARKS KEEP THEIR OWN COLOUR, via `glyphColor`. WhatsApp's green is
 * not a decision this product gets to make — 03 §2 exempts brand marks for that
 * reason. The two FEATURE tiles take a `tone` instead, because a key and an
 * activity trace are semantic and belong inside the token system.
 */
function ChannelCard({
  title,
  icon,
  brand,
}: {
  title: string;
  icon: TablerIcon;
  /** The channel's own mark colour. A brand value, not a palette choice. */
  brand: string;
}) {
  return (
    <div
      className="group flex w-full items-center gap-3.5 rounded-[1.125rem] p-2.5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
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
        className="text-[13px] tracking-tight"
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
      className="flex w-full items-start gap-3 rounded-[1.125rem] p-3.5 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{
        background: 'color-mix(in oklab, var(--surface-raised) 80%, transparent)',
        boxShadow: 'var(--shadow-sm), inset 0 0 0 1px var(--border-subtle)',
      }}
    >
      {/* The wash ties the tile to the glyph. Before, a coloured icon floated in
          a white box, so the colour read as decoration rather than as meaning. */}
      <IconTile icon={icon} tone={tone} size="lg" className="mt-0.5" />
      <div>
        <div
          className="mb-1 font-mono text-[9px] leading-tight tracking-[0.1em] uppercase"
          style={{ color: 'var(--text-tertiary)', fontWeight: 500 }}
        >
          {title}
        </div>
        <div
          className="text-[12px] leading-snug"
          style={{ color: 'var(--text-secondary)', fontWeight: 500 }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
}