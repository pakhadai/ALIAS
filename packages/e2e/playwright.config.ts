import path from 'path';
import { defineConfig, devices } from '@playwright/test';
import { getRepoRoot, loadE2eEnvFile, resolveDatabaseUrl } from './test-env';

loadE2eEnvFile();
const repoRoot = getRepoRoot();
const databaseUrl = resolveDatabaseUrl();
const isCi = Boolean(process.env.CI);
const serverPort = process.env.E2E_SERVER_PORT ?? (isCi ? '3001' : '3002');
const clientPort = process.env.E2E_CLIENT_PORT ?? (isCi ? '5173' : '5175');
const serverUrl = `http://127.0.0.1:${serverPort}`;
const clientUrl = `http://localhost:${clientPort}`;
/** Stable secret for seeded JWT — must match `seed-e2e-auth-user.ts` + server webServer env. */
const e2eJwtSecret = process.env.E2E_JWT_SECRET ?? 'dev-secret-change-me';

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
    baseURL: clientUrl,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // No spaces: shells / pnpm argument forwarding break "--project=Mobile Chrome".
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: [
    {
      // Server runtime imports @movli/shared from dist, so ensure shared is built first (CI + fresh clones).
      command: 'pnpm --filter @movli/shared build && pnpm --filter @movli/server dev',
      cwd: repoRoot,
      url: `${serverUrl}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: serverPort,
        NODE_ENV: 'development',
        DATABASE_URL: databaseUrl,
        JWT_SECRET: e2eJwtSecret,
        REDIS_URL: process.env.REDIS_URL ?? 'redis://127.0.0.1:6379',
        CORS_ORIGIN: `${clientUrl},http://localhost:${clientPort}`,
      },
    },
    {
      command: `pnpm --filter @movli/client run dev -- --port ${clientPort}`,
      cwd: repoRoot,
      url: clientUrl,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_SERVER_URL: serverUrl,
        VITE_DEV_PORT: clientPort,
      },
    },
  ],
});
