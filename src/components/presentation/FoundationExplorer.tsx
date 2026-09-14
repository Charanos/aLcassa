'use client';

import { useMemo, useState } from 'react';
import {
  IconCircleCheck,
  IconClockHour3,
  IconMinus,
  IconSearch,
  IconX,
  type Icon as TablerIcon,
} from '@tabler/icons-react';
import { Checkbox, SegmentedControl, Select, SortHeader } from './Controls';
import { DataList, type Column } from './DataList';
import { StatusChip, type Tone } from './Sheet';
import { CategoryBars, ProportionDonut, useToneColors } from './Charts';
import type { FoundationItem, FoundationState } from '@/lib/presentation/foundation';

/**
 * The foundation explorer.
 *
 * Twenty-four rows is exactly the size at which a reader stops reading and
 * starts interrogating, and the questions are always the same three: what is
 * done, what is half done, and what has not started. So the surface answers
 * them structurally rather than making a person scan.
 *
 * The chart above the table is not decoration. It answers the shape question
 * ("is this mostly built?") in one glance, and the table answers the detail
 * question. Both read from the same filtered set, so the chart moves with the
 * filters and the two can never disagree.
 */

const STATE: Record<FoundationState, { icon: TablerIcon; tone: Tone; label: string }> = {
  built: { icon: IconCircleCheck, tone: 'verdigris', label: 'Built' },
  scaffolded: { icon: IconClockHour3, tone: 'ochre', label: 'Scaffolded' },
  planned: { icon: IconMinus, tone: 'graphite', label: 'Planned' },
};

type SortKey = 'area' | 'what' | 'state' | 'milestone';
const STATE_ORDER: FoundationState[] = ['built', 'scaffolded', 'planned'];

