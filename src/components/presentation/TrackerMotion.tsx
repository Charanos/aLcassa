'use client';

import { useEffect } from 'react';
import { EASE, EASE_SOFT, gsap, motionTokens, registerGsap, ScrollTrigger } from './motion';

/**
 * The motion layer for the project tracker.
 *
 * ⚠ THE GOVERNING RULE, LEARNED THE HARD WAY: CONTENT IS NEVER HIDDEN BY CSS
 * AND WAITING FOR SCRIPT TO REVEAL IT.
 *
 * The obvious implementation puts `opacity: 0` in the stylesheet and lets
 * ScrollTrigger bring things in. It demos well and it fails badly: a blocked
 * bundle, a CSP mistake, a trigger whose element was already past the fold on
 * load, or a refresh that kills a `once` trigger before it fires, and the
 * reader gets a page of headings with nothing underneath. That is exactly what
 * happened here, and on a page whose entire job is to be read it is the worst
 * possible failure.
 *
 * So:
 *
 *   1. Everything renders VISIBLE from the server.
 *   2. This effect hides only what is CURRENTLY BELOW THE FOLD, then animates
 *      it back in as it arrives. Anything already on screen is left alone.
 *   3. A watchdog runs a second later and restores anything still hidden, so
 *      even a bug in this file cannot cost the reader content.
 *
 * Under `prefers-reduced-motion` nothing is ever hidden in the first place.
 *
 * SCOPE. This module is imported by the tracker surface and nothing else.
 * `/app`, `/platform` and `/` keep the rule in 03 §7 that motion confirms and
 * never entertains, because those are screens seen a hundred times a day.
 */
