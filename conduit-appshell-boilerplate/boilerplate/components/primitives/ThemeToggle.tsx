'use client';

import { useState } from 'react';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { IconButton } from './IconButton';
import type { ResolvedTheme } from '@/lib/theme-shared';

export function ThemeToggle({
  theme: initial,
  compact = false,
}: {
  theme: ResolvedTheme;
  compact?: boolean;
}) {
  const [theme, setTheme] = useState<ResolvedTheme>(initial);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    document.cookie = `conduit-theme=${next}; path=/; max-age=31536000`;
  };

  return (
    <IconButton
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      size={compact ? 'sm' : 'md'}
    >
      {theme === 'dark' ? <IconMoon size={16} stroke={1.5} /> : <IconSun size={16} stroke={1.5} />}
    </IconButton>
  );
}
