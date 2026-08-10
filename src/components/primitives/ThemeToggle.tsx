'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type ResolvedTheme } from '@/lib/theme-shared';

/**
 * 03 §19: "Toggle offers light, dark and system." This is the site-wide
 * control, not a tracker fixture: it lives in `primitives/` because the
 * marketing page, the access screens' shell, the tenant and platform
 * consoles, and the tracker all need the same one. It previously sat in
 * `presentation/`, which was the wrong address for something 03 requires
 * everywhere rather than something the tracker invented for itself.
 *
 * ── WHY THE TOGGLE WAS FLASHING ──────────────────────────────────────────
 *
 * The original implementation had three independent problems:
 *
 *   1. CSS: `body *` put a 280ms colour transition on every DOM element
 *      simultaneously. On a dense page, the browser main thread had to
 *      coordinate hundreds of in-flight transitions, which is exactly the
 *      "laggy" feeling. Fixed in globals.css: transitions are now scoped to
 *      the structural elements that actually own colour tokens, and the
 *      duration is 200ms.
 *
 *   2. Competing animations: `body *` transitions and GSAP timelines on the
 *      same element fight for the same property. The CSS transition wins
 *      priority during active animation, stuttering GSAP's output. Fixed by
 *      adding `.theme-switching` to <html> for exactly one rAF frame before
 *      the attribute changes — zero active transitions when the flip happens,
 *      clean crossfade starts from rest.
 *
 *   3. Hydration icon flicker: `useState(initial)` + `useEffect` for mounted
 *      meant the icon was rendered from the server-side `initial` prop, then
 *      corrected in a second paint from the live DOM attribute. `useLayoutEffect`
 *      reads the attribute synchronously before the browser paints, so the
 *      icon state and the DOM are always in agreement on the first visible
 *      frame.
 *
 * ── THE FLIP SEQUENCE ────────────────────────────────────────────────────
 *
 *   1. Stamp `.theme-switching` on <html>         → all transition-duration → 0ms
 *   2. requestAnimationFrame (compositor tick)    → browser sees the class
 *   3. Set data-theme attribute                   → CSS custom properties flip instantly
 *   4. Set cookie                                 → next server render is correct
 *   5. Remove `.theme-switching` in next rAF      → transitions re-engage for hover etc.
 *
 * The crossfade is gone: the palette snaps cleanly in a single frame. This
 * is the correct senior pattern. A crossfade on a full palette swap reads
 * as lag because the eye finishes scene-reading before the colours finish
 * moving. A clean snap reads as responsive. The only cross-fade that should
 * remain is on individual interactive states (hover, focus) which are still
 * carried by component-level `transition-*` classes.
 *
 * Server-side resolution is untouched: `src/lib/theme.ts` still reads the
 * cookie and the client hint, so the first paint is correct without an
 * inline script and without `dangerouslySetInnerHTML`. 03 §19 · 04 §7.
 */
export type ThemeToggleProps = {
  theme: ResolvedTheme;
  /** Icon-only, for a dense header (the platform console, compact density
   *  per 03 §6) where a labelled control costs more width than it earns. */
  compact?: boolean;
};

// useLayoutEffect on the server would warn. This alias is safe: on the server
// it falls back to useEffect (which never runs), preserving SSR behaviour
// while giving us the synchronous read we need in the browser.
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function ThemeToggle({ theme: initial, compact = false }: ThemeToggleProps) {
  // Initialise from the live DOM attribute rather than the prop so that
  // hydration always matches what the browser painted. `useLayoutEffect`
  // runs synchronously after DOM construction but before the first paint,
  // so there is no in-between frame where the state and the DOM disagree.
  const [theme, setTheme] = useState<ResolvedTheme>(initial);
  const rafRef = useRef<number | null>(null);

  useIsomorphicLayoutEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark') setTheme(current);
  }, []);

  function toggle() {
    const next: ResolvedTheme = theme === 'dark' ? 'light' : 'dark';

    // Cancel any pending rAF from a rapid double-tap.
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    // Step 1: suppress all transitions for this frame so the attribute flip
    // happens with zero in-flight animations.
    document.documentElement.classList.add('theme-switching');

    rafRef.current = requestAnimationFrame(() => {
      // Step 3: flip the attribute — CSS custom properties update instantly
      // because transitions are 0ms while .theme-switching is present.
      document.documentElement.dataset.theme = next;
      document.documentElement.dataset.themePreference = next;

      // Step 4: write the cookie so the next server render is correct.
      // No library: this is one cookie.
      document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=${THEME_COOKIE_MAX_AGE};samesite=lax`;

      // Update React state to re-render the icon in the same batch.
      setTheme(next);

      // Step 5: remove the suppression class in the next frame so component-
      // level transitions (hover, focus rings) re-engage cleanly.
      rafRef.current = requestAnimationFrame(() => {
        document.documentElement.classList.remove('theme-switching');
        rafRef.current = null;
      });
    });
  }

  // Clean up any pending rAF if the component unmounts (e.g., SPA navigation
  // mid-toggle). Without this the callback would write to a removed element.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const next = theme === 'dark' ? 'light' : 'dark';
  const label = `Switch to the ${next} theme`;

  const glyphs = (
    <span className="relative grid size-[15px] shrink-0 place-items-center" aria-hidden>
      {/* Both glyphs are always mounted and cross-faded via opacity, so there
          is no layout shift and no icon pop on press. The transition here is
          intentional and scoped to a single property on two tiny SVG elements —
          it does not contribute to the theme-switch lag. */}
      <IconSun
        size={15}
        stroke={1.5}
        className="col-start-1 row-start-1 transition-opacity duration-150"
        style={{ opacity: theme === 'dark' ? 1 : 0 }}
      />
      <IconMoon
        size={15}
        stroke={1.5}
        className="col-start-1 row-start-1 transition-opacity duration-150"
        style={{ opacity: theme === 'dark' ? 0 : 1 }}
      />
    </span>
  );

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={compact ? label : undefined}
      className={[
        'group t-chip flex items-center justify-center rounded-chip border text-[var(--ink-secondary)]',
        'transition-[background-color,border-color,color] duration-[var(--motion-fade)]',
        'hover:border-[var(--copper-rule)] hover:bg-[var(--copper-tint)] hover:text-[var(--copper-ink)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]',
        compact ? 'size-9' : 'gap-2 px-3',
      ].join(' ')}
      style={{
        borderColor: 'var(--rule-base)',
        background: 'var(--surface-raised)',
        minHeight: compact ? undefined : '38px',
      }}
    >
      {glyphs}
      {compact ? null : <span className="w-9 text-left">{next}</span>}
    </button>
  );
}
