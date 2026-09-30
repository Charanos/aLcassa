import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { masterAiRuleVersions, masterAiRules, type RulesDocument } from '@/db/schema';
import { AUDIT_ACTIONS } from '@/lib/audit';
import { asService } from '@/lib/db/serviceClient';
import { AppError, ERROR_CODES } from '@/lib/errors';
import type { PlatformActor } from './subscriptions';
import { requireCapability } from './capabilities';

/**
 * 05 §7 · 08 §4. The master rule set: publish a new version, or roll back to
 * an earlier one.
 *
 * ⚠ WHY THIS NEEDS `asService` WHEN THE OPERATOR IS THE PLATFORM OWNER.
 *
 * `db/policies/05_airules.sql` gives both master tables a SELECT policy and
 * nothing else. Under `force row level security` that makes them read-only to
 * every ordinary client, including Brian's — which is correct rather than an
 * oversight. These rows are the floor every workspace on the platform
 * inherits; a write path reachable from a normal session is a write path that
 * a bug in any console screen could reach. Platform record operations go
 * through the audited service path, exactly as provisioning, suspension and
 * plan assignment do.
 *
 * The audit row is written BEFORE the work, by `asService` itself, and the
 * whole thing is one transaction. A published rule set with no record of who
 * published it is the failure this arrangement exists to make impossible.
 *
 * ⚠ VERSIONS ARE APPEND-ONLY AND PUBLISHING IS A POINTER MOVE. I-10. Nothing
 * here updates a `content` column, ever. Editing the rules writes a NEW row
 * and moves `master_ai_rules.current_version_id` at it, which is what makes a
 * rollback a pointer move rather than a data restore, and what keeps every
 * historical version readable afterwards.
 */

/** The six fields of the document, as the editor hands them back. */
export type MasterRulesInput = {
  tone: string;
  responseGuidelines: string;
  businessInformation: string;
  escalationInstructions: string;
  /** Newline-separated in the editor; an array in the document. */
  prohibitedTopics: string;
  customInstructions: string;
};

export type PublishedVersion = {
  versionId: string;
  versionNumber: number;
};

/**
 * ⚠ AN EMPTY FIELD IS NOT THE SAME AS AN ABSENT ONE, and the document type
 * treats them differently: `tone?: string` absent means "the platform says
 * nothing here, the workspace decides alone", which is what the rules screen
 * renders as such. An empty string would instead publish a deliberate silence
 * as a deliberate blank. Trimmed-to-nothing becomes absent.
 */
function toDocument(input: MasterRulesInput): RulesDocument {
  const text = (v: string) => {
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  };

  const topics = input.prohibitedTopics
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return {
    tone: text(input.tone),
    responseGuidelines: text(input.responseGuidelines),
    businessInformation: text(input.businessInformation),
    escalationInstructions: text(input.escalationInstructions),
    prohibitedTopics: topics.length > 0 ? topics : undefined,
    customInstructions: text(input.customInstructions),
  };
}

/**
 * Publish a new version of the master rules.
 *
 * ⚠ THE CHANGE NOTE IS REQUIRED, AND THE REASON IS THE SAME AS THE SUPPORT
 *   SESSION'S. This changes what every workspace's assistant does on its next
 *   generated reply. Six months from now the only person who can explain why
 *   v25 differs from v24 is whoever wrote a sentence at the time, and "updated
 *   rules" is not that sentence. The minimum length is deliberate: an empty
 *   check passes on ".", which satisfies the requirement on paper and tells a
 *   reader nothing.
 */
