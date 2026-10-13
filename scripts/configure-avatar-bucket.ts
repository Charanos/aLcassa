/** Reconcile only the avatar upload limits; preserve existing objects and bucket visibility. */
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import postgres from 'postgres';

async function main() {
  const env = parse(await readFile(process.env.VERIFICATION_ENV_FILE ?? '.env.local'));
  const provider = new URL(env.NEXT_PUBLIC_SUPABASE_URL!);
  const database = new URL(env.DATABASE_URL_ADMIN!);
  const local = provider.origin === 'http://127.0.0.1:55421';
  const project = provider.hostname.split('.')[0]!;
  if (local) assert(database.hostname === '127.0.0.1' && database.port === '55422');
  else {
    assert(provider.protocol === 'https:' && provider.hostname.endsWith('.supabase.co'));
    assert(
      database.hostname === `db.${project}.supabase.co` ||
        (database.hostname.endsWith('.pooler.supabase.com') &&
          database.username === `postgres.${project}`),
      'Database must belong to the configured provider.',
    );
  }
  const admin = postgres(env.DATABASE_URL_ADMIN!, { prepare: false, max: 1 });
  try {
    const result = await admin.begin(async (tx) => {
      const [before] = await tx<
        { public: boolean; file_size_limit: number | null; allowed_mime_types: string[] | null }[]
      >`select public,file_size_limit,allowed_mime_types from storage.buckets where id='avatars' for update`;
      assert(before, 'Create the declared avatars bucket through the policy catalogue first.');
      const [after] = await tx<
        { public: boolean; file_size_limit: number; allowed_mime_types: string[] }[]
      >`update storage.buckets set file_size_limit=2097152,allowed_mime_types=array['image/png','image/jpeg','image/webp'] where id='avatars' returning public,file_size_limit,allowed_mime_types`;
      assert(after && after.public === before.public);
      return {
        checkedAt: new Date().toISOString(),
        localOnly: local,
        configuredProject: project,
        passed: true,
        visibilityPreserved: true,
        fileSizeLimit: Number(after.file_size_limit),
        allowedMimeTypes: after.allowed_mime_types,
        boundary:
          'Only bucket upload configuration changed. Existing objects and visibility were preserved; upload, ownership and deletion acceptance runs use the disposable local provider.',
      };
    });
    await writeFile(
      '.test-report/phase-one/avatar-bucket-configuration.json',
      JSON.stringify(result, null, 2) + '\n',
    );
    console.log(
      'Avatar upload configuration reconciled with the configured provider; objects and visibility preserved.',
    );
  } finally {
    await admin.end();
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Avatar configuration failed');
  process.exitCode = 1;
});
