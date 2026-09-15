'use client';

import { useState } from 'react';
import {
  IconAlertTriangle,
  IconPointer,
  IconFilter,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconClock,
  IconDatabase,
  IconBrain,
  IconServerBolt,
  IconTag,
  type Icon as TablerIcon,
} from '@tabler/icons-react';

interface Decision {
  question: string;
  severity: 'blocking' | 'proposal' | 'advisory';
  blocks: string;
  when: string;
  detail: string;
  where: string;
  category?: Category;
}

/**
 * Named separately rather than reached for as `Decision['category']`. That
 * field is OPTIONAL, so its type includes `undefined`, which cannot be a
 * `Record` key and cannot be a discriminant. `deriveCategory` exists precisely
 * to turn the optional field into a guaranteed one, so everything downstream
 * of it wants this type, not the field's.
 */
type Category = 'schema' | 'architecture' | 'compliance' | 'ai';

function deriveCategory(d: Decision): Category {
  if (d.category) return d.category;
  const q = (d.question + ' ' + d.detail).toLowerCase();
  if (
    q.includes('schema') ||
    q.includes('tier') ||
    q.includes('table') ||
    q.includes('plan') ||
    q.includes('suspend')
  )
    return 'schema';
  if (
    q.includes('embed') ||
    q.includes('vector') ||
    q.includes('ai') ||
    q.includes('rule') ||
    q.includes('precedence')
  )
    return 'ai';
  if (
    q.includes('support') ||
    q.includes('role') ||
    q.includes('permission') ||
    q.includes('access')
  )
    return 'architecture';
  return 'compliance';
}

const CATEGORY_META: Record<Category, { label: string; icon: TablerIcon; color: string }> = {
  schema: { label: 'Schema', icon: IconDatabase, color: 'var(--blue-500)' },
  architecture: { label: 'Architecture', icon: IconServerBolt, color: 'var(--ink-600)' },
  compliance: { label: 'Compliance', icon: IconCheck, color: 'var(--green-500)' },
  ai: { label: 'AI / Rules', icon: IconBrain, color: 'var(--amber-500)' },
};

type FilterKey = 'all' | 'blocking' | Category;

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'blocking', label: 'Blocking' },
  { key: 'schema', label: 'Schema' },
  { key: 'architecture', label: 'Architecture' },
  { key: 'ai', label: 'AI / Rules' },
  { key: 'compliance', label: 'Compliance' },
];

