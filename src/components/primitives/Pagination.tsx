'use client';

import { Children, useMemo, useState } from 'react';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

/**
 * 03 §9 Tier 5 · §20. "Infinite scroll in a console → cursor pagination."
 *
 * ⚠ IT IS A RULE, NOT A BOX.
 *
 * A pager drawn as a bordered bar under a list reads as a second component
 * that arrived with the data, and it breaks the vertical rhythm of exactly the
 * surface it is meant to serve. This one is a hairline and a row: the rule ties
 * it to the list above the way a table's footer rule does, and nothing about it
 * is a container. Put it directly after a list with no wrapper of its own.
 *
 * ⚠ THE RANGE READOUT IS ON THE LEFT AND IS NOT DECORATION. "6–10 of 23" is
 * the only thing on a pager that answers the question a reader actually has,
 * which is how much is left. A row of numbered buttons answers "where am I",
 * which they can already see.
 *
 * ⚠ THE PAGE RUN ELIDES RATHER THAN GROWING. Past seven pages the middle
 * collapses to an ellipsis, so the control's WIDTH IS BOUNDED. A pager that
 * grows with the dataset is a layout that reflows the moment a customer signs
 * up, which is the opposite of what a console wants.
 *
 * ⚠ IT RENDERS NOTHING AT ALL FOR A SINGLE PAGE. Four items and a pager saying
 * "1–4 of 4 · page 1 of 1" is furniture explaining itself. The caller does not
 * have to guard the call site; this guards itself, which is what keeps an empty
 * list, a short list and a long list on the same code path.
 */

export type PaginationProps = {
  /** One-based. */
  page: number;
  pageSize: number;
  /** Total items across every page, not the current page's length. */
  total: number;
  onPage: (page: number) => void;
  /**
   * The noun in the readout, plural. "workspaces", "entries", "sessions".
   * Required rather than defaulted to "items": every list in this console is a
   * list of something specific, and "1–5 of 23 items" is a sentence nobody
   * would write by hand.
   */
  noun: string;
  /** Labels the control for assistive technology. Defaults from `noun`. */
  label?: string;
};

/** How many numbered pages to show before the run starts eliding. */
const RUN_MAX = 7;

/**
 * The page numbers to draw, with `null` marking an elision.
 *
 * Always shows the first page, the last page, and a window around the current
 * one. The window is what keeps "next" and "previous" meaningful next to the
 * numbers rather than redundant with them.
 */
function runOf(page: number, pageCount: number): Array<number | null> {
  if (pageCount <= RUN_MAX) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  const out: Array<number | null> = [1];
  const from = Math.max(2, page - 1);
  const to = Math.min(pageCount - 1, page + 1);

  if (from > 2) out.push(null);
  for (let p = from; p <= to; p++) out.push(p);
  if (to < pageCount - 1) out.push(null);
  out.push(pageCount);

  return out;
}

export function Pagination({ page, pageSize, total, onPage, noun, label }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const run = useMemo(() => runOf(page, pageCount), [page, pageCount]);

  /* See the header note: one page needs no pager. */
  if (pageCount <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={label ?? `${noun} pages`}
      className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-6"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <p
        className="flex-1 whitespace-nowrap"
        style={{
          font: '400 12px/1 var(--font-mono)',
          color: 'var(--text-tertiary)',
          letterSpacing: '-0.01em',
        }}
      >
        <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
          {first}&ndash;{last}
        </span>{' '}
        <span className="opacity-70">
          of {total} {noun}
        </span>
      </p>

      <div className="flex items-center gap-1.5">
        <Step direction="previous" disabled={page <= 1} onClick={() => onPage(page - 1)} />

        {run.map((p, i) =>
          p === null ? (
            <span
              key={`gap-${i}`}
              aria-hidden
              className="grid size-8 place-items-center"
              style={{ font: '400 12px/1 var(--font-mono)', color: 'var(--text-disabled)' }}
            >
              &middot;&middot;&middot;
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? 'page' : undefined}
              className={`grid size-8 cursor-pointer place-items-center rounded-[8px] transition-all duration-300 ${
                p === page
                  ? 'bg-[var(--surface-raised)] shadow-sm ring-1 ring-[var(--border-subtle)]'
                  : 'hover:bg-black/[0.03]'
              }`}
              style={{
                color: p === page ? 'var(--text-primary)' : 'var(--text-secondary)',
                font: `${p === page ? 600 : 500} 12px/1 var(--font-mono)`,
              }}
            >
              {p}
            </button>
          ),
        )}

        <Step direction="next" disabled={page >= pageCount} onClick={() => onPage(page + 1)} />
      </div>
    </nav>
  );
}

