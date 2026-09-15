import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// The isolation suite talks to a real database. Vitest does not load
// .env.local the way Next.js does, so it is loaded here.
loadEnv({ path: '.env.local', quiet: true });

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      /**
       * ⚠ `server-only` IS A BUILD-TIME MARKER, NOT A RUNTIME MODULE.
       *
       * Next.js resolves it to a package that throws if it is ever pulled into
       * a client bundle — that is its entire job, and it is why so many files
       * here start with `import 'server-only'`. Vitest is not Next, so the
       * import simply fails to resolve and the whole test file refuses to load.
       *
       * Aliasing it to an empty stub lets a server module be unit-tested
       * without weakening the guarantee: the marker still does its work in
       * `next build`, which is where a client-bundle mistake would actually
       * be caught.
       */
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // The isolation suite talks to a real branch database and its cases are
    // deliberately serial, because two of them assert on row counts.
    fileParallelism: false,
    /**
     * ⚠ 20s WAS TOO TIGHT FOR A REMOTE DATABASE, AND THE SUITE FAILED
     *   SPURIOUSLY BECAUSE OF IT.
     *
     * A full run on 15 Sep 2026 reported 11 of 280 failing — every one a
     * timeout, not an assertion. Round-trip latency to the Supabase pooler
     * measured at ~200ms, and an isolation case runs a context set, a write, a
     * read-back and a cleanup, so the cases land at 2.5-4.7s each and the slow
     * tail goes past twenty. Re-running the same file at 90s: 152 of 152
     * passed.
     *
     * The same reasoning `hookTimeout` already carries two lines down — a
     * budget sized for a local database, applied to a pooler over the network.
     * A suite that fails for reasons unrelated to the code is worse than no
     * suite, because people stop reading it.
     */
    testTimeout: 90_000,
    // Teardown talks to a remote database. The default 10s is enough for a
    // local one and not for a pooler over the network, where a slow hook
    // fails the whole FILE while every case in it passes.
    hookTimeout: 60_000,
    reporters: ['default'],
  },
});
