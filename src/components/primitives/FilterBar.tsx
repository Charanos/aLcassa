'use client';

import * as React from 'react';
import { IconSearch, IconX, IconList, IconLayoutGrid } from '@tabler/icons-react';

export interface FilterOption<T extends string = string> {
  id: T;
  label: React.ReactNode;
  count?: number;
  /** Rich color configuration for when the chip is active */
  activeColor?: {
    ink: string;
    tint: string;
    border: string;
  };
}

export interface FilterBarProps<T extends string = string> {
  query: string;
  onQueryChange: (q: string) => void;
  searchPlaceholder?: string;

  optionsLabel?: string;
  options: FilterOption<T>[];
  selectedOptions: T[];
  onToggleOption: (id: T) => void;

  customChips?: React.ReactNode;

  resultsCount: number;
  totalCount: number;
  onClear: () => void;
  filtersActive: boolean;

  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
}

export function FilterBar<T extends string = string>({
  query,
  onQueryChange,
  searchPlaceholder = 'Search...',
  optionsLabel = 'STATUS',
  options,
  selectedOptions,
  onToggleOption,
  customChips,
  resultsCount,
  totalCount,
  onClear,
  filtersActive,
  viewMode,
  onViewModeChange,
}: FilterBarProps<T>) {
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/') return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      className="mt-6 flex flex-wrap items-center gap-3 rounded-hero p-2 transition-all duration-300"
      style={{
        background: 'var(--surface-sunken)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02), 0 1px 0 var(--glass-highlight)',
      }}
    >
      {/* Search Input (Crisp Floating Pill) */}
      <label
        className="flex h-10 max-w-[480px] min-w-0 flex-1 basis-[280px] items-center gap-3 rounded-full px-4 transition-all duration-300 focus-within:border-[var(--blue-500)] focus-within:ring-2 focus-within:ring-[var(--blue-500)] hover:shadow-sm"
        style={{
          border: '1px solid var(--border-strong)',
          background: 'var(--surface-raised)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <IconSearch
          size={16}
          stroke={2}
          className="shrink-0 transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
          aria-hidden
        />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="min-w-0 flex-1 border-none bg-transparent transition-colors outline-none"
          style={{ font: '400 var(--type-body)/1 var(--font-ui)', color: 'var(--text-primary)' }}
        />
        <kbd
          className="hidden items-center justify-center rounded px-1.5 sm:flex"
          style={{ font: '500 var(--type-chip)/1 var(--font-mono)', color: 'var(--text-tertiary)' }}
        >
          /
        </kbd>
      </label>

      {/* Options */}
      {options.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {optionsLabel && (
            <span
              className="t-eyebrow mr-1 tracking-widest"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {optionsLabel}
            </span>
          )}
          {options.map((opt) => {
            const on = selectedOptions.includes(opt.id);
            const activeInk = opt.activeColor?.ink || 'var(--blue-500)';
            const activeTint = opt.activeColor?.tint || 'var(--blue-50)';
            const activeBorder = opt.activeColor?.border || 'var(--blue-200)';

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onToggleOption(opt.id)}
                aria-pressed={on}
                className="group inline-flex h-[28px] cursor-pointer items-center gap-2 rounded-full px-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-px"
                style={{
                  border: `1px solid ${on ? activeBorder : 'var(--border-strong)'}`,
                  background: on ? activeTint : 'var(--surface-raised)',
                  color: on ? activeInk : 'var(--text-primary)',
                  font: '600 var(--type-chip)/1 var(--font-ui)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  boxShadow: on ? '0 2px 8px rgba(0,0,0,0.04)' : '0 1px 2px rgba(0,0,0,0.04)',
                }}
              >
                <span
                  aria-hidden
                  className="size-[6px] shrink-0 rounded-full transition-all duration-300"
                  style={{
                    background: activeInk,
                  }}
                />
                {opt.label}
                {opt.count !== undefined && (
                  <span
                    className="numeric transition-colors duration-300"
                    style={{
                      fontSize: 'var(--type-micro)',
                      fontWeight: 500,
                      color: on ? activeInk : 'var(--text-tertiary)',
                      opacity: on ? 0.8 : 1,
                    }}
                  >
                    {opt.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Custom Chips */}
      {customChips && <div className="flex items-center">{customChips}</div>}

      <div className="ml-auto flex items-center gap-4 px-2">
        {/* Clear & Count */}
        <span className="flex items-center gap-4">
          {filtersActive && (
            <button
              type="button"
              onClick={onClear}
              className="t-compact inline-flex items-center gap-1 text-[var(--text-action)] hover:underline"
            >
              <IconX size={13} stroke={1.5} />
              Reset
            </button>
          )}
          <span className="t-compact" style={{ color: 'var(--text-secondary)' }}>
            <span className="numeric font-medium" style={{ color: 'var(--text-primary)' }}>
              {resultsCount}
            </span>{' '}
            of {totalCount}
          </span>
        </span>

        {/* View Toggle */}
        {viewMode && onViewModeChange && (
          <div
            className="flex items-center rounded-overlay p-[3px] transition-all duration-300"
            style={{
              background: 'var(--surface-inset)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-pressed={viewMode === 'list'}
              aria-label="List view"
              className="grid size-[30px] place-items-center rounded-overlay transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                background: viewMode === 'list' ? 'var(--surface-raised)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow:
                  viewMode === 'list'
                    ? '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px var(--border-subtle)'
                    : 'none',
              }}
            >
              <IconList size={16} stroke={1.5} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid view"
              className="grid size-[30px] place-items-center rounded-overlay transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                background: viewMode === 'grid' ? 'var(--surface-raised)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow:
                  viewMode === 'grid'
                    ? '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px var(--border-subtle)'
                    : 'none',
              }}
            >
              <IconLayoutGrid size={16} stroke={1.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
