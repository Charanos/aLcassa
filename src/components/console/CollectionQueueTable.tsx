'use client';

import Link from '@/components/structure/NavigationLink';
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

  if (collections.length === 0) {
    return (
      <p className="t-body p-6" style={{ color: 'var(--text-secondary)' }}>
        No workspaces currently require payment follow-up.
      </p>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden p-4 sm:block">
        <div
          className="relative overflow-hidden rounded-card"
          style={{
            background: 'var(--surface-raised)',
            border: '1px solid color-mix(in srgb, var(--border-subtle) 15%, transparent)',
            boxShadow: 'var(--shadow-sm), var(--glass-highlight)',
          }}
        >
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">Workspaces with estimated amounts due in KES</caption>
            <colgroup>
              <col style={{ width: '34%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr
                style={{ background: 'color-mix(in srgb, var(--surface-sunken) 30%, transparent)' }}
              >
                {['Workspace', 'Plan', 'Estimated due (KES)', 'Days overdue', 'Status'].map(
                  (h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className="h-11"
                      style={{
                        padding: i === 0 ? '0 24px' : i === 4 ? '0 24px' : '0 12px',
                        textAlign: i >= 2 ? 'right' : 'left',
                        borderBottom:
                          '1px solid color-mix(in srgb, var(--border-subtle) 25%, transparent)',
                        font: '500 var(--type-compact)/1.4 var(--font-ui)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {collections.map((c, i) => (
                <tr
                  key={c.id}
                  {...grid.getRowProps(i)}
                  className="group cursor-pointer transition-colors hover:bg-[var(--surface-inset)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--blue-500)]"
                  style={{ height: 56 }}
                >
                  <td
                    className="overflow-hidden border-b border-[color-mix(in_srgb,var(--border-subtle)_20%,transparent)] group-last:border-0"
                    style={{ padding: '0 24px' }}
                    data-row-actions
                  >
                    <Link
                      href={`/platform/tenants/${c.slug}`}
                      tabIndex={-1}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' || e.key === 'ArrowLeft') {
                          e.preventDefault();
                          grid.focusIndex(i);
                        }
                      }}
                      className="block truncate transition-colors group-hover:text-[var(--blue-600)]"
                      style={{
                        font: '500 var(--type-body)/1.4 var(--font-ui)',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td
                    className="border-b border-[color-mix(in_srgb,var(--border-subtle)_20%,transparent)] group-last:border-0"
                    style={{ padding: '0 12px' }}
                  >
                    <span
                      style={{
                        font: '400 var(--type-compact)/1 var(--font-mono)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {c.plan}
                    </span>
                  </td>
                  <td
                    className="border-b border-[color-mix(in_srgb,var(--border-subtle)_20%,transparent)] group-last:border-0"
                    style={{ padding: '0 12px', textAlign: 'right' }}
                  >
                    <span
                      className="numeric"
                      style={{
                        fontSize: 'var(--type-body)',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      {c.amount}
                    </span>
                    <span
                      className="mt-1 block"
                      style={{
                        font: '400 var(--type-chip)/1 var(--font-mono)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {c.periods} × {c.monthly}
                    </span>
                  </td>
                  <td
                    className="border-b border-[color-mix(in_srgb,var(--border-subtle)_20%,transparent)] group-last:border-0"
                    style={{ padding: '0 12px', textAlign: 'right' }}
                  >
                    <span
                      style={{
                        font: '400 var(--type-compact)/1 var(--font-mono)',
                        color: lateInk(c.days),
                      }}
                    >
                      {c.days} {c.days === 1 ? 'day' : 'days'}
                    </span>
                  </td>
                  <td
                    className="border-b border-[color-mix(in_srgb,var(--border-subtle)_20%,transparent)] group-last:border-0"
                    style={{ padding: '0 24px', textAlign: 'right' }}
                  >
                    <span
                      style={{
                        font: '400 var(--type-compact)/1 var(--font-mono)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {c.state}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
                  font: '500 var(--type-compact)/1.35 var(--font-ui)',
                  color: 'var(--text-primary)',
                }}
              >
                {c.name}
              </span>
              <span
                className="shrink-0 whitespace-nowrap"
                style={{ font: '400 var(--type-chip)/1 var(--font-mono)', color: lateInk(c.days) }}
              >
                {c.days} {c.days === 1 ? 'day' : 'days'} overdue
              </span>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3">
              <span
                style={{
                  font: '400 var(--type-chip)/1 var(--font-mono)',
                  color: 'var(--text-tertiary)',
                }}
              >
                {c.plan} · {c.state}
              </span>
              <span className="numeric" style={{ fontSize: 'var(--type-compact)' }}>
                KES {c.amount}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