export async function publishMasterRules(
  input: {
    fields: MasterRulesInput;
    changeNote: string;
    /** Which fields a workspace may not loosen. 01 D-08. */
    lockedFields: string[];
  },
  actor: PlatformActor,
): Promise<PublishedVersion> {
  const note = input.changeNote.trim();
  if (note.length < 8) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Describe what changed. Whoever reads this in six months has only this sentence.',
    });
  }

  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.RULES_PUBLISHED,
      entityType: 'master_ai_rules',
      reason: note,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      // Doc 23: the capability column is enforced here, before anything is written.
      await requireCapability(tx, actor.userId, 'edit_master_rules');
      const [root] = await tx.select({ id: masterAiRules.id }).from(masterAiRules).limit(1);

      if (!root) {
        /* The singleton is seeded with the database. Its absence is a broken
           install rather than a state a screen should offer to repair. */
        throw new AppError(ERROR_CODES.NOT_FOUND, {
          message: 'The master rule set does not exist on this database.',
        });
      }

      /**
       * ⚠ THE NEXT NUMBER COMES FROM THE TABLE, INSIDE THE TRANSACTION.
       *
       * `master_rules_version_idx` is unique on `version_number`, so two
       * operators publishing at once must not both compute "current + 1" from
       * a value they read earlier on their own screens. Reading it here, in
       * the same transaction as the insert, makes the second one fail on the
       * constraint rather than silently overwrite — and a failed publish that
       * says so beats a successful one that lost somebody's edit.
       */
      const [latest] = await tx
        .select({ versionNumber: masterAiRuleVersions.versionNumber })
        .from(masterAiRuleVersions)
        .orderBy(desc(masterAiRuleVersions.versionNumber))
        .limit(1);

      const versionNumber = (latest?.versionNumber ?? 0) + 1;

      const [created] = await tx
        .insert(masterAiRuleVersions)
        .values({
          versionNumber,
          status: 'published',
          content: toDocument(input.fields),
          lockedFields: input.lockedFields,
          changeNote: note,
          authoredBy: actor.userId,
          publishedAt: new Date(),
        })
        .returning({ id: masterAiRuleVersions.id });

      if (!created) {
        throw new AppError(ERROR_CODES.INTERNAL, { message: 'The version row was not written.' });
      }

      // The pointer, in the same transaction. A version row that exists and is
      // not pointed at is a draft; one pointed at without existing is nothing.
      await tx
        .update(masterAiRules)
        .set({ currentVersionId: created.id, updatedAt: new Date() })
        .where(eq(masterAiRules.id, root.id));

      return { versionId: created.id, versionNumber };
    },
  );
}

/**
 * Roll back to an earlier published version.
 *
 * ⚠ THIS MOVES THE POINTER AND WRITES NO CONTENT. That is the whole benefit of
 * the append-only design: going back to v22 does not reconstruct v22, it
 * points at the row that has been sitting there since v22 was published. The
 * versions between it and the current one stay exactly where they are, so a
 * rollback is itself reversible.
 */
export async function rollbackMasterRules(
  input: { versionId: string; reason: string },
  actor: PlatformActor,
): Promise<{ versionNumber: number }> {
  const reason = input.reason.trim();
  if (reason.length < 8) {
    throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
      message: 'Say why you are rolling back. It lands in the platform log beside the change.',
    });
  }

  return asService(
    {
      actorUserId: actor.userId,
      actorLabel: actor.label,
      action: AUDIT_ACTIONS.RULES_ROLLED_BACK,
      entityType: 'master_ai_rules',
      entityId: input.versionId,
      reason,
      requestId: actor.requestId,
      ipAddress: actor.ipAddress ?? null,
    },
    async (tx) => {
      // Doc 23: the capability column is enforced here, before anything is written.
      await requireCapability(tx, actor.userId, 'edit_master_rules');
      const [target] = await tx
        .select({
          id: masterAiRuleVersions.id,
          versionNumber: masterAiRuleVersions.versionNumber,
          status: masterAiRuleVersions.status,
        })
        .from(masterAiRuleVersions)
        .where(eq(masterAiRuleVersions.id, input.versionId))
        .limit(1);

      if (!target) {
        throw new AppError(ERROR_CODES.NOT_FOUND, { message: 'That version does not exist.' });
      }
      if (target.status !== 'published') {
        /* Pointing the live set at a draft would publish something nobody
           chose to publish, through a control labelled "restore". */
        throw new AppError(ERROR_CODES.VALIDATION_FAILED, {
          message: 'Only a published version can be restored.',
        });
      }

      const [root] = await tx.select({ id: masterAiRules.id }).from(masterAiRules).limit(1);
      if (!root) {
        throw new AppError(ERROR_CODES.NOT_FOUND, {
          message: 'The master rule set does not exist on this database.',
        });
      }

      await tx
        .update(masterAiRules)
        .set({ currentVersionId: target.id, updatedAt: new Date() })
        .where(eq(masterAiRules.id, root.id));

      return { versionNumber: target.versionNumber };
    },
  );
}
