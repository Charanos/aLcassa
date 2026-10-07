import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getTableColumns, getTableName, is, Table, type Column } from 'drizzle-orm';
import type postgres from 'postgres';
import * as schema from '../src/db/schema';

/** Compare deployed metadata with this release without reading customer records. */
export async function inspectDeploymentSchema(
  database: ReturnType<typeof postgres>,
  migrationsDirectory = join(process.cwd(), 'src/db/migrations'),
): Promise<{ tables: number; migrations: number; problems: string[] }> {
  const tables = Object.values(schema).filter((value) => is(value, Table));
  if (tables.length === 0) throw new Error('No application tables were resolved.');
  const journal = JSON.parse(
    await readFile(join(migrationsDirectory, 'meta/_journal.json'), 'utf8'),
  ) as { entries: Array<{ tag: string; when: number }> };
  const expectedMigrations = await Promise.all(
    journal.entries.map(async (entry) => ({
      ...entry,
      hash: createHash('sha256')
        .update(await readFile(join(migrationsDirectory, `${entry.tag}.sql`)))
        .digest('hex'),
    })),
  );

  return database.begin('read only', async (transaction) => {
    const columns = await transaction<{ table_name: string; column_name: string }[]>`
      select table_name, column_name from information_schema.columns where table_schema = 'public'`;
    const problems: string[] = [];
    for (const table of tables) {
      const name = getTableName(table);
      const tableColumns = getTableColumns(table) as Record<string, Column>;
      for (const column of Object.values(tableColumns)) {
        if (!columns.some((row) => row.table_name === name && row.column_name === column.name)) {
          problems.push(`Missing column: ${name}.${column.name}`);
        }
      }
    }
    const [present] = await transaction<{ present: boolean }[]>`
      select to_regclass('drizzle.__drizzle_migrations') is not null as present`;
    const applied = present?.present
      ? await transaction<{ hash: string; created_at: string }[]>`
          select hash, created_at from drizzle.__drizzle_migrations order by id`
      : [];
    for (const [index, expected] of expectedMigrations.entries()) {
      const actual = applied[index];
      if (!actual) problems.push(`Unapplied migration: ${expected.tag}`);
      else if (actual.hash !== expected.hash || Number(actual.created_at) !== expected.when) {
        problems.push(`Migration differs from release: ${expected.tag}`);
      }
    }
    if (applied.length > expectedMigrations.length) {
      problems.push('The database is ahead of this release. Verify release compatibility.');
    }
    return { tables: tables.length, migrations: applied.length, problems };
  });
}
