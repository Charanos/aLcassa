'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

/**
 * Staggered entrance for the overview's sections.
 *
 * ⚠ THIS EXISTS BECAUSE THE PREVIOUS ARRANGEMENT SILENTLY DID NOTHING.
 * `DashboardHero` ran `gsap.fromTo('.gsap-reveal', …)` scoped to its own
 * container, while two sections further down the page also carried
 * `.gsap-reveal`. A scoped selector only matches inside the scope element, and
 * the class had no CSS rule anywhere, so those two sections were never
 * animated and never hidden — they simply painted, and the class read as
 * intent that the code did not carry out.
 *
 * One wrapper owns the animation now. It animates its own direct
 * `[data-reveal]` descendants, so a section opts in by carrying the attribute
 * and the stagger order is document order — no coordination between
 * components, and nothing to keep in sync when a section is added.
 *
 * ⚠ THE INITIAL STATE IS SET BY GSAP, NOT BY CSS. `fromTo` writes opacity 0
 * in the same frame it starts the tween, which means a reader with JavaScript
 * disabled — or a hydration that never arrives — sees the content at full
 * opacity rather than a permanently blank page. A CSS `opacity: 0` default
 * would fail closed in exactly the wrong direction.
 */
export function Reveal({ children }: { children: React.ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // 13 §2. Honour the OS setting rather than animating and hoping. GSAP's
      // matchMedia cleans up its own tweens when the query flips.
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '[data-reveal]',
          { y: 18, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.55,
            stagger: 0.08,
            ease: 'power3.out',
            clearProps: 'transform',
          },
        );
      });

      return () => mm.revert();
    },
    { scope },
  );

  return (
    <div ref={scope} className="grid gap-5">
      {children}
    </div>
  );
}
