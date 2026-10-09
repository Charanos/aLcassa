#!/usr/bin/env tsx
/** Report resource-counter drift; repairs require an active administrator and audited reason. */
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import {
  assertMaintenanceConnection,
  inspectUsage,
  repairUsage,
} from '../src/lib/usage/reconciliation';

loadEnv({ path: '.env.local', quiet: true });
const args = process.argv.slice(2);
const flag = (name: string) => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value.`);
  return value;
};
async function main() {
  if (!process.env.DATABASE_URL_ADMIN) throw new Error('DATABASE_URL_ADMIN must be configured.');
  const sql = postgres(process.env.DATABASE_URL_ADMIN, { prepare: false, max: 1 });
  try {
    await assertMaintenanceConnection(sql);
    const tenantId = flag('--tenant');
    const report = args.includes('--repair')
      ? await repairUsage(sql, {
          actorId: flag('--actor') ?? '',
          reason: flag('--reason') ?? '',
          ...(tenantId ? { tenantId } : {}),
        })
      : await inspectUsage(sql, tenantId);
    console.log(JSON.stringify(report, null, 2));
    if (!args.includes('--repair') && report.drift.length) process.exitCode = 1;
  } finally {
    await sql.end();
  }
}
main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Usage reconciliation failed.');
  process.exitCode = 1;
});
