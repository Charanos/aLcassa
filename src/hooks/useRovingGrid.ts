'use client';

import { useCallback, useRef, useState } from 'react';

/**
 * Sheet 13 · "Focus order." A data grid is ONE tab stop, not one per row:
 * "fifty-six rows would otherwise be fifty-six tab stops." Arrow keys move
 * between rows within the grid; ↵ opens the focused row; → steps into that
 * row's own actions (a menu button, a link) rather than tabbing there.
 *
 * Usage — spread `getRowProps(index)` onto each row's outermost focusable
 * element (`tabIndex`, a ref, and the key handler all come from it), mark
 * exactly one action-holding wrapper per row with `data-row-actions` so →
 * has something to step into, and give that action's own `onKeyDown` a call
 * to `focusIndex(index)` on Escape or ← to step back out:
 *
 *   const grid = useRovingGrid({ count: rows.length, onActivate: openRow });
 *   <tr {...grid.getRowProps(i)}>
 *     ...
 *     <td data-row-actions onKeyDown={(e) => {
 *       if (e.key === 'Escape' || e.key === 'ArrowLeft') grid.focusIndex(i);
 *     }}>
 *       <button>…</button>
 *     </td>
 *   </tr>
 *
 * No positive `tabIndex` anywhere: the active row is 0, every other row is
 * -1, and the roving index moves with the reader rather than the DOM order.
 */
export function useRovingGrid<T extends HTMLElement = HTMLElement>(options: {
  count: number;
  /** Fires on ↵ for the focused row. */
  onActivate?: (index: number) => void;
  /** Whether Home/⌘↑ jumps to 0 wraps past the ends on ↑/↓. Off by default —
   *  a grid where ↓ from the last row loops to the first is a common source
   *  of "where did my focus go" confusion. */
  loop?: boolean;
}) {
  const { count, onActivate, loop = false } = options;
  const [activeIndex, setActiveIndex] = useState(0);
  const rowRefs = useRef<Array<T | null>>([]);

  const focusIndex = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(count - 1, index));
      setActiveIndex(clamped);
      rowRefs.current[clamped]?.focus();
    },
    [count],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = index + 1 >= count ? (loop ? 0 : index) : index + 1;
          focusIndex(next);
          return;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = index - 1 < 0 ? (loop ? count - 1 : index) : index - 1;
          focusIndex(prev);
          return;
        }
        case 'Home':
          e.preventDefault();
          focusIndex(0);
          return;
        case 'End':
          e.preventDefault();
          focusIndex(count - 1);
          return;
        case 'ArrowRight': {
          const row = rowRefs.current[index];
          const actionZone = row?.querySelector<HTMLElement>('[data-row-actions]');
          const target = actionZone?.querySelector<HTMLElement>('a, button, [tabindex]');
          if (target) {
            e.preventDefault();
            target.focus();
          }
          return;
        }
        case 'Enter':
          if (onActivate) {
            e.preventDefault();
            onActivate(index);
          }
          return;
        default:
          return;
      }
    },
    [count, loop, focusIndex, onActivate],
  );

  const getRowProps = useCallback(
    (index: number) => ({
      ref: (el: T | null) => {
        rowRefs.current[index] = el;
      },
      tabIndex: index === activeIndex ? 0 : -1,
      onFocus: () => setActiveIndex(index),
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, index),
    }),
    [activeIndex, handleKeyDown],
  );

  return { activeIndex, focusIndex, getRowProps };
}
