import 'server-only';
import { currentPlatformSessionOrNull } from '@/lib/auth/resolve';
import { withActorContext } from '@/lib/db';
import { readPlatformSettings } from '@/modules/platform';
import { parseActor } from './auditVocabulary';

/**
 * The platform settings row, as the signed-in operator sees it. Doc 23 · S0.2.
 *
 * Same contract as the other live readers: `null` with no platform session,
 * which is the review bypass, and the page falls back to the designed fixture
 * with saving disabled — there is nobody to attribute a change to.
 *
 * ⚠ AN ACTOR CONTEXT, NOT `withoutTenantContext`. Both halves of this read —
 * the row and the last `platform.settings_updated` entry — are behind policies
 * that admit a platform admin and nobody else. With no actor, both return
 * nothing, and the page would render "not saved yet" over a stored row.
 * `tests/console/audit-readers.test.ts` holds every reader to this.
 */

export type LiveSettings = {
  platformName: string;
  supportEmail: string;
  /** ISO. Sent back with a save, so a save over someone else's is refused. */
  updatedAt: string;
  lastChange: { by: string; at: string; fields: string[] } | null;
};

const WHEN = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Africa/Nairobi',
});

export async function getLiveSettings(): Promise<LiveSettings | null> {
  const ctx = await currentPlatformSessionOrNull();
  if (!ctx) return null;

  const record = await withActorContext(ctx.actorId, ctx.requestId, (tx) =>
    readPlatformSettings(tx),
  );
  if (!record) return null;

  return {
    platformName: record.platformName,
    supportEmail: record.supportEmail,
    updatedAt: record.updatedAt.toISOString(),
    lastChange: record.lastChange
      ? {
          by: parseActor(record.lastChange.by).name,
          at: `${WHEN.format(record.lastChange.at)} EAT`,
          fields: record.lastChange.fields,
        }
      : null,
  };
}
