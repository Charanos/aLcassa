'use client';

import { useRef } from 'react';
import { IconBrandWhatsapp, IconMessage, IconServer2 } from '@tabler/icons-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export function SubtleArchitecturalBackground() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Ultra-slow, peaceful ambient atmospheric drift
      gsap.to('.ambient-orb-1', {
        x: 'random(-25, 25)',
        y: 'random(-20, 20)',
        duration: 14,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      gsap.to('.ambient-orb-2', {
        x: 'random(-30, 30)',
        y: 'random(-25, 25)',
        duration: 16,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: 1,
      });
    },
    { scope: container },
  );

  return (
    <div
      ref={container}
      className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[960px] w-full overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* ── Soft atmospheric ambient light ── */}
      <div
        className="ambient-orb-1 absolute top-6 left-1/4 size-[650px] -translate-x-1/2 rounded-full opacity-[0.20] blur-[120px]"
        style={{
          background: 'radial-gradient(circle, var(--ink-400) 0%, transparent 70%)',
        }}
      />
      <div
        className="ambient-orb-2 absolute top-12 right-1/4 size-[700px] translate-x-1/2 rounded-full opacity-[0.15] blur-[130px]"
        style={{
          background: 'radial-gradient(circle, var(--orange-400) 0%, transparent 70%)',
        }}
      />

      {/* ── Giant Architectural Watermark Iconography (Integrated & Layered) ── */}
      <div className="absolute -top-10 -left-20 hidden -rotate-12 text-[var(--ink-400)] opacity-[0.045] lg:block">
        <IconServer2 size={380} stroke={0.85} />
      </div>
      <div className="absolute top-[6%] -right-24 hidden rotate-12 text-[var(--ink-400)] opacity-[0.045] md:block">
        <IconMessage size={480} stroke={0.85} />
      </div>
      <div className="absolute top-[53%] -left-16 hidden -rotate-[8deg] text-[var(--ink-400)] opacity-[0.04] md:block">
        <IconBrandWhatsapp size={450} stroke={0.85} />
      </div>

      {/* ── Soft Architectural Engineering Curves Texture ── */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.035] transition-opacity"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <defs>
          <linearGradient id="arch-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--ink-900)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--ink-400)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="arch-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="var(--orange-500)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="var(--ink-900)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M -100 120 C 300 240, 800 -40, 1400 160 C 1800 280, 2100 80, 2400 220"
          stroke="url(#arch-grad-1)"
          strokeWidth="1.2"
        />
        <path
          d="M -100 240 C 350 380, 750 40, 1350 280 C 1750 400, 2050 160, 2400 340"
          stroke="url(#arch-grad-1)"
          strokeWidth="0.9"
        />
        <path
          d="M -100 380 C 400 520, 700 120, 1300 400 C 1700 520, 2000 260, 2400 460"
          stroke="url(#arch-grad-2)"
          strokeWidth="0.85"
        />

        <ellipse
          cx="12%"
          cy="30%"
          rx="440"
          ry="240"
          stroke="url(#arch-grad-1)"
          strokeWidth="0.75"
        />
        <ellipse
          cx="88%"
          cy="20%"
          rx="500"
          ry="280"
          stroke="url(#arch-grad-2)"
          strokeWidth="0.75"
        />
      </svg>
    </div>
  );
}
