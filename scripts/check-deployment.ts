#!/usr/bin/env tsx
/** Read-only release check. Uses injected environment settings, with .env.local as a local fallback. */
import { config as loadEnv } from 'dotenv';
import postgres from 'postgres';
import { inspectDeploymentSchema } from './deployment-schema';

loadEnv({ path: '.env.local', quiet: true });

async function main(): Promise<void> {
  const adminUrl = process.env.DATABASE_URL_ADMIN;
  const appUrl = process.env.DATABASE_URL;
  if (!adminUrl || !appUrl)
    throw new Error('Both DATABASE_URL_ADMIN and DATABASE_URL are required.');
  const adminAddress = new URL(adminUrl);
  const appAddress = new URL(appUrl);
  const projectRef = (address: URL) =>
    address.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/)?.[1] ??
    decodeURIComponent(address.username).match(/\.([a-z0-9]+)$/)?.[1];
  const adminRef = projectRef(adminAddress);
  const appRef = projectRef(appAddress);
  const sameDatabase =
    adminAddress.pathname === appAddress.pathname &&
    (adminRef || appRef
      ? Boolean(adminRef && adminRef === appRef)
      : adminAddress.hostname === appAddress.hostname && adminAddress.port === appAddress.port);
  if (!sameDatabase)
    throw new Error('Application and migration connections must target the same database.');
  const admin = postgres(adminUrl, { prepare: false, max: 1, connect_timeout: 10 });
  const app = postgres(appUrl, { prepare: false, max: 1, connect_timeout: 10 });
  try {
    const report = await inspectDeploymentSchema(admin);
    const role = await app.begin('read only', async (transaction) => {
      const [row] = await transaction<{ bypass: boolean; superuser: boolean }[]>`
        select rolbypassrls as bypass, rolsuper as superuser from pg_roles where rolname = current_user`;
      return row;
    });
    if (!role || role.bypass || role.superuser)
      report.problems.push('The application connection must not bypass RLS.');
    console.log(
      `Deployment schema: ${report.tables} tables, ${report.migrations} applied migrations.`,
    );
    for (const problem of report.problems) console.error(`  ${problem}`);
    if (report.problems.length > 0) process.exitCode = 1;
    else
      console.log(
        'Schema matches this release; application role is restricted. No data was changed.',
      );
  } finally {
    await app.end();
    await admin.end();
  }
}

main().catch(() => {
  console.error(
    'Deployment check failed. Check database connectivity, permissions and environment settings.',
  );
  process.exitCode = 1;
});
