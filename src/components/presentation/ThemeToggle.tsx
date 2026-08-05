import { cookies } from 'next/headers';
import { IconMoon, IconSun } from '@tabler/icons-react';
import { THEME_COOKIE, type ResolvedTheme } from '@/lib/theme';

/**
 * A server action rather than client state, which keeps the theme resolved on
 * the server and means there is still no flash and still no inline script.
 * 03 §19 · 04 §7.
 *
 * On the presentation surface it does real work: both themes are fully
 * specified on sheets 01 to 04 with every contrast ratio measured again after
 * the flip, and the fastest way to show that is to let the client press the
 * button while looking at the page.
 */
export function ThemeToggle({ theme }: { theme: ResolvedTheme }) {
  async function toggle() {
    'use server';
    const store = await cookies();
    const current = store.get(THEME_COOKIE)?.value;
    store.set(THEME_COOKIE, current === 'dark' ? 'light' : 'dark', {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  const next = theme === 'dark' ? 'light' : 'dark';

  return (
    <form action={toggle}>
      <button
        type="submit"
        className="t-chip flex items-center gap-2 rounded-chip border px-3 py-2 text-[var(--ink-secondary)] transition-colors duration-[var(--motion-fade)] hover:border-[var(--rule-strong)] hover:text-[var(--ink-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        style={{
          borderColor: 'var(--rule-base)',
          background: 'var(--surface-raised)',
          minHeight: 'var(--hit-target)',
        }}
        aria-label={`Switch to the ${next} theme`}
      >
        {theme === 'dark' ? (
          <IconSun size={15} stroke={1.5} aria-hidden />
        ) : (
          <IconMoon size={15} stroke={1.5} aria-hidden />
        )}
        {next}
      </button>
    </form>
  );
}
