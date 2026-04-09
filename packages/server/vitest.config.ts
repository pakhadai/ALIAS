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
        // Keep these realistic to avoid "coverage gaming".
        statements: 75,
        lines: 75,
        branches: 70,
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
