import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// The isolation suite talks to a real database. Vitest does not load
// .env.local the way Next.js does, so it is loaded here.
loadEnv({ path: '.env.local', quiet: true });

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'node',
    globals: false,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    // The isolation suite talks to a real branch database and its cases are
    // deliberately serial, because two of them assert on row counts.
    fileParallelism: false,
    testTimeout: 20_000,
    // Teardown talks to a remote database. The default 10s is enough for a
    // local one and not for a pooler over the network, where a slow hook
    // fails the whole FILE while every case in it passes.
    hookTimeout: 60_000,
    reporters: ['default'],
  },
});
