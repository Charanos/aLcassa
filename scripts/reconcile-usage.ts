#!/usr/bin/env tsx
/**
 * 08 §3 · 05 I-13. THE USAGE RECONCILIATION JOB.
 *
 * > "A reconciliation job runs nightly, rebuilds each counter from its source
 * > rows, and alerts on divergence rather than silently correcting it. Silent
 * > correction hides the bug that caused the drift."
 *
 * ⚠ THE WHOLE POINT IS THAT IT DOES NOT FIX ANYTHING BY DEFAULT.
 *
 * A counter that has drifted is evidence: something incremented without
 * decrementing, or decremented twice, or wrote outside a transaction. Quietly
 * writing the correct number every night makes that bug invisible and
 * permanent — the symptom disappears at 3am and nobody ever sees the pattern.
 *
 * So the default is REPORT. `--repair` exists for the moment after a bug is
 * found and fixed, when the drift it caused needs clearing, and it is a
 * deliberate act with a person behind it. It refuses to run without
 * `--reason`, which goes into the platform audit log alongside the change.
 *
 * ⚠ IT RUNS AS THE SERVICE ROLE, WHICH IS UNAVOIDABLE AND WORTH SAYING.
 *
 * Reconciliation counts across every tenant by definition; there is no tenant
 * context that could see the whole picture. `serviceClient.ts` permits "list
 * tenants" on exactly that reasoning. This script talks to the database
 * directly rather than through the module boundary because it is a scheduled
 * process, not a request — but it counts, compares and reports, and it reads
 * no tenant CONTENT at all: no member names, no messages, no credentials.
 *
 *   pnpm reconcile:usage
 *       Report drift and exit non-zero if there is any. Writes nothing.
 *
 *   pnpm reconcile:usage --repair --reason "..." --actor <platform-admin-uuid>
 *       Correct it, with an audit row per counter naming who and why.
 *
 * 04 ADR-007 notes there is no long-running process on Vercel, so the nightly
 * run is a cron hitting this through a route or a scheduled job invoking it
 * directly. Either way it is this code.
 */

import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv({ path: '.env.local', quiet: true });

const connectionString = process.env.DATABASE_URL_ADMIN;

if (!connectionString) {
  console.error('DATABASE_URL_ADMIN must be set: reconciliation counts across every tenant.');
  process.exit(1);
}

const args = process.argv.slice(2);
const REPAIR = args.includes('--repair');
const flag = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const REASON = flag('--reason');
const ACTOR = flag('--actor');

/**
 * ⚠ REPAIR NAMES A PERSON, BECAUSE `platform_audit_log.actor_user_id` IS NOT
 *   NULLABLE AND THAT IS THE RIGHT CONSTRAINT.
 *
 * The first version of this script passed null and the insert refused it. The
 * temptation at that point is to make the column nullable, or to attribute the
 * write to whichever platform admin the script can find. Both are worse than
 * asking: an audit row reading "corrected by nobody" cannot be followed up,
 * and one naming an admin who was asleep is actively misleading.
 *
 * A nightly REPORT needs no actor, because it writes nothing. A repair is a
 * deliberate act with a person behind it, so that person identifies
 * themselves — and the id is checked against `platform_admins` below, so a
 * typo fails loudly rather than recording a correction against a stranger.
 */
if (REPAIR && (!REASON || !ACTOR)) {
  console.error(
    'Repair requires --reason "why" and --actor <platform-admin-uuid>.\n\n' +
      'The correction is written to the platform audit log. A correction with no stated\n' +
      'cause is the drift happening a second time, and one with no named actor cannot be\n' +
      'followed up by whoever reads the log six months later.\n\n' +
      '  pnpm reconcile:usage --repair --reason "corrected after <the fix>" --actor <uuid>',
  );
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, max: 2 });

