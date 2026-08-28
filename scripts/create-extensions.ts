#!/usr/bin/env tsx
/**
 * 05 §2 · 05 §8. THE POSTGRES EXTENSIONS THE SCHEMA DEPENDS ON.
 *
 * ⚠ THIS EXISTS BECAUSE THE DEPENDENCY WAS TRIBAL KNOWLEDGE AND CI FOUND IT.
 *
 * Migration `0000` declares `embedding vector(1536)` on `kb_chunks`. Creating
 * that column needs the `vector` type, which needs the extension, which no
 * migration ever created. It worked on the development database because the
 * extensions were enabled by hand during M1 — and that fact was never written
 * down anywhere.
 *
 * The first CI run against a clean `pgvector/pgvector:pg16` container failed
 * on `drizzle-kit migrate` with the error swallowed by its progress spinner.
 * A fresh production database would have failed identically.
 *
 * ⚠ WHY NOT PUT IT IN THE MIGRATION.
 *
 * Editing `0000` would change its hash, and Drizzle tracks applied migrations
 * by hash — every existing database would then refuse to migrate, or silently
 * re-apply. A new migration would run AFTER `0000`, which is too late for a
 * column `0000` itself creates.
 *
 * So it runs before `drizzle-kit migrate`, as part of `db:migrate`, always.
 * `IF NOT EXISTS` makes it idempotent, so an already-provisioned database
 * pays one no-op statement per extension.
 *
 *   pnpm db:extensions        (or automatically, via pnpm db:migrate)
 */

import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';

loadEnv({ path: '.env.local', quiet: true });

/**
 * ⚠ THE ADMIN CONNECTION, AND ONLY THE ADMIN CONNECTION.
 *
 * `CREATE EXTENSION` requires privileges the least-privilege application role
 * deliberately does not have. If this ever runs as `alcassa_app` it should
 * fail loudly rather than the app role being granted more to make it work.
 */
const connectionString = process.env.DATABASE_URL_ADMIN;

if (!connectionString) {
  console.error(
    'DATABASE_URL_ADMIN must be set: creating an extension needs privileges the application role does not have.',
  );
  process.exit(1);
}

const sql = postgres(connectionString, { prepare: false, max: 1 });

/** Each one named with what breaks without it, so a future reader can tell
 *  whether it is still needed rather than leaving it in place forever. */
const EXTENSIONS = [
  {
    name: 'vector',
    why: '05 §8. kb_chunks.embedding is vector(1536). Migration 0000 cannot create the table without the type.',
  },
  {
    name: 'pg_trgm',
    why: '05 §8. Trigram indexes for the knowledge base search seam.',
  },
  {
    name: 'pgcrypto',
    why: 'gen_random_uuid() for primary keys. Built in from Postgres 13, created explicitly so an older target fails here rather than mid-migration.',
  },
];

async function main(): Promise<void> {
  const created: string[] = [];

  for (const extension of EXTENSIONS) {
    try {
      // The identifier is a literal from the list above, never user input.
      await sql.unsafe(`create extension if not exists "${extension.name}"`);
      created.push(extension.name);
    } catch (error) {
      console.error(`\n✗ Could not create the "${extension.name}" extension.\n`);
      console.error(`  Why it is needed: ${extension.why}\n`);
      console.error(
        '  On Supabase, enable it from Database → Extensions. On a plain Postgres\n' +
          '  image, the extension must be present in the image — pgvector/pgvector\n' +
          '  provides `vector`; the stock postgres image does not.\n',
      );
      console.error(error);
      await sql.end();
      process.exit(1);
    }
  }

  const present = await sql<{ extname: string }[]>`
    select extname from pg_extension order by extname
  `;

  console.log(`✓ extensions ready · ${created.join(', ')}`);
  console.log(`  installed: ${present.map((row) => row.extname).join(', ')}`);

  await sql.end();
}

main().catch(async (error: unknown) => {
  console.error('Creating the extensions failed:', error);
  await sql.end().catch(() => undefined);
  process.exit(1);
});
