import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

/**
 * ⚠ `.env.local` IS LOADED EXPLICITLY HERE.
 *
 * Next.js loads `.env.local` automatically, so the application never has to
 * think about it. Standalone tooling — drizzle-kit, the policy scripts, the
 * seed — runs outside Next and does not, and the failure is unhelpful:
 * drizzle reports `url: ''` rather than "your environment file was not read".
 */
loadEnv({ path: '.env.local', quiet: true });

/**
 * 05 §12. Migrations are forward-only and backwards-compatible for one release.
 *
 * The credential this uses is the admin connection, because a migration creates
 * policies and an RLS-bound role cannot. Application code never touches it.
 *
 * Every migration that creates a tenant-scoped table must create its policies in
 * the same migration. `pnpm check:policies` fails the build when it does not, so
 * schema and policy cannot drift apart.
 */
export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
