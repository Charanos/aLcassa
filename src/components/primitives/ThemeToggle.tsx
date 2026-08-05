'use client';

import { useEffect, useState } from 'react';
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
 * ⚠ THIS REPLACES A SERVER ACTION, AND THE REASON IS WORTH KEEPING.
 *
 * The first version posted a form to a server action that set the cookie and
 * re-rendered. It was correct, it kept the theme resolved on the server, and
 * it navigated the whole document on every press, which on a long page means
 * losing scroll position and re-running every entrance animation to change
 * one attribute. This version instead:
 *
 *   1. flips `data-theme` on <html> immediately, so every token re-resolves
 *      in the same frame and the CSS crossfade in globals.css carries it;
 *   2. writes the cookie from the client, so the NEXT server render already
 *      knows the answer and there is still no flash on a cold load.
 *
 * Server-side resolution is untouched: `src/lib/theme.ts` still reads the
 * cookie and the client hint, so the first paint is correct without an inline
 * script and without `dangerouslySetInnerHTML`. 03 §19 · 04 §7.
 */
export type ThemeToggleProps = {
  theme: ResolvedTheme;
  /** Icon-only, for a dense header (the platform console, compact density
   *  per 03 §6) where a labelled control costs more width than it earns. */
  compact?: boolean;
};

export function ThemeToggle({ theme: initial, compact = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState<ResolvedTheme>(initial);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark') setTheme(current);
  }, []);

  function toggle() {
    const next: ResolvedTheme = theme === 'dark' ? 'light' : 'dark';

    document.documentElement.dataset.theme = next;
    document.documentElement.dataset.themePreference = next;
    // No library: this is one cookie, and a library for it would be more
    // code than the cookie.
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=${THEME_COOKIE_MAX_AGE};samesite=lax`;

    setTheme(next);
  }

  const next = theme === 'dark' ? 'light' : 'dark';
  // Until mounted the label reflects the server's answer, which may differ
  // from the OS preference on a first-ever visit. Announcing it only once
  // mounted avoids telling a screen reader the wrong thing.
  const label = mounted ? `Switch to the ${next} theme` : 'Switch theme';

  const glyphs = (
    <span className="relative grid size-[15px] shrink-0 place-items-center">
      {/* Both glyphs are always mounted and cross-faded, so there is no
          layout shift and no icon pop on press. */}
      <IconSun
        size={15}
        stroke={1.5}
        aria-hidden
        className="col-start-1 row-start-1 transition-opacity duration-[var(--motion-fade)]"
        style={{ opacity: theme === 'dark' ? 1 : 0 }}
      />
      <IconMoon
        size={15}
        stroke={1.5}
        aria-hidden
        className="col-start-1 row-start-1 transition-opacity duration-[var(--motion-fade)]"
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
