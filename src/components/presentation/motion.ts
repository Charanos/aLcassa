'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The motion layer for the project tracker.
 *
 * ⚠ SCOPE. This module is imported by the tracker surface and by nothing else.
 * `/app`, `/platform` and `/product` keep the rule in 03 §7 that motion
 * confirms and never entertains, because those are screens a person sees a
 * hundred times a day and anything that animates on arrival becomes a tax by
 * Wednesday. This surface is read a handful of times by someone deciding
 * whether to sign something, and it earns a different budget.
 *
 * TWO RULES THAT DO NOT BEND.
 *
 *  1. `prefers-reduced-motion` is honoured AT THE SOURCE. Not by shortening a
 *     duration, not by a CSS override that a GSAP inline style then wins
 *     against: `gsap.matchMedia` never builds the timeline at all, and the
 *     element is set to its final state immediately. Motion here is decoration
 *     and decoration is optional.
 *
 *  2. Nothing animates that carries meaning on its own. A reveal changes when
 *     you notice a card, never whether the card is there. With JavaScript
 *     disabled the `.no-js` rule in globals.css shows everything at full
 *     opacity, so the page degrades to a plain document rather than to a blank
 *     one.
 */

let registered = false;

export function registerGsap(): void {
  if (registered || typeof window === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

export { gsap, ScrollTrigger };

/** Reads the choreography from tokens.css so the timing lives with the rest of
 *  the design system rather than as loose numbers in a hook. */
export function motionTokens() {
  if (typeof window === 'undefined') {
    return { distance: 18, duration: 0.75, stagger: 0.055 };
  }
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: number) => {
    const value = parseFloat(styles.getPropertyValue(name));
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    distance: read('--reveal-distance', 18),
    duration: read('--reveal-duration', 0.75),
    stagger: read('--reveal-stagger', 0.055),
  };
}

/**
 * The house easing curve. `expo.out` starts fast and settles slowly, which
 * reads as something arriving under its own weight rather than being tweened.
 * It is the closest curve to `--ease-decelerate` in the token file.
 */
export const EASE = 'expo.out';
export const EASE_SOFT = 'power3.out';
