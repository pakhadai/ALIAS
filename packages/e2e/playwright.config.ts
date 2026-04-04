import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { getRepoRoot, loadE2eEnvFile, resolveDatabaseUrl } from './test-env';

loadE2eEnvFile();
const repoRoot = getRepoRoot();
const databaseUrl = resolveDatabaseUrl();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',
  globalSetup: path.join(__dirname, 'global-setup.ts'),
  timeout: 120_000,
  expect: {
    timeout: 30_000,
  },
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @alias/server dev',
      cwd: repoRoot,
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: '3001',
        NODE_ENV: 'development',
        DATABASE_URL: databaseUrl,
        REDIS_URL: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
        CORS_ORIGIN: 'http://localhost:5173,http://127.0.0.1:5173',
      },
    },
    {
      command: 'pnpm --filter @alias/client dev',
      cwd: repoRoot,
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_SERVER_URL: 'http://localhost:3001',
      },
    },
  ],
});
