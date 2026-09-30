'use server';

import { getSupportVisit, type SupportVisit, type VisitEvent } from '@/lib/console/liveSupport';
import { logger } from '@/lib/logger';

/**
 * One visit's timeline, for the register's detail view. Doc 24 · Stage 5.
 *
 * The id comes from the browser, so it is checked for shape before it reaches
 * a query — a malformed id is "not found", not a database error.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VisitTimelineResult =
  { ok: true; visit: SupportVisit; events: VisitEvent[] } | { ok: false; error: string };

export async function fetchSupportVisit(sessionId: string): Promise<VisitTimelineResult> {
  if (!UUID.test(sessionId)) return { ok: false, error: 'That visit does not exist.' };
  try {
    const result = await getSupportVisit(sessionId);
    return result
      ? { ok: true, ...result }
      : { ok: false, error: 'That visit does not exist, or you are not signed in as an operator.' };
  } catch (error) {
    logger.error('support visit timeline could not be read', { sessionId, error });
    return { ok: false, error: 'The timeline could not be read. The visit itself is unaffected.' };
  }
}
