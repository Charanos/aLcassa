'use client';

import { useEffect, useState } from 'react';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type ResolvedTheme } from '@/lib/theme-shared';

/**
 * ⚠ THIS REPLACES A SERVER ACTION, AND THE REASON IS WORTH KEEPING.
 *
 * The first version posted a form to a server action that set the cookie and
 * re-rendered. It was correct, it kept the theme resolved on the server, and it
 * navigated the whole document on every press. On a page this long that means
 * losing scroll position and re-running every entrance animation to change one
 * attribute, which is an absurd amount of machinery for a colour change.
 *
 * This version does the honest thing:
 *
 *   1. flip `data-theme` on <html> immediately, so every token re-resolves in
 *      the same frame and the CSS crossfade in globals.css carries it;
 *   2. write the cookie from the client, so the NEXT server render already
 *      knows the answer and there is still no flash on a cold load.
 *
 * Server-side resolution is untouched: `src/lib/theme.ts` still reads the
 * cookie and the client hint, so the first paint is correct without an inline
 * script and without `dangerouslySetInnerHTML`. 03 §19 · 04 §7.
 *
 * The component is `suppressHydrationWarning`-free because it renders the
 * server's answer first and only reconciles in an effect.
 */
export function ThemeToggle({ theme: initial }: { theme: ResolvedTheme }) {
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
    // No library: this is one cookie, and a library for it would be more code
    // than the cookie.
    document.cookie = `${THEME_COOKIE}=${next};path=/;max-age=${THEME_COOKIE_MAX_AGE};samesite=lax`;

    setTheme(next);
  }

  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      // Until mounted the label reflects the server's answer, which may differ
      // from the OS preference on a first-ever visit. Announcing it only once
      // mounted avoids telling a screen reader the wrong thing.
      aria-label={mounted ? `Switch to the ${next} theme` : 'Switch theme'}
      className="group t-chip flex items-center gap-2 rounded-chip border px-3 text-[var(--ink-secondary)] transition-[background-color,border-color,color] duration-[var(--motion-fade)] hover:border-[var(--copper-rule)] hover:bg-[var(--copper-tint)] hover:text-[var(--copper-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
      style={{
        borderColor: 'var(--rule-base)',
        background: 'var(--surface-raised)',
        minHeight: '38px',
      }}
    >
      <span className="relative grid size-[15px] place-items-center">
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
      <span className="w-9 text-left">{next}</span>
    </button>
  );
}
