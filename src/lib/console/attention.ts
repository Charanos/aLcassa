import type { WorkspaceRow } from './data';

/**
 * What "needs attention" means, in one place.
 *
 * ⚠ THIS CANNOT LIVE IN `data.ts`. That file is `server-only`, and the
 * workspace table is a client component — it imports `WorkspaceRow` as a
 * type, which erases at compile time, but a runtime predicate would not.
 *
 * It matters that both sides read the same definition. Sheet 05 puts the
 * count in the page's standfirst ("47 businesses. 3 need attention.") AND
 * pre-applies it as the grid's filter. Those are two different components —
 * a server page and a client table — rendering the same claim, and a console
 * whose sentence and whose filter disagree about which workspaces need work
 * is worse than one that says nothing.
 */

/** The threshold at which a meter turns ochre and a workspace joins the
 *  shortlist. Sheet 04: a ceiling is not a failure, but it is a conversation. */
export const NEAR_LIMIT = 0.9;

export function needsAttention(r: WorkspaceRow): boolean {
  return (
    r.status === 'past due' ||
    r.status === 'suspended' ||
    r.events / r.eventsLimit >= NEAR_LIMIT ||
    r.seatsUsed / r.seatsLimit >= NEAR_LIMIT
  );
}

export function countNeedingAttention(rows: WorkspaceRow[]): number {
  return rows.filter(needsAttention).length;
}