export function InteractiveDecisionMatrix({ decisions }: { decisions: Decision[] }) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = decisions.filter((d) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'blocking') return d.severity === 'blocking';
    return deriveCategory(d) === activeFilter;
  });

  const blockingCount = decisions.filter((d) => d.severity === 'blocking').length;

  return (
    <div>
      {/* Summary strip */}
      <div
        className="mb-5 flex flex-wrap items-center gap-4 rounded-[16px] px-6 py-4"
        style={{
          background: 'white',
          boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
        }}
      >
        <IconAlertTriangle size={18} style={{ color: 'var(--amber-500)', flexShrink: 0 }} />
        <span className="t-compact text-[var(--text-secondary)]">
          <strong className="text-[var(--amber-600)]">{blockingCount} blocking</strong> — schema or
          policy changes that cannot wait for a convenient moment.
        </span>
        <span className="t-eyebrow ml-auto text-[var(--text-tertiary)] opacity-70">
          {decisions.length} total
        </span>
      </div>

      {/* Filter tabs */}
      <div
        className="mb-4 flex flex-wrap items-center gap-1 rounded-[24px] p-2"
        style={{ background: 'var(--surface-sunken)' }}
        role="tablist"
        aria-label="Filter decisions"
      >
        <IconFilter
          size={15}
          style={{ color: 'var(--ink-300)', marginLeft: '6px', marginRight: '4px' }}
        />
        {FILTERS.map((f) => {
          const count =
            f.key === 'all'
              ? decisions.length
              : f.key === 'blocking'
                ? decisions.filter((d) => d.severity === 'blocking').length
                : decisions.filter((d) => deriveCategory(d) === f.key).length;

          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={activeFilter === f.key}
              onClick={() => setActiveFilter(f.key)}
              className="t-eyebrow inline-flex items-center gap-1.5 rounded-full px-4 py-2 transition-all duration-[var(--motion-fade)]"
              style={
                activeFilter === f.key
                  ? {
                      background: 'white',
                      color: 'var(--blue-500)',
                      boxShadow: 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
                    }
                  : { color: 'var(--text-tertiary)' }
              }
            >
              {f.label}
              <span
                className="rounded-full px-1.5 py-px"
                style={{
                  background: activeFilter === f.key ? 'var(--blue-50)' : 'var(--surface-base)',
                  color: activeFilter === f.key ? 'var(--blue-500)' : 'var(--ink-300)',
                  fontSize: '10px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Decision rows */}
      <div className="grid gap-2" data-reveal-group role="tabpanel">
        {filtered.length === 0 && (
          <div
            className="rounded-panel border px-5 py-8 text-center"
            style={{ borderColor: 'var(--ink-100)', background: 'var(--surface-sunken)' }}
          >
            <span className="t-compact text-[var(--ink-300)]">No decisions in this category.</span>
          </div>
        )}

        {filtered.map((decision) => {
          const isBlocking = decision.severity === 'blocking';
          const cat = deriveCategory(decision) ?? 'compliance';
          const catMeta = CATEGORY_META[cat];
          const CatIcon = catMeta.icon;
          const isExpanded = expandedId === decision.question;

          return (
            <div
              key={decision.question}
              data-reveal
              className="rounded-[16px] transition-all duration-[var(--motion-standard)]"
              style={{
                background: 'white',
                boxShadow: isBlocking
                  ? '-3px -3px 12px color-mix(in oklab, var(--amber-500) 8%, transparent), 4px 5px 18px color-mix(in oklab, var(--amber-500) 8%, transparent), 0 0 0 1px color-mix(in oklab, var(--amber-500) 30%, var(--border-subtle) 70%), var(--shadow-sm)'
                  : 'var(--shadow-sm), 0 0 0 1px var(--border-subtle)',
              }}
            >
              {/* Row header — always visible */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : decision.question)}
                className="flex w-full items-start gap-3 px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--border-focus)]"
                aria-expanded={isExpanded}
              >
                {/* Severity icon */}
                <span className="mt-0.5 shrink-0">
                  {isBlocking ? (
                    <IconAlertTriangle size={16} style={{ color: 'var(--amber-500)' }} />
                  ) : (
                    <IconPointer size={16} style={{ color: 'var(--ink-600)' }} />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  {/* Title row */}
                  <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="t-panel text-[var(--text-primary)]">{decision.question}</span>
                    {/* Category pill */}
                    <span
                      className="t-eyebrow inline-flex items-center gap-1 rounded-chip px-2 py-0.5"
                      style={{
                        background: 'var(--surface-base)',
                        color: catMeta.color,
                        border: '1px solid var(--ink-100)',
                      }}
                    >
                      <CatIcon size={10} />
                      {catMeta.label}
                    </span>
                    {/* Severity chip */}
                    <span
                      className="t-eyebrow rounded-chip px-2 py-0.5"
                      style={{
                        background: isBlocking ? 'var(--amber-500)' : 'var(--ink-50)',
                        color: isBlocking ? 'var(--text-inverse)' : 'var(--ink-600)',
                      }}
                    >
                      {isBlocking ? `Blocks ${decision.blocks}` : 'Proposal'}
                    </span>
                    <span className="t-eyebrow ml-auto text-[var(--text-tertiary)]">
                      {decision.when}
                    </span>
                  </span>

                  {/* Collapsed summary */}
                  {!isExpanded && (
                    <span
                      className="t-caption mt-1 block text-[var(--text-secondary)]"
                      style={{ maxWidth: 'var(--measure-prose)' }}
                    >
                      {decision.detail.slice(0, 110)}
                      {decision.detail.length > 110 ? '…' : ''}
                    </span>
                  )}
                </span>

                {/* Expand chevron */}
                <span className="ml-2 shrink-0 text-[var(--ink-300)]">
                  {isExpanded ? <IconChevronUp size={15} /> : <IconChevronDown size={15} />}
                </span>
              </button>

              {/* Expanded body */}
              {isExpanded && (
                <div
                  className="border-t px-5 pt-4 pb-5"
                  style={{
                    borderColor: isBlocking
                      ? 'color-mix(in oklab, var(--amber-500) 38%, var(--surface-base))'
                      : 'var(--ink-100)',
                  }}
                >
                  <p
                    className="t-compact text-[var(--text-secondary)]"
                    style={{ maxWidth: 'var(--measure-prose)' }}
                  >
                    {decision.detail}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <IconClock size={13} style={{ color: 'var(--ink-300)' }} />
                      <span className="t-caption text-[var(--text-tertiary)]">
                        Due: {decision.when}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <IconTag size={13} style={{ color: 'var(--ink-300)' }} />
                      <span className="t-caption text-[var(--text-tertiary)]">
                        Drawn and specified in {decision.where}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
