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
      // Core logic, contracts, HTTP/socket handlers, and game authorization pipeline.
      include: [
        'src/services/**',
        'src/validation/**',
        'src/modes/**',
        'src/game/**',
        'src/handlers/**',
        'src/routes/**',
      ],
      exclude: ['src/**/*.test.ts', 'src/modes/IGameModeHandler.ts'],
      thresholds: {
        // Measured 2026-06-07 after Phases 1–7 (341 tests, expanded include).
        // Totals: stmts/lines 67.42%, branches 71.8%, functions 89.18%.
        statements: 67,
        lines: 67,
        branches: 71,
        functions: 89,
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
