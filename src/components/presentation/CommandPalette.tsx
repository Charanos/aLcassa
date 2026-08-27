'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconArrowRight,
  IconExternalLink,
  IconFileText,
  IconLayoutGrid,
  IconMoon,
  IconSearch,
} from '@tabler/icons-react';

/**
 * Cmd/Ctrl+K.
 *
 * 09 §5 specifies a command palette for the console, and the reasoning there
 * applies here: it is the fastest route to any destination AND it is the
 * accessible route to anything otherwise buried, which is exactly what a
 * fourteen-section page with twenty-eight documents needs.
 *
 * Deliberately not a library. It is a filtered list, a keyboard handler and a
 * focus trap, and the three of them are shorter than the integration would be.
 */

/**
 * The header button and the palette are siblings rather than parent and child,
 * so they talk through one event instead of hoisting state into the page and
 * turning a server component into a client one. Synthesising a fake keyboard
 * event would also work and would be a lie in the transcript of anything
 * listening upstream.
 */
const PALETTE_EVENT = 'aLcassa:open-palette';

export type Command = {
  id: string;
  label: string;
  hint?: string;
  group: 'Sections' | 'Documents' | 'Design sheets' | 'Actions';
  href?: string;
  external?: boolean;
};

export function CommandPalette({ commands }: { commands: Command[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;

    // Subsequence matching, so "tenis" finds "Tenancy and isolation". A reader
    // who half-remembers a title should still land on it.
    const matches = (haystack: string) => {
      const target = haystack.toLowerCase();
      if (target.includes(q)) return 2;
      let i = 0;
      for (const char of target) {
        if (char === q[i]) i += 1;
        if (i === q.length) return 1;
      }
      return 0;
    };

    return commands
      .map((command) => ({
        command,
        score: Math.max(matches(command.label), matches(command.hint ?? '') ? 1 : 0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.command);
  }, [commands, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActive(0);
    restoreFocusTo.current?.focus();
  }, []);

  const run = useCallback(
    (command: Command | undefined) => {
      if (!command) return;

      if (!command.href) return;

      if (command.external) {
        window.open(command.href, '_blank', 'noreferrer');
      } else if (command.href.startsWith('#')) {
        close();
        document
          .querySelector(command.href)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      } else {
        router.push(command.href);
      }
      close();
    },
    [close, router],
  );

  // Open, close, and the global shortcut.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        restoreFocusTo.current = document.activeElement as HTMLElement;
        setOpen((value) => !value);
        return;
      }
      if (event.key === 'Escape' && open) {
        event.preventDefault();
        close();
      }
    }

    function onRequest() {
      restoreFocusTo.current = document.activeElement as HTMLElement;
      setOpen(true);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener(PALETTE_EVENT, onRequest);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener(PALETTE_EVENT, onRequest);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    if (!open) return;
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  if (!open) return null;

  const grouped = results.reduce<Record<string, Command[]>>((acc, command) => {
    (acc[command.group] ??= []).push(command);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: 'var(--scrim)' }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className="w-full max-w-[560px] overflow-hidden rounded-overlay border"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--rule-base)',
          boxShadow: 'var(--shadow-overlay)',
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActive((i) => Math.min(i + 1, results.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            run(results[active]);
          } else if (event.key === 'Tab') {
            // A two-element trap: the input and the list. Nothing behind the
            // scrim is reachable while this is open.
            event.preventDefault();
          }
        }}
      >
        <div
          className="flex items-center gap-3 border-b px-4"
          style={{ borderColor: 'var(--rule-soft)' }}
        >
          <IconSearch size={16} stroke={1.5} aria-hidden className="text-[var(--ink-tertiary)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Jump to a section, a document or a sheet"
            aria-label="Search sections, documents and design sheets"
            className="t-body flex-1 bg-transparent py-3.5 text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-tertiary)]"
          />
          <kbd
            className="t-eyebrow rounded-chip border px-1.5 py-1 text-[var(--ink-tertiary)]"
            style={{ borderColor: 'var(--rule-base)' }}
          >
            esc
          </kbd>
        </div>

        <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
          {results.length === 0 ? (
            <li className="t-compact px-3 py-6 text-center text-[var(--ink-tertiary)]">
              Nothing matches {query}.
            </li>
          ) : (
            Object.entries(grouped).map(([group, items]) => (
              <li key={group}>
                <div className="t-eyebrow px-3 pt-3 pb-1.5 text-[var(--ink-faint)]">{group}</div>
                <ul>
                  {items.map((command) => {
                    flatIndex += 1;
                    const index = flatIndex;
                    const isActive = index === active;
                    const Icon =
                      command.group === 'Documents'
                        ? IconFileText
                        : command.group === 'Design sheets'
                          ? IconLayoutGrid
                          : IconArrowRight;

                    return (
                      <li key={command.id}>
                        <button
                          type="button"
                          data-index={index}
                          role="option"
                          aria-selected={isActive}
                          onMouseEnter={() => setActive(index)}
                          onClick={() => run(command)}
                          className="flex w-full items-center gap-3 rounded-chip px-3 py-2.5 text-left"
                          style={{
                            background: isActive ? 'var(--copper-tint)' : 'transparent',
                            color: isActive ? 'var(--copper-ink)' : 'var(--ink-primary)',
                          }}
                        >
                          <Icon
                            size={15}
                            stroke={1.5}
                            aria-hidden
                            style={{ color: isActive ? 'var(--copper-ink)' : 'var(--ink-faint)' }}
                          />
                          <span className="t-compact flex-1 truncate">{command.label}</span>
                          {command.hint ? (
                            <span className="t-caption truncate text-[var(--ink-tertiary)]">
                              {command.hint}
                            </span>
                          ) : null}
                          {command.external ? (
                            <IconExternalLink
                              size={13}
                              stroke={1.5}
                              aria-hidden
                              className="text-[var(--ink-faint)]"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))
          )}
        </ul>

        <div
          className="t-caption flex items-center gap-4 border-t px-4 py-2.5 text-[var(--ink-tertiary)]"
          style={{ borderColor: 'var(--rule-soft)', background: 'var(--surface-sunken)' }}
        >
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> move
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>↵</Kbd> open
          </span>
          <span className="ml-auto flex items-center gap-1.5">
            <IconMoon size={12} stroke={1.5} aria-hidden />
            type theme
          </span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="t-eyebrow inline-grid h-4 min-w-4 place-items-center rounded-chip border px-1"
      style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-raised)' }}
    >
      {children}
    </kbd>
  );
}

/** The affordance in the header. Without it, a keyboard shortcut is a secret. */
export function CommandHint() {
  const [meta, setMeta] = useState('Ctrl');

  useEffect(() => {
    if (/mac|iphone|ipad/i.test(navigator.userAgent)) setMeta('⌘');
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(PALETTE_EVENT))}
      aria-label="Open the command palette"
      className="t-chip hidden items-center gap-2 rounded-chip border px-3 text-[var(--ink-tertiary)] transition-colors duration-[var(--motion-fade)] hover:border-[var(--copper-rule)] hover:text-[var(--copper-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] md:flex"
      style={{
        borderColor: 'var(--rule-base)',
        background: 'var(--surface-raised)',
        minHeight: '38px',
      }}
    >
      <IconSearch size={14} stroke={1.5} aria-hidden />
      <span>{meta} K</span>
    </button>
  );
}