/**
 * ⚠ EACH COUNTER'S TRUTH IS DEFINED HERE, AND THE DEFINITIONS ARE THE SPEC.
 *
 * `seats` is the one that matters most and the one most easily got wrong:
 * `08 §2` says it counts "active members PLUS pending invitations", because
 * otherwise a tenant on five seats sends fifty invitations and exceeds the
 * limit the moment they are accepted. A reconciliation that counted only
 * members would "correct" every tenant with an outstanding invitation down to
 * a wrong number, nightly, and look like it was working.
 *
 * The three Phase 2 seams — channels, kb_documents, conversations_monthly —
 * have no source rows to count yet. They are listed with a null query rather
 * than omitted, so that adding the feature means writing the query here
 * rather than remembering this file exists.
 */
type CounterSpec = {
  key: string;
  /** Null while the feature that would populate it does not exist. */
  truth: ((tenantId: string) => Promise<number>) | null;
  note: string;
};

const COUNTERS: CounterSpec[] = [
  {
    key: 'seats',
    note: 'active members plus pending invitations · 08 §2',
    truth: async (tenantId) => {
      const [row] = await sql<{ n: number }[]>`
        select (
          (select count(*) from tenant_members
            where tenant_id = ${tenantId} and status = 'active' and deleted_at is null)
          +
          (select count(*) from invitations
            where tenant_id = ${tenantId} and accepted_at is null and revoked_at is null)
        )::int as n
      `;
      return row?.n ?? 0;
    },
  },
  {
    key: 'api_keys',
    note: 'active credentials',
    truth: async (tenantId) => {
      const [row] = await sql<{ n: number }[]>`
        select count(*)::int as n from api_credentials
        where tenant_id = ${tenantId} and revoked_at is null and deleted_at is null
      `;
      return row?.n ?? 0;
    },
  },
  {
    key: 'ai_rules_versions',
    note: 'retained versions per tenant',
    truth: async (tenantId) => {
      const [row] = await sql<{ n: number }[]>`
        select count(*)::int as n from tenant_ai_rule_versions
        where tenant_id = ${tenantId}
      `;
      return row?.n ?? 0;
    },
  },
  { key: 'channels', truth: null, note: 'Phase 2 seam · no channel connections to count yet' },
  { key: 'kb_documents', truth: null, note: 'Phase 2 seam · no knowledge base yet' },
  {
    key: 'conversations_monthly',
    truth: null,
    note: 'Phase 2 seam · no inbox to count a conversation against',
  },
  {
    key: 'audit_retention_days',
    truth: null,
    note: 'not a consumable · the limit is a span, and nothing accumulates against it',
  },
  {
    key: 'support_sla_hours',
    truth: null,
    note: 'display only · 08 §2, nothing calls checkEntitlement against it',
  },
];

type Drift = {
  tenantSlug: string;
  tenantId: string;
  key: string;
  stored: number;
  actual: number;
};

