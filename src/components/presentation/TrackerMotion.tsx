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
 * reader gets a page of headings with nothing underneath.
 *
 * So:
 *
 *   1. Everything renders VISIBLE from the server.
 *   2. This effect hides only what is CURRENTLY BELOW THE FOLD, then animates
 *      it back in as it arrives. Anything already on screen is left alone.
 *   3. A watchdog runs a second later and restores anything still hidden, so
 *      even a bug in this file cannot cost the reader content.
 *
 * ⚠ EACH SECTION BELOW IS ITS OWN TRY/CATCH, AND THAT IS NOT DEFENSIVE
 * PADDING. A single `forEach` over every group, with no isolation, means one
 * throwing iteration (a plugin that failed to load, a browser API absent on
 * an older device) aborts the loop entirely: whatever it had already hidden
 * via `gsap.set` stays hidden forever, because the matching `gsap.to` that
 * would have revealed it, and the ScrollTrigger that would have fired it,
 * never got registered. Wrapping each group's hide-then-reveal as one atomic
 * unit means a failure there restores exactly what it hid, immediately, and
 * moves on to the next group rather than taking the rest of the page with it.
 * This is the fix for a real production failure, not a hypothetical one:
 * everything past the hero going blank on a page whose per-group hiding had
 * no isolation is exactly this failure mode.
 *
 * Under `prefers-reduced-motion` nothing is ever hidden in the first place.
 *
 * SCOPE. This module is imported by the tracker surface and nothing else.
 * `/app`, `/platform` and `/` keep the rule in 03 §7 that motion confirms and
 * never entertains, because those are screens seen a hundred times a day.
 */
export function TrackerMotion() {
  useEffect(() => {
    const revealSelector = '[data-reveal]';

    // ⚠ THIS LIST IS THE ACTUAL BUG, FOUND LIVE ON THE DEPLOYED SITE.
    //
    // Every attribute `.from()` or `.set()` is ever asked to animate FROM a
    // hidden state has to be covered here, and the hero's own attributes
    // (`data-hero-*`) were not. Live inspection of the production deployment
    // showed exactly this: the hero's staggered `.from()` on `[data-hero-fact]`
    // started, reached opacity 1 for the first two items, and then FROZE the
    // remaining four at opacity 0 with no exception thrown anywhere, which is
    // why the try/catch around the hero block did nothing to catch it. The
    // most likely trigger is a font-swap reflow landing mid-stagger: the
    // self-hosted Libertinus faces load after first paint, which on a cold
    // production cache can shift layout while GSAP is mid-animation in a way
    // a warm dev cache never reproduces. The watchdog is the correct tool for
    // a stall with no exception; it simply was not watching this selector.
    const hiddenByGsapSelector = [
      revealSelector,
      '[data-hero-eyebrow]',
      '[data-hero-title]',
      '[data-hero-lede]',
      '[data-hero-fact]',
      '[data-hero-action]',
    ].join(', ');

    /** The failsafe. Cheap, and it means no bug in here can blank the page. */
    const restoreEverything = () => {
      document.querySelectorAll<HTMLElement>(hiddenByGsapSelector).forEach((el) => {
        if (getComputedStyle(el).opacity !== '1') {
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      });
      // Unconditional rather than checked: this is a 1px decorative rule with
      // no other transform in play, so forcing it to its resting scale is
      // always safe, and reading a computed transform MATRIX back out to
      // decide whether it is "still zero" is the kind of check that is
      // fragile across browsers for one line that costs nothing to just set.
      document.querySelectorAll<HTMLElement>('[data-hero-rule]').forEach((el) => {
        el.style.transform = 'none';
      });
      document.querySelectorAll<HTMLElement>('[data-progress-bar]').forEach((bar) => {
        if (!bar.style.width || bar.style.width === '0%') {
          bar.style.width = `${bar.dataset.value ?? '0'}%`;
        }
      });
    };

    // The watchdog is armed BEFORE anything that can throw, including
    // `registerGsap()` itself: if GSAP fails to load at all, this is the one
    // thing standing between that failure and a blank page.
    const watchdog = window.setTimeout(restoreEverything, 1800);

    try {
      registerGsap();
    } catch (error) {
      // Sanctioned exception, see error.tsx: no structured browser logger
      // exists yet, and silently swallowing this is worse.
      // eslint-disable-next-line no-console
      console.error('GSAP failed to initialise; the page renders unanimated.', error);
      restoreEverything();
      return () => window.clearTimeout(watchdog);
    }

    const { distance, duration, stagger } = motionTokens();

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

        // ── Hero. Runs on load. `gsap.from` restores the element itself on
        //    completion, and a failure here cannot hide anything that was not
        //    already visible, so it gets a lighter guard than the sections
        //    below: catch and move on. ───────────────────────────────────
        try {
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
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Hero reveal failed; hero renders statically.', error);
        }

        // ── Reveals. Only what is below the fold right now gets hidden, and
        //    each group's hide-then-reveal is ONE atomic try block: a throw
        //    here restores exactly this group and continues to the next. ──
        const groups = gsap.utils.toArray<HTMLElement>('[data-reveal-group]');

        groups.forEach((group) => {
          const items = gsap.utils.toArray<HTMLElement>(group.querySelectorAll(revealSelector));
          if (items.length === 0) return;

          const belowFold = items.filter(
            (item) => item.getBoundingClientRect().top > viewportHeight,
          );
          if (belowFold.length === 0) return;

          try {
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
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('A reveal group failed; restoring it immediately.', error);
            belowFold.forEach((item) => {
              item.style.opacity = '1';
              item.style.transform = 'none';
            });
          }
        });

        const loners = gsap.utils
          .toArray<HTMLElement>(revealSelector)
          .filter((item) => !item.closest('[data-reveal-group]'));

        loners.forEach((item) => {
          if (item.getBoundingClientRect().top <= viewportHeight) return;

          try {
            gsap.set(item, { opacity: 0, y: distance });
            gsap.to(item, {
              opacity: 1,
              y: 0,
              duration,
              ease: EASE,
              clearProps: 'willChange',
              scrollTrigger: { trigger: item, start: 'top 90%', once: true },
            });
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('A reveal item failed; restoring it immediately.', error);
            item.style.opacity = '1';
            item.style.transform = 'none';
          }
        });

        // ── Section rules draw out. Decoration only. ───────────────────────
        try {
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
        } catch {
          /* decoration only; nothing to restore */
        }

        // ── Counters. The final value is already in the DOM from the server,
        //    so a failure here just means the number never counted up rather
        //    than never appearing. ──────────────────────────────────────────
        try {
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
        } catch {
          /* the server-rendered final value is already in the DOM */
        }

        // ── Progress bars. ─────────────────────────────────────────────────
        try {
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
        } catch {
          restoreEverything();
        }

        // ── Reading progress in the header rule. Decoration only. ──────────
        try {
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
        } catch {
          /* decoration only */
        }

        // ── Active section in the header nav. Decoration only. ─────────────
        try {
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
        } catch {
          /* decoration only */
        }
      },
    );

    // Fonts land after first paint and change every measurement on the page.
    void document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => undefined);

    return () => {
      window.clearTimeout(watchdog);
      mm.revert();
      restoreEverything();
    };
  }, []);

  return null;
}
