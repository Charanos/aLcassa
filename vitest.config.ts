import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

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
    reporters: ['default'],
  },
});
