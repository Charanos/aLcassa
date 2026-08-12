import { useEffect, useState } from 'react';
import gsap from 'gsap';

/**
 * Motion foundation. aLcassa sheet 13: "reduced motion loses nothing — every
 * token resolves to zero except the skeleton, which becomes a static tint."
 *
 * `prefers-reduced-motion` is a CSS media query and has no effect on GSAP,
 * which drives the console chrome (nav indicator, dialogs, hover states) in
 * JS. Every GSAP call site must go through `gsapSafe` so a reduced-motion
 * reader lands on the animation's final state instantly instead of getting
 * nothing, or getting the full motion sheet 13 asks us to remove for them.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

type TweenTarget = gsap.TweenTarget;
type TweenVars = gsap.TweenVars;

/**
 * Drop-in replacements for `gsap.to`/`gsap.fromTo`/`gsap.set`. When reduced
 * motion is on, the tween is skipped and the target is set directly to its
 * end state (including `onComplete`, fired synchronously) — never left
 * mid-transition and never left unanimated-and-untouched.
 */
const TIMING_KEYS = ['delay', 'duration', 'ease'] as const;

/** The end state only: strips timing keys a `gsap.set()` doesn't take, fires `onComplete` itself. */
function applyEndState(targets: TweenTarget, vars: TweenVars) {
  const end: TweenVars = { ...vars };
  for (const key of TIMING_KEYS) delete end[key];
  const onComplete = end.onComplete;
  delete end.onComplete;
  gsap.set(targets, end);
  onComplete?.call(vars.callbackScope ?? null);
}

export const gsapSafe = {
  to(targets: TweenTarget, vars: TweenVars) {
    if (prefersReducedMotion()) {
      applyEndState(targets, vars);
      return null;
    }
    return gsap.to(targets, vars);
  },

  fromTo(targets: TweenTarget, fromVars: TweenVars, toVars: TweenVars) {
    if (prefersReducedMotion()) {
      applyEndState(targets, toVars);
      return null;
    }
    return gsap.fromTo(targets, fromVars, toVars);
  },

  set(targets: TweenTarget, vars: TweenVars) {
    return gsap.set(targets, vars);
  },
};
