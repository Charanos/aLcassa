'use client';

import { useEffect, useState } from 'react';

/**
 * Milliseconds left until an absolute deadline, re-derived every second —
 * or `null` until the component has mounted.
 *
 * ⚠ NULL ON THE SERVER, AND THAT IS THE FIX FOR A HYDRATION FAILURE. The
 * banner computed its clock from `Date.now()` during render: the server
 * rendered "25:47", the browser hydrated at "25:44", React threw a mismatch
 * and the tree under the console shell was torn down. It never surfaced
 * because no support session had ever been open when anyone looked. A clock
 * cannot agree across two machines a second apart, so it is not rendered
 * until the browser owns it.
 *
 * Derived, not counted: a refresh, a throttled background tab or a resumed
 * laptop all show the true remaining time, because the server's `expiresAt`
 * is the only clock.
 */
export function useDeadline(iso: string): number | null {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Date.parse(iso) - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [iso]);
  return left;
}

export function clock(ms: number | null): string {
  if (ms === null) return '--:--';
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