export function TrackerMotion() {
  useEffect(() => {
    registerGsap();

    const { distance, duration, stagger } = motionTokens();

    const revealSelector = '[data-reveal]';

    /** The failsafe. Cheap, and it means no bug in here can blank the page. */
    const restoreEverything = () => {
      document.querySelectorAll<HTMLElement>(revealSelector).forEach((el) => {
        if (getComputedStyle(el).opacity !== '1') {
          gsap.set(el, { opacity: 1, y: 0, clearProps: 'willChange' });
        }
      });
      document.querySelectorAll<HTMLElement>('[data-progress-bar]').forEach((bar) => {
        if (!bar.style.width || bar.style.width === '0%') {
          bar.style.width = `${bar.dataset.value ?? '0'}%`;
        }
      });
    };

    const watchdog = window.setTimeout(restoreEverything, 2500);

    const mm = gsap.matchMedia();

    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const { motion } = context.conditions as { motion: boolean; reduced: boolean };

        if (!motion) {
          restoreEverything();
          document.querySelectorAll<HTMLElement>('[data-count]').forEach((node) => {
            node.textContent = node.dataset.count ?? node.textContent;
          });
          return;
        }

        const viewportHeight = window.innerHeight;

        // ── Hero. Runs on load, so it animates from a hidden state safely:
        //    `gsap.from` restores the element itself when it completes. ──────
        const heroTargets =
          '[data-hero-eyebrow], [data-hero-title], [data-hero-lede], [data-hero-fact], [data-hero-action]';
        if (document.querySelector(heroTargets)) {
          const hero = gsap.timeline({ defaults: { ease: EASE, duration } });
          hero
            .from('[data-hero-eyebrow]', { opacity: 0, x: -12 })
            .from('[data-hero-rule]', { scaleX: 0, transformOrigin: 'left center' }, '<')
            .from('[data-hero-title]', { opacity: 0, y: 26, duration: duration * 1.15 }, '-=0.55')
            .from('[data-hero-lede]', { opacity: 0, y: 16 }, '-=0.62')
            .from('[data-hero-fact]', { opacity: 0, y: 14, stagger: stagger * 1.4 }, '-=0.55')
            .from('[data-hero-action]', { opacity: 0, y: 12, stagger: stagger * 1.6 }, '-=0.5');
        }

        // ── Reveals. Only what is below the fold right now gets hidden. ────
        const groups = gsap.utils.toArray<HTMLElement>('[data-reveal-group]');

        groups.forEach((group) => {
          const items = gsap.utils.toArray<HTMLElement>(group.querySelectorAll(revealSelector));
          if (items.length === 0) return;

          const belowFold = items.filter(
            (item) => item.getBoundingClientRect().top > viewportHeight,
          );
          if (belowFold.length === 0) return;

          gsap.set(belowFold, { opacity: 0, y: distance });

          gsap.to(belowFold, {
            opacity: 1,
            y: 0,
            duration,
            ease: EASE,
            stagger,
            clearProps: 'willChange',
            scrollTrigger: { trigger: group, start: 'top 88%', once: true },
          });
        });

        const loners = gsap.utils
          .toArray<HTMLElement>(revealSelector)
          .filter((item) => !item.closest('[data-reveal-group]'));

        loners.forEach((item) => {
          if (item.getBoundingClientRect().top <= viewportHeight) return;

          gsap.set(item, { opacity: 0, y: distance });
          gsap.to(item, {
            opacity: 1,
            y: 0,
            duration,
            ease: EASE,
            clearProps: 'willChange',
            scrollTrigger: { trigger: item, start: 'top 90%', once: true },
          });
        });

        // ── Section rules draw out. Decoration only: a rule that never draws
        //    is a rule at full width, which is the correct resting state. ────
        gsap.utils.toArray<HTMLElement>('[data-draw-rule]').forEach((rule) => {
          if (rule.getBoundingClientRect().top > viewportHeight) {
            gsap.fromTo(
              rule,
              { scaleX: 0 },
              {
                scaleX: 1,
                transformOrigin: 'left center',
                duration: 1.1,
                ease: EASE_SOFT,
                scrollTrigger: { trigger: rule, start: 'top 94%', once: true },
              },
            );
          }
        });

        // ── Counters. The final value is already in the DOM from the server,
        //    so this animates from zero and lands back on the same number. ──
        gsap.utils.toArray<HTMLElement>('[data-count]').forEach((node) => {
          const target = Number(node.dataset.count ?? 0);
          if (!Number.isFinite(target)) return;

          const proxy = { value: 0 };
          gsap.to(proxy, {
            value: target,
            duration: 1.2,
            ease: EASE_SOFT,
            onUpdate: () => {
              node.textContent = String(Math.round(proxy.value));
            },
            onComplete: () => {
              node.textContent = String(target);
            },
            scrollTrigger: { trigger: node, start: 'top 92%', once: true },
          });
        });

        // ── Progress bars. Width is set here rather than in markup so the
        //    server does not have to know about the animation, but the
        //    watchdog fills them regardless. ────────────────────────────────
        gsap.utils.toArray<HTMLElement>('[data-progress-bar]').forEach((bar) => {
          const value = `${bar.dataset.value ?? '0'}%`;

          if (bar.getBoundingClientRect().top > viewportHeight) {
            gsap.fromTo(
              bar,
              { width: '0%' },
              {
                width: value,
                duration: 1.1,
                ease: EASE_SOFT,
                scrollTrigger: { trigger: bar, start: 'top 94%', once: true },
              },
            );
          } else {
            bar.style.width = value;
          }
        });

        // ── Reading progress in the header rule. ──────────────────────────
        const progress = document.querySelector<HTMLElement>('[data-read-progress]');
        if (progress) {
          gsap.fromTo(
            progress,
            { scaleX: 0 },
            {
              scaleX: 1,
              transformOrigin: 'left center',
              ease: 'none',
              scrollTrigger: {
                trigger: document.body,
                start: 'top top',
                end: 'bottom bottom',
                scrub: 0.3,
              },
            },
          );
        }

        // ── Active section in the header nav. ─────────────────────────────
        gsap.utils.toArray<HTMLElement>('[data-section]').forEach((section) => {
          const link = document.querySelector<HTMLElement>(`[data-nav-link="${section.id}"]`);
          if (!link) return;

          ScrollTrigger.create({
            trigger: section,
            start: 'top 55%',
            end: 'bottom 55%',
            onToggle: (self) => {
              link.dataset.active = self.isActive ? 'true' : 'false';
            },
          });
        });
      },
    );

    // Fonts land after first paint and change every measurement on the page.
    void document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      window.clearTimeout(watchdog);
      mm.revert();
      restoreEverything();
    };
  }, []);

  return null;
}
