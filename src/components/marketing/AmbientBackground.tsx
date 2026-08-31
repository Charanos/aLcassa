'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export function AmbientBackground() {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.to('.orb-1', {
      x: 'random(-40, 40)',
      y: 'random(-40, 40)',
      duration: 8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    gsap.to('.orb-2', {
      x: 'random(-60, 60)',
      y: 'random(-60, 60)',
      duration: 10,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 1
    });
  }, { scope: container });

  return (
    <div ref={container} className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[780px] w-full overflow-hidden" aria-hidden="true">
      <div
        className="orb-1 absolute top-8 -left-20 size-[620px] rounded-full opacity-35 blur-3xl"
        style={{
          background: 'radial-gradient(circle, color-mix(in oklab, var(--ink-600) 25%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        className="orb-2 absolute top-8 right-0 size-[680px] rounded-full opacity-30 blur-3xl"
        style={{
          background: 'radial-gradient(circle, color-mix(in oklab, var(--orange-400) 25%, transparent) 0%, transparent 70%)',
        }}
      />
    </div>
  );
}
