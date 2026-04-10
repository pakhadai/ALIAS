import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      // Focus on core logic & contracts (not bootstrap glue / large route surface).
      include: ['src/services/**', 'src/validation/**', 'src/modes/**'],
      exclude: ['src/**/*.test.ts', 'src/modes/IGameModeHandler.ts'],
      thresholds: {
        // Risk-based minimums for core server logic.
        // Keep aligned with measured totals (CI) — raise when adding tests, don't block merges on drift.
        statements: 70,
        lines: 70,
        branches: 65,
        functions: 80,
      },
    },
  },
  resolve: {
    alias: {
      // Same pattern as Vite client: tests use shared source; production server uses dist via workspace package.
      '@alias/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});
