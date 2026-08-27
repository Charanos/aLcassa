'use client';

import { useId, useRef } from 'react';
import { IconCheck, IconChevronDown, IconMinus, IconSelector } from '@tabler/icons-react';

/**
 * Real controls, with real semantics.
 *
 * The distinction that matters: a styled `<div onClick>` looks identical to a
 * control and behaves like nothing. These use the right element or the right
 * role, manage their own roving focus, and answer to the keyboard the way the
 * platform does. 03 §17 · sheet 13.
 *
 * No component library. Each of these is between forty and eighty lines, and
 * the integration cost of a library that would then need restyling to the token
 * system exceeds writing them.
 */

/* ══ SEGMENTED CONTROL ══════════════════════════════════════════════════════
 * A single-choice control. `radiogroup` rather than a row of buttons, because
 * the semantics are "one of these", and a screen reader should say "2 of 4"
 * rather than reading four unrelated buttons.
 *
 * Roving tabindex: the group is ONE tab stop and the arrows move within it,
 * which is the platform behaviour for radios and the reason not to use
 * `tabIndex={0}` on every option.
 */
export function SegmentedControl<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{
    value: T;
    label: string;
    count?: number;
    tone?: string;
    tint?: string;
    rule?: string;
  }>;
}) {
  const groupRef = useRef<HTMLDivElement>(null);

  function onKeyDown(event: React.KeyboardEvent) {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const index = options.findIndex((option) => option.value === value);
    let next = index;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = (index + 1) % options.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (index - 1 + options.length) % options.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = options.length - 1;

    const target = options[next];
    if (!target) return;
    onChange(target.value);
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="inline-flex rounded-chip border p-0.5"
      style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-sunken)' }}
    >
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(option.value)}
            className="t-chip flex items-center gap-2 rounded-chip px-3 transition-colors duration-[var(--motion-fade)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--focus)]"
            style={{
              minHeight: '32px',
              color: on ? (option.tone ?? 'var(--ink-primary)') : 'var(--ink-tertiary)',
              background: on ? 'var(--surface-raised)' : 'transparent',
              boxShadow: on ? 'var(--shadow-card)' : 'none',
            }}
          >
            {option.label}
            {option.count !== undefined ? (
              <span className="t-data tabular-nums" style={{ fontSize: '11px', opacity: 0.7 }}>
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ══ CHECKBOX ═══════════════════════════════════════════════════════════════
 * A real `<input type="checkbox">`, visually hidden and driven by a sibling
 * box. Not `appearance: none` on the input itself, because that loses the
 * indeterminate rendering, and not a div with `role="checkbox"`, because then
 * the form semantics and the label association have to be rebuilt by hand.
 */
export function Checkbox({
  checked,
  indeterminate = false,
  onChange,
  label,
  count,
  tone,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  count?: number;
  tone?: string;
}) {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="group flex cursor-pointer items-center gap-2.5 rounded-chip py-1.5 pr-2"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        ref={(node) => {
          if (node) node.indeterminate = indeterminate && !checked;
        }}
        onChange={(event) => onChange(event.target.checked)}
        className="peer visually-hidden"
      />
      <span
        aria-hidden
        className="grid size-[18px] shrink-0 place-items-center rounded-chip border transition-colors duration-[var(--motion-fade)] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--focus)]"
        style={{
          borderColor: checked || indeterminate ? 'var(--copper-ink)' : 'var(--rule-base)',
          background: checked || indeterminate ? 'var(--copper-solid)' : 'var(--surface-raised)',
          color: 'var(--ink-inverse)',
        }}
      >
        {checked ? (
          <IconCheck size={13} stroke={2} />
        ) : indeterminate ? (
          <IconMinus size={13} stroke={2} />
        ) : null}
      </span>

      <span
        className="t-compact select-none"
        style={{ color: checked ? (tone ?? 'var(--ink-primary)') : 'var(--ink-secondary)' }}
      >
        {label}
      </span>

      {count !== undefined ? (
        <span
          className="t-data text-[var(--ink-tertiary)] tabular-nums"
          style={{ fontSize: '12px' }}
        >
          {count}
        </span>
      ) : null}
    </label>
  );
}

/* ══ SELECT ═════════════════════════════════════════════════════════════════
 * A native `<select>` under a styled shell. A custom listbox would need focus
 * management, typeahead, scroll-into-view and mobile handling rebuilt, and it
 * would be worse on every one of them than the platform control. The chevron
 * is decorative; the control underneath is the real thing.
 */
export function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  hideLabel = false,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  hideLabel?: boolean;
}) {
  const id = useId();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor={id}
        className={hideLabel ? 'visually-hidden' : 't-eyebrow text-[var(--ink-tertiary)]'}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="t-compact cursor-pointer appearance-none rounded-chip border py-0 pr-8 pl-3 text-[var(--ink-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          style={{
            minHeight: '34px',
            borderColor: 'var(--rule-base)',
            background: 'var(--surface-raised)',
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <IconChevronDown
          size={14}
          stroke={1.5}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[var(--ink-tertiary)]"
        />
      </div>
    </div>
  );
}

/* ══ SORTABLE COLUMN HEADER ═════════════════════════════════════════════════
 * `aria-sort` on the `<th>` is what makes a sorted table announce itself. The
 * button inside is the control; the header cell carries the state.
 */
export function SortHeader({
  label,
  active,
  direction,
  onSort,
  width,
}: {
  label: string;
  active: boolean;
  direction: 'asc' | 'desc';
  onSort: () => void;
  width?: string;
}) {
  return (
    <th
      scope="col"
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="border-b p-0 text-left"
      style={{ borderColor: 'var(--rule-base)', background: 'var(--surface-sunken)', width }}
    >
      <button
        type="button"
        onClick={onSort}
        className="t-micro flex w-full items-center gap-1.5 px-4 py-3 text-left transition-colors duration-[var(--motion-fade)] hover:text-[var(--copper-ink)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--focus)]"
        style={{ color: active ? 'var(--copper-ink)' : 'var(--ink-tertiary)' }}
      >
        {label}
        {active ? (
          <IconChevronDown
            size={12}
            stroke={2}
            aria-hidden
            className="transition-transform duration-[var(--motion-fade)]"
            style={{ transform: direction === 'asc' ? 'rotate(180deg)' : 'none' }}
          />
        ) : (
          <IconSelector size={12} stroke={1.5} aria-hidden className="opacity-40" />
        )}
      </button>
    </th>
  );
}
