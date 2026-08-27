'use client';

import Link from 'next/link';
import { useRovingGrid } from '@/hooks/useRovingGrid';
import type { Collection } from '@/lib/console/data';

/** Escalating rather than categorical: the question is "how late", not "which
 *  bucket". Over 60 days is a write-off conversation, not a retry. */
function lateInk(days: number): string {
  if (days > 60) return 'var(--danger-fg)';
  if (days > 5) return 'var(--warning-fg)';
  return 'var(--text-secondary)';
}

/**
 * Revenue's collection queue. A client island only because roving tabindex
 * needs hook state — sheet 13's grid-is-one-tab-stop applies here too, even
 * at the five-row fixture size today, since the real table has no bound.
 */
export function CollectionQueueTable({ collections }: { collections: Collection[] }) {
  const grid = useRovingGrid<HTMLTableRowElement>({
    count: collections.length,
    onActivate: (i) => {
      const c = collections[i];
      if (c) window.location.assign(`/platform/tenants/${c.slug}`);
    },
  });

  return (
    <>
      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col style={{ width: '34%' }} />
            <col style={{ width: '18%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '16%' }} />
            <col style={{ width: '16%' }} />
          </colgroup>
          <thead>
            <tr style={{ background: 'var(--surface-sunken)' }}>
              {['Workspace', 'Invoice', 'Amount', 'Late', 'Attempts'].map((h, i) => (
                <th
                  key={h}
                  scope="col"
                  className="h-9"
                  style={{
                    padding: i === 0 ? '0 16px' : i === 4 ? '0 16px' : '0 8px',
                    textAlign: i >= 2 ? 'right' : 'left',
                    borderBottom: '1px solid var(--border-subtle)',
                    font: '500 11px/1 var(--font-ui)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {collections.map((c, i) => (
              <tr
                key={c.id}
                {...grid.getRowProps(i)}
                className="cursor-pointer transition-colors hover:bg-[var(--surface-sunken)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--blue-500)]"
                style={{ height: 44, borderBottom: '1px solid var(--border-subtle)' }}
              >
                <td className="overflow-hidden" style={{ padding: '0 16px' }} data-row-actions>
                  <Link
                    href={`/platform/tenants/${c.slug}`}
                    tabIndex={-1}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' || e.key === 'ArrowLeft') {
                        e.preventDefault();
                        grid.focusIndex(i);
                      }
                    }}
                    className="block truncate transition-colors hover:text-[var(--text-action)]"
                    style={{
                      font: '400 var(--text-sm)/1.3 var(--font-ui)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {c.name}
                  </Link>
                </td>
                <td style={{ padding: '0 8px' }}>
                  <span
                    style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--text-secondary)' }}
                  >
                    {c.invoice}
                  </span>
                </td>
                <td style={{ padding: '0 8px', textAlign: 'right' }}>
                  <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                    {c.amount}
                  </span>
                </td>
                <td style={{ padding: '0 8px', textAlign: 'right' }}>
                  <span
                    style={{
                      font: '400 var(--text-sm)/1 var(--font-mono)',
                      color: lateInk(c.days),
                    }}
                  >
                    {c.days} {c.days === 1 ? 'day' : 'days'}
                  </span>
                </td>
                <td style={{ padding: '0 16px', textAlign: 'right' }}>
                  <span
                    style={{
                      font: '400 var(--text-sm)/1 var(--font-mono)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {c.attempts}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-2 p-4 sm:hidden">
        {collections.map((c) => (
          <Link
            key={c.id}
            href={`/platform/tenants/${c.slug}`}
            className="block rounded-panel p-3"
            style={{ border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-start justify-between gap-3">
              <span
                className="min-w-0 flex-1"
                style={{
                  font: '500 var(--text-sm)/1.35 var(--font-ui)',
                  color: 'var(--text-primary)',
                }}
              >
                {c.name}
              </span>
              <span
                className="shrink-0 whitespace-nowrap"
                style={{ font: '400 11px/1 var(--font-mono)', color: lateInk(c.days) }}
              >
                {c.days}d late
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span style={{ font: '400 11px/1 var(--font-mono)', color: 'var(--text-tertiary)' }}>
                {c.invoice} · {c.attempts}
              </span>
              <span className="numeric" style={{ fontSize: 'var(--text-sm)' }}>
                {c.amount}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