async function main(): Promise<void> {
  const tenants = await sql<{ id: string; slug: string }[]>`
    select id, slug from tenants where deleted_at is null order by slug
  `;

  const counters = await sql<{ tenant_id: string; key: string; current_value: number }[]>`
    select tenant_id, key, current_value from usage_counters
  `;

  const storedByTenantKey = new Map(
    counters.map((row) => [`${row.tenant_id}:${row.key}`, row.current_value]),
  );

  const drift: Drift[] = [];
  let checked = 0;
  let skipped = 0;

  for (const tenant of tenants) {
    for (const spec of COUNTERS) {
      if (!spec.truth) {
        skipped++;
        continue;
      }

      const actual = await spec.truth(tenant.id);
      const stored = storedByTenantKey.get(`${tenant.id}:${spec.key}`);
      checked++;

      /**
       * ⚠ A MISSING ROW IS NOT DRIFT WHEN THE TRUTH IS ZERO.
       *
       * `usage_counters` rows are created on first use, so a tenant that has
       * never created a credential has no `api_keys` row and genuinely uses
       * none. Reporting that as drift would fill the report with noise on
       * every new tenant and train whoever reads it to skim.
       */
      if (stored === undefined) {
        if (actual !== 0) {
          drift.push({
            tenantSlug: tenant.slug,
            tenantId: tenant.id,
            key: spec.key,
            stored: 0,
            actual,
          });
        }
        continue;
      }

      if (stored !== actual) {
        drift.push({
          tenantSlug: tenant.slug,
          tenantId: tenant.id,
          key: spec.key,
          stored,
          actual,
        });
      }
    }
  }

  console.log(
    `\nUsage reconciliation · ${tenants.length} workspaces · ${checked} counters checked` +
      `, ${skipped} skipped (no source rows yet)\n`,
  );

  if (drift.length === 0) {
    console.log('✓ every counter matches its source rows. Nothing to report.\n');
    await sql.end();
    return;
  }

  console.error(`✗ ${drift.length} counter(s) have drifted from their source rows:\n`);
  for (const row of drift) {
    const delta = row.actual - row.stored;
    console.error(
      `  ${row.tenantSlug.padEnd(22)} ${row.key.padEnd(22)} stored ${String(row.stored).padStart(6)}` +
        ` · actual ${String(row.actual).padStart(6)} · ${delta > 0 ? '+' : ''}${delta}`,
    );
  }

  if (!REPAIR) {
    console.error(
      '\nNOT CORRECTED, DELIBERATELY. 08 §3: "alerts on divergence rather than silently\n' +
        'correcting it. Silent correction hides the bug that caused the drift."\n\n' +
        'Find what wrote the wrong number first. A counter is only ever changed inside the\n' +
        'transaction of the operation that consumed the resource, so drift means an\n' +
        'increment without a matching decrement, a double decrement, or a write that\n' +
        'escaped its transaction.\n\n' +
        'Once the cause is fixed:\n' +
        '  pnpm reconcile:usage --repair --reason "corrected after <the fix>" --actor <uuid>\n',
    );
    await sql.end();
    process.exit(1);
  }

  // ── Repair, audited. ──────────────────────────────────────────────────────
  //
  // The actor is verified before anything is written. An unrecognised id
  // would otherwise produce a foreign-key error halfway through the loop,
  // leaving some counters corrected and some not.
  const [admin] = await sql<{ display_name: string }[]>`
    select display_name from platform_admins
    where user_id = ${ACTOR ?? ''}::uuid and deleted_at is null
  `;

  if (!admin) {
    console.error(
      `\n--actor ${ACTOR} is not an active platform admin. Nothing was corrected.\n`,
    );
    await sql.end();
    process.exit(1);
  }

  console.log(`\nRepairing ${drift.length} counter(s) as ${admin.display_name}. Reason: ${REASON}\n`);

  await sql.begin(async (tx) => {
    for (const row of drift) {
      /**
       * The audit row goes in BEFORE the correction, matching `asService`'s
       * ordering and for the same reason: a crash mid-repair still leaves a
       * record that it was attempted. 05 I-06.
       */
      await tx`
        insert into platform_audit_log
          (actor_user_id, actor_label, action, target_tenant_id, entity_type, entity_id,
           used_service_role, reason, request_id, before, after)
        values
          (${ACTOR ?? ''}::uuid, ${`${admin.display_name} · reconcile-usage`},
           'subscription.status_changed', ${row.tenantId},
           -- entity_id is a uuid column and a counter key is not one, so the
           -- key is carried in entity_type where it is legible, and in the
           -- before/after payload where it is queryable.
           ${`usage_counter:${row.key}`}, null,
           true, ${REASON ?? ''}, ${`reconcile-${Date.now()}`},
           ${JSON.stringify({ key: row.key, currentValue: row.stored })}::jsonb,
           ${JSON.stringify({ key: row.key, currentValue: row.actual })}::jsonb)
      `;

      await tx`
        insert into usage_counters (tenant_id, key, current_value, peak_value)
        values (${row.tenantId}, ${row.key}, ${row.actual}, ${Math.max(row.actual, 0)})
        on conflict (tenant_id, key) do update
          set current_value = ${row.actual},
              peak_value = greatest(usage_counters.peak_value, ${row.actual}),
              updated_at = now()
      `;
    }
  });

  console.log(`✓ corrected ${drift.length} counter(s), each with an audit entry.\n`);
  await sql.end();
}

main().catch(async (error: unknown) => {
  console.error('\nReconciliation failed:', error);
  await sql.end().catch(() => undefined);
  process.exit(1);
});
