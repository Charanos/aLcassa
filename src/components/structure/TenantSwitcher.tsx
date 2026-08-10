'use client';

import { useEffect, useRef, useState } from 'react';
import { IconBuilding, IconChevronDown, IconCircleCheck, IconSearch } from '@tabler/icons-react';

export type TenantSummary = {
  id: string;
  name: string;
  plan: string;
  status: 'active' | 'trial' | 'past_due' | 'suspended';
};

const STATUS_DOT: Record<TenantSummary['status'], string> = {
  active: 'var(--verdigris-solid)',
  trial: 'var(--copper-solid)',
  past_due: 'var(--ochre-solid)',
  suspended: 'var(--oxide-solid)',
};

/**
 * 09 §3 / AppShell. The organization switcher: available on every console
 * page, the second focusable element after the skip link. Opens a searchable
 * list; selecting a tenant does NOT navigate immediately — it hands back a
 * pending tenant for the caller to confirm, per "selecting a tenant opens a
 * confirmation naming the consequence rather than switching immediately."
 */
export function TenantSwitcher({
  tenants,
  onSelect,
}: {
  tenants: TenantSummary[];
  onSelect?: (tenant: TenantSummary) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = tenants.filter((t) => t.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
      setHighlight(0);
    } else {
      setQuery('');
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter' && filtered[highlight]) {
      e.preventDefault();
      onSelect?.(filtered[highlight]);
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} data-slot="tenant-switcher" className="relative">
      <button
        type="button"
        data-slot="tenant-switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group flex h-9 items-center gap-2.5 rounded-chip border pl-2 pr-2.5 transition-colors duration-150 ease-out cursor-pointer hover:border-[var(--rule-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
        style={{
          background: 'var(--surface-sunken)',
          borderColor: open ? 'var(--rule-strong)' : 'var(--rule-base)',
        }}
      >
        <span
          aria-hidden
          className="flex size-5 items-center justify-center rounded-sm"
          style={{ background: 'var(--copper-tint)', color: 'var(--copper-ink)' }}
        >
          <IconBuilding size={12} stroke={2} />
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="t-eyebrow opacity-50 mb-0.5 text-[var(--ink-tertiary)] text-[9px]">Workspace</span>
          <span className="t-compact font-medium text-[var(--ink-primary)] max-w-36 truncate">
            {filtered[0]?.name ?? 'Select workspace'}
          </span>
        </span>
        <IconChevronDown
          size={14}
          stroke={1.75}
          className={`ml-0.5 text-[var(--ink-tertiary)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          data-slot="tenant-switcher-panel"
          role="listbox"
          className="absolute left-0 top-[calc(100%+6px)] z-50 w-80 overflow-hidden rounded-md border"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--rule-base)',
            boxShadow: 'var(--shadow-overlay)',
          }}
        >
          <div
            className="flex items-center gap-2 border-b px-3"
            style={{ borderColor: 'var(--rule-base)', height: 'var(--row-comfortable)' }}
          >
            <IconSearch size={14} stroke={1.75} className="text-[var(--ink-tertiary)] shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Find a workspace…"
              className="t-compact w-full bg-transparent text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] outline-none"
            />
            <kbd className="t-eyebrow shrink-0 rounded-sm border px-1.5 py-0.5 text-[var(--ink-tertiary)]" style={{ borderColor: 'var(--rule-base)' }}>
              esc
            </kbd>
          </div>

          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="t-caption px-3 py-4 text-center text-[var(--ink-tertiary)]">
                No workspace matches “{query}”
              </li>
            )}
            {filtered.map((tenant, i) => (
              <li key={tenant.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    onSelect?.(tenant);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 cursor-pointer"
                  style={{
                    background: i === highlight ? 'var(--surface-hover)' : 'transparent',
                  }}
                >
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: STATUS_DOT[tenant.status] }}
                  />
                  <span className="t-compact flex-1 truncate text-[var(--ink-primary)]">{tenant.name}</span>
                  <span className="t-eyebrow shrink-0 opacity-50 text-[var(--ink-tertiary)]">{tenant.plan}</span>
                  {i === highlight && <IconCircleCheck size={14} stroke={1.75} className="shrink-0 text-[var(--copper-ink)]" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