/**
 * ⚠ A DISABLED STEP STAYS IN THE LAYOUT rather than disappearing at the ends.
 * Hiding "previous" on page one moves every number one step left the instant a
 * reader pages forward, and a control that moves under the pointer that is
 * about to press it again is the small cruelty this avoids.
 */
function Step({
  direction,
  disabled,
  onClick,
}: {
  direction: 'previous' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === 'previous' ? IconChevronLeft : IconChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'previous' ? 'Previous page' : 'Next page'}
      className={`grid size-8 place-items-center rounded-[8px] transition-all duration-300 ${
        disabled ? '' : 'hover:bg-black/[0.03]'
      }`}
      style={{
        color: disabled ? 'var(--text-disabled)' : 'var(--text-secondary)',
        cursor: disabled ? 'default' : 'pointer',
        background: 'transparent',
      }}
    >
      <Icon size={16} stroke={2} aria-hidden />
    </button>
  );
}

/**
 * The slice, so a caller never writes the arithmetic twice.
 *
 * ⚠ IT CLAMPS THE PAGE rather than returning an empty slice. A reader on page
 * four whose filter has just cut the list to one page should see that page, not
 * a blank region with a pager insisting there are four. The clamp is here
 * rather than in an effect because deriving it during render cannot fall out of
 * step with the data the way a `useEffect` correcting state after paint can.
 */
export function pageSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safe = Math.min(Math.max(1, page), pageCount);
  return items.slice((safe - 1) * pageSize, safe * pageSize);
}

/**
 * A list that pages its own children, WITHOUT making them client components.
 *
 * ⚠ THIS IS THE WHOLE REASON THE PRIMITIVE IS SHAPED THIS WAY.
 *
 * The obvious build is a client list that receives data and renders rows. That
 * drags every row's markup — prose, badges, links, icons — across the
 * serialisation boundary and re-renders it in the browser, to gain a control
 * that decides which five to show.
 *
 * Passing already-rendered SERVER children through `children` inverts it. The
 * cards are rendered once on the server, shipped as HTML, and this component
 * only chooses a window into an array it never looks inside. A card stays a
 * server component; the pager is the only thing that hydrates.
 *
 * ⚠ IT SHIPS EVERY PAGE'S MARKUP, and that is the deliberate trade. Paging is
 * instant with no round trip, which is right for a list bounded by how many
 * customers need attention. For an unbounded list — an audit log, a message
 * history — this is the wrong component and the right one is a cursor against
 * the query. That reversal point is stated here rather than discovered when a
 * page takes two seconds to arrive.
 */
export function PagedList({
  children,
  pageSize,
  noun,
  className,
  label,
}: {
  children: React.ReactNode;
  pageSize: number;
  noun: string;
  /** Applied to the list wrapper, so the caller keeps its own gap and rhythm. */
  className?: string;
  label?: string;
}) {
  const [page, setPage] = useState(1);
  const items = Children.toArray(children);
  const total = items.length;

  /* Derived during render rather than corrected in an effect: a filter that
     shortens the list should not flash an empty page before a `useEffect`
     notices. Same reasoning as `pageSlice`. */
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), pageCount);

  return (
    <>
      <div className={className}>{pageSlice(items, safePage, pageSize)}</div>
      <Pagination
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPage={setPage}
        noun={noun}
        label={label}
      />
    </>
  );
}
