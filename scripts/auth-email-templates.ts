import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { authProviderEmail } from '../src/modules/email/templates';
import { format, resolveConfig } from 'prettier';

const root = resolve('verification/local/supabase/templates');
const check = process.argv.includes('--check');
async function main() {
  await mkdir(root, { recursive: true });
  for (const purpose of ['invite', 'recovery', 'confirmation'] as const) {
    const path = resolve(root, `${purpose}.html`);
    const rendered = await format(authProviderEmail(purpose).html, {
      ...(await resolveConfig(path)),
      filepath: path,
      parser: 'html',
    });
    if (check) {
      if ((await readFile(path, 'utf8')) !== rendered)
        throw new Error(
          `${purpose} template differs from its shared source. Regenerate Auth templates.`,
        );
    } else await writeFile(path, rendered);
  }
  console.log(`Auth email templates ${check ? 'match their shared source' : 'generated'}.`);
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Auth template generation failed.');
  process.exitCode = 1;
});
