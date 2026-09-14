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
  active: 'var(--green-500)',
  trial: 'var(--blue-500)',
  past_due: 'var(--amber-500)',
  suspended: 'var(--red-500)',
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
        className="group flex h-9 cursor-pointer items-center gap-2.5 rounded-chip border pr-2.5 pl-2 transition-colors duration-150 ease-out hover:border-[var(--border-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
        style={{
          background: 'var(--surface-sunken)',
          borderColor: open ? 'var(--border-strong)' : 'var(--border-subtle)',
        }}
      >
        <span
          aria-hidden
          className="flex size-5 items-center justify-center rounded-sm"
          style={{ background: 'var(--blue-50)', color: 'var(--blue-500)' }}
        >
          <IconBuilding size={12} stroke={2} />
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="t-eyebrow mb-0.5 text-[9px] text-[var(--text-tertiary)] opacity-50">
            Workspace
          </span>
          <span className="t-compact max-w-36 truncate font-medium text-[var(--text-primary)]">
            {filtered[0]?.name ?? 'Select workspace'}
          </span>
        </span>
        <IconChevronDown
          size={14}
          stroke={1.75}
          className={`ml-0.5 text-[var(--text-tertiary)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          data-slot="tenant-switcher-panel"
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-0 z-50 w-80 overflow-hidden rounded-md border"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-overlay)',
          }}
        >
          <div
            className="flex items-center gap-2 border-b px-3"
            style={{ borderColor: 'var(--border-subtle)', height: 'var(--row-comfortable)' }}
          >
            <IconSearch size={14} stroke={1.75} className="shrink-0 text-[var(--text-tertiary)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Find a workspace…"
              className="t-compact w-full bg-transparent text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
            />
            <kbd
              className="t-eyebrow shrink-0 rounded-sm border px-1.5 py-0.5 text-[var(--text-tertiary)]"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              esc
            </kbd>
          </div>

          <ul className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="t-caption px-3 py-4 text-center text-[var(--text-tertiary)]">
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
                  className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100"
                  style={{
                    background: i === highlight ? 'var(--surface-inset)' : 'transparent',
                  }}
                >
                  <span
                    aria-hidden
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: STATUS_DOT[tenant.status] }}
                  />
                  <span className="t-compact flex-1 truncate text-[var(--text-primary)]">
                    {tenant.name}
                  </span>
                  <span className="t-eyebrow shrink-0 text-[var(--text-tertiary)] opacity-50">
                    {tenant.plan}
                  </span>
                  {i === highlight && (
                    <IconCircleCheck
                      size={14}
                      stroke={1.75}
                      className="shrink-0 text-[var(--blue-500)]"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
