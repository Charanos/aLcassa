import 'server-only';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { platformAuditLog, platformSettings } from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { withActorContext, type Transaction } from '@/lib/db';
import { asService } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';
import { requireCapability } from './capabilities';
import type { PlatformActor } from './subscriptions';

/**
 * Platform-wide settings: the one row in `platform_settings`. Doc 23 · S0.2.
 *
 * ⚠ READ UNDER ROW LEVEL SECURITY, WRITTEN THROUGH THE PLATFORM DOOR.
 *
 * Operators read the row as themselves (`platform_settings_select` admits a
 * platform admin and nobody else). Nothing grants the application role a
 * write, so a save runs through `asService`, which writes the audit row first
 * and in the same transaction. The row carries the before and the after,
 * holding only the fields that changed — the entry is the diff.
 *
 * ⚠ A SAVE OVER A VERSION THE OPERATOR NEVER SAW IS REFUSED, NOT MERGED.
 *
 * Two operators with the page open, both editing: without a check, the second
 * save silently undoes the first, and the audit row records a `before` that
 * the second operator never looked at. The form sends the `updated_at` it
 * loaded; the write matches on it, and a miss rolls back the audit row with
 * the change. The operator is told to reload, and sees the other version.
 *
 * `updated_at` is compared at millisecond precision. Postgres stores
 * microseconds and a JavaScript `Date` carries milliseconds, so an exact
 * comparison would refuse every save, including the first.
 */

export type PlatformSettingsRecord = {
  platformName: string;
  supportEmail: string;
  updatedAt: Date;
  /** The last save, from the audit log. Null until the first one. */
  lastChange: { by: string; at: Date; fields: string[] } | null;
};

export const platformSettingsSchema = z.object({
  platformName: z
    .string()
    .trim()
    .min(2, 'A platform name needs at least two characters.')
    .max(40, 'Keep the platform name under forty characters — it sits in page titles.'),
  supportEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, 'That address is longer than an email address can be.')
    .email('That is not an email address.'),
});

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;

/** The editable fields, in the order a diff lists them. */
const FIELDS = ['platformName', 'supportEmail'] as const;
type Field = (typeof FIELDS)[number];

export async function readPlatformSettings(
  tx: Transaction,
): Promise<PlatformSettingsRecord | null> {
  const [row] = await tx
    .select({
      platformName: platformSettings.platformName,
      supportEmail: platformSettings.supportEmail,
      updatedAt: platformSettings.updatedAt,
    })
    .from(platformSettings)
    .limit(1);
  if (!row) return null;

  const [last] = await tx
    .select({
      by: platformAuditLog.actorLabel,
      at: platformAuditLog.occurredAt,
      after: platformAuditLog.after,
    })
    .from(platformAuditLog)
    .where(eq(platformAuditLog.action, AUDIT_ACTIONS.PLATFORM_SETTINGS_UPDATED))
    .orderBy(desc(platformAuditLog.occurredAt))
    .limit(1);

  return {
    ...row,
    lastChange: last
      ? {
          by: last.by,
          at: last.at,
          fields: Object.keys((last.after as Record<string, unknown> | null) ?? {}),
        }
      : null,
  };
}

export type PlatformSettingsSaveResult = {
  /** The fields that changed. Empty when the form matched what was stored. */
  changed: Field[];
  updatedAt: Date;
};

export async function updatePlatformSettings(
  input: PlatformSettingsInput & { expectedUpdatedAt: string },
  actor: PlatformActor,
): Promise<PlatformSettingsSaveResult> {
  const parsed = platformSettingsSchema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: parsed.error.issues[0]?.message ?? 'Some of what was sent is not valid.',
    });
  }
  const next = parsed.data;
  const expected = new Date(input.expectedUpdatedAt);
  if (Number.isNaN(expected.getTime())) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'The form did not say which version it was editing. Reload and try again.',
    });
  }

  /* The current row, read as the operator — the same view the page had. */
  const current = await withActorContext(actor.userId, actor.requestId, (tx) =>
    readPlatformSettings(tx),
  );
  if (!current) {
    throw new AppError(ERROR_CODES.PLATFORM_NOT_ADMIN, {
      internal: { reason: 'platform_settings not readable by this actor', actorId: actor.userId },
    });
  }
  if (!sameMillisecond(current.updatedAt, expected)) {
    throw new AppError(ERROR_CODES.PLATFORM_SETTINGS_CONFLICT, {
      internal: { expected: expected.toISOString(), stored: current.updatedAt.toISOString() },
    });
  }

  const changed = FIELDS.filter((f) => current[f] !== next[f]);
  /* Nothing to write, and so nothing to audit: an entry recording that a form
     was saved unchanged is noise in the one log that must stay readable. */
  if (changed.length === 0) return { changed, updatedAt: current.updatedAt };

  const before = Object.fromEntries(changed.map((f) => [f, current[f]]));
  const after = Object.fromEntries(changed.map((f) => [f, next[f]]));

  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.PLATFORM_SETTINGS_UPDATED,
      entityType: 'platform_settings',
      before,
      after,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      /* The change reaches every workspace's customers, so it takes the
         workspace-management capability. Inside the transaction, first: a
         refusal rolls back the audit row with it. */
      await requireCapability(tx, actor.userId, 'manage_workspaces');

      const [row] = await tx
        .update(platformSettings)
        .set({
          platformName: next.platformName,
          supportEmail: next.supportEmail,
          updatedBy: actor.userId,
          updatedAt: sql`now()`,
        })
        .where(
          sql`${platformSettings.singleton} and date_trunc('milliseconds', ${platformSettings.updatedAt}) = ${expected.toISOString()}::timestamptz`,
        )
        .returning({ updatedAt: platformSettings.updatedAt });

      /* Someone saved between the read above and this write. Throwing here
         undoes the audit row too, so the ledger never shows this save. */
      if (!row) {
        throw new AppError(ERROR_CODES.PLATFORM_SETTINGS_CONFLICT, {
          internal: { expected: expected.toISOString(), race: true },
        });
      }
      return { changed, updatedAt: row.updatedAt };
    },
  );
}

function sameMillisecond(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}
