'use client';

import { useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons-react';

/**
 * The accessible route to any toolbar-buried action (03 §17, console-specific).
 * A quiet trigger, not a full search field — it opens `CommandPalette` (Tier 4)
 * rather than filtering inline, so it never competes visually with the
 * TenantSwitcher for topbar attention.
 */
export function CommandTrigger({ onOpen }: { onOpen?: () => void }) {
  const [mac, setMac] = useState(true);

  useEffect(() => {
    setMac(/Mac|iPhone|iPod|iPad/.test(navigator.platform ?? navigator.userAgent));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpen?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open command palette"
      className="group flex h-9 cursor-pointer items-center gap-2 rounded-chip border pr-2 pl-2.5 text-[var(--text-tertiary)] transition-colors duration-150 ease-out hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
      style={{ background: 'var(--surface-sunken)', borderColor: 'var(--border-subtle)' }}
    >
      <IconSearch size={14} stroke={1.75} />
      <span className="t-compact hidden sm:inline">Search or jump to…</span>
      <kbd
        className="t-eyebrow ml-1 hidden items-center gap-0.5 rounded-sm border px-1.5 py-0.5 sm:flex"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {mac ? '⌘' : 'Ctrl'}K
      </kbd>
    </button>
  );
}