export function FoundationExplorer({ items }: { items: FoundationItem[] }) {
  const toneColors = useToneColors();
  const [states, setStates] = useState<Set<FoundationState>>(new Set(STATE_ORDER));
  const [areas, setAreas] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [dimension, setDimension] = useState<'area' | 'milestone'>('area');
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({
    key: 'area',
    dir: 'asc',
  });

  const allAreas = useMemo(
    () => [...new Set(items.map((item) => item.area))].sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const counts = useMemo(
    () =>
      STATE_ORDER.reduce<Record<FoundationState, number>>(
        (acc, state) => {
          acc[state] = items.filter((item) => item.state === state).length;
          return acc;
        },
        { built: 0, scaffolded: 0, planned: 0 },
      ),
    [items],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (!states.has(item.state)) return false;
      if (areas !== 'all' && item.area !== areas) return false;
      if (!q) return true;
      return [item.what, item.area, item.evidence, item.milestone]
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    const direction = sort.dir === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      if (sort.key === 'state') {
        return (STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state)) * direction;
      }
      return a[sort.key].localeCompare(b[sort.key]) * direction;
    });
  }, [items, states, areas, query, sort]);

  /**
   * The chart reads the FILTERED set, so it can never contradict the table
   * beneath it. Switching the dimension re-buckets the same rows rather than
   * fetching anything, which is why it is instant.
   */
  const breakdown = useMemo(() => {
    const map = new Map<string, number>();
    visible.forEach((item) => {
      const key = dimension === 'area' ? item.area : item.milestone;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  }, [visible, dimension]);

  function toggleState(state: FoundationState, on: boolean) {
    const next = new Set(states);
    if (on) next.add(state);
    else next.delete(state);
    // Never let the reader filter their way to an empty screen by accident.
    if (next.size === 0) return;
    setStates(next);
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' },
    );
  }

  const filtersActive = states.size !== STATE_ORDER.length || areas !== 'all' || query !== '';

  const columns: Array<Column<FoundationItem>> = [
    {
      key: 'area',
      header: 'Area',
      width: '132px',
      muted: true,
      cell: (row) => row.area,
    },
    {
      key: 'what',
      header: 'What',
      primary: true,
      cell: (row) => row.what,
    },
    {
      key: 'state',
      header: 'State',
      width: '140px',
      badge: true,
      cell: (row) => {
        const spec = STATE[row.state];
        return (
          <StatusChip tone={spec.tone} icon={spec.icon} size="sm">
            {spec.label}
          </StatusChip>
        );
      },
    },
    {
      key: 'evidence',
      header: 'Where to look',
      width: '26%',
      mono: true,
      muted: true,
      cell: (row) => row.evidence,
    },
    {
      key: 'milestone',
      header: 'Milestone',
      width: '110px',
      mono: true,
      muted: true,
      cell: (row) => row.milestone,
    },
  ];

  return (
    <div>
      {/* ── The shape, before the detail ─────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div
          className="rounded-panel border p-5"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <h3 className="t-micro text-[var(--text-tertiary)]">Readiness</h3>
          <p className="t-caption mt-1 mb-4 text-[var(--text-tertiary)]">
            {visible.length} of {items.length} items shown
          </p>
          <ProportionDonut
            centerLabel={{ value: visible.length, caption: 'shown' }}
            segments={STATE_ORDER.map((state) => ({
              label: STATE[state].label,
              value: visible.filter((item) => item.state === state).length,
              ink: toneColors[STATE[state].tone],
              hatch: state === 'planned',
            }))}
          />
        </div>

        <div
          className="rounded-panel border p-5"
          style={{
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="t-micro text-[var(--text-tertiary)]">Items by</h3>
            <SegmentedControl
              label="Chart dimension"
              value={dimension}
              onChange={setDimension}
              options={[
                { value: 'area', label: 'Area' },
                { value: 'milestone', label: 'Milestone' },
              ]}
            />
          </div>
          <CategoryBars
            data={breakdown}
            height={Math.max(150, breakdown.length * 34)}
            labelWidth={dimension === 'area' ? 104 : 84}
          />
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div
        data-slot="toolbar"
        className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-panel border px-4 py-3"
        style={{
          background: 'var(--surface-raised)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <fieldset className="flex flex-wrap items-center gap-x-4">
          <legend className="visually-hidden">Filter by state</legend>
          {STATE_ORDER.map((state) => (
            <Checkbox
              key={state}
              checked={states.has(state)}
              onChange={(on) => toggleState(state, on)}
              label={STATE[state].label}
              count={counts[state]}
              tone={`var(--${STATE[state].tone}-ink)`}
            />
          ))}
        </fieldset>

        <Select
          label="Area"
          value={areas}
          onChange={setAreas}
          options={[
            { value: 'all', label: 'Every area' },
            ...allAreas.map((area) => ({ value: area, label: area })),
          ]}
        />

        <label
          className="flex items-center gap-2 rounded-chip border px-3"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--surface-sunken)',
            minHeight: '34px',
          }}
        >
          <IconSearch size={14} stroke={1.5} aria-hidden className="text-[var(--text-tertiary)]" />
          <span className="visually-hidden">Filter these items</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter"
            className="t-compact w-24 bg-transparent outline-none placeholder:text-[var(--text-tertiary)]"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear the filter"
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <IconX size={13} stroke={1.5} />
            </button>
          ) : null}
        </label>

        {filtersActive ? (
          <button
            type="button"
            onClick={() => {
              setStates(new Set(STATE_ORDER));
              setAreas('all');
              setQuery('');
            }}
            className="t-caption ml-auto text-[var(--blue-500)] underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
          >
            Reset
          </button>
        ) : null}
      </div>

      {/* ── The detail ───────────────────────────────────────────────── */}
      <div className="mt-3">
        <DataList
          rows={visible}
          columns={columns}
          rowKey={(row) => `${row.area}-${row.what}`}
          caption={`Foundation status, ${visible.length} of ${items.length} items`}
          head={
            <thead>
              <tr>
                <SortHeader
                  label="Area"
                  width="132px"
                  active={sort.key === 'area'}
                  direction={sort.dir}
                  onSort={() => toggleSort('area')}
                />
                <SortHeader
                  label="What"
                  active={sort.key === 'what'}
                  direction={sort.dir}
                  onSort={() => toggleSort('what')}
                />
                <SortHeader
                  label="State"
                  width="140px"
                  active={sort.key === 'state'}
                  direction={sort.dir}
                  onSort={() => toggleSort('state')}
                />
                <th
                  scope="col"
                  className="t-micro border-b px-4 py-3 text-left text-[var(--text-tertiary)]"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    background: 'var(--surface-sunken)',
                    width: '26%',
                  }}
                >
                  Where to look
                </th>
                <SortHeader
                  label="Milestone"
                  width="110px"
                  active={sort.key === 'milestone'}
                  direction={sort.dir}
                  onSort={() => toggleSort('milestone')}
                />
              </tr>
            </thead>
          }
          empty={
            <div>
              <p className="t-compact text-[var(--text-secondary)]">
                Nothing matches those filters.
              </p>
              <button
                type="button"
                onClick={() => {
                  setStates(new Set(STATE_ORDER));
                  setAreas('all');
                  setQuery('');
                }}
                className="t-compact mt-2 text-[var(--blue-500)] underline underline-offset-2"
              >
                Reset them
              </button>
            </div>
          }
        />
      </div>

      <p className="t-caption mt-2 text-[var(--text-tertiary)]" role="status" aria-live="polite">
        Showing {visible.length} of {items.length}.
      </p>
    </div>
  );
}
