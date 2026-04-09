import { execSync } from 'child_process';
import * as net from 'net';
import * as path from 'path';
import { getRepoRoot, resolveDatabaseUrl } from './test-env';

function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const socket = net.createConnection({ port, host: '127.0.0.1' }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timed out waiting for 127.0.0.1:${port}`));
        } else {
          setTimeout(tryOnce, 400);
        }
      });
    };
    tryOnce();
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Ensures Postgres + Redis (docker-compose.yml) and applies schema so the server can start.
 * If Docker is unavailable, assumes services are already running.
 */
export default async function globalSetup(): Promise<void> {
  const repoRoot = getRepoRoot();
  const databaseUrl = resolveDatabaseUrl();

  let dockerOk = true;
  try {
    execSync('docker compose up -d redis postgres', {
      cwd: repoRoot,
      stdio: 'inherit',
    });
  } catch {
    dockerOk = false;
    console.warn(
      '[e2e] docker compose up failed — using existing Postgres/Redis on localhost (if any)'
    );
  }

  // Redis is optional for tests (server can run without persistence / relay).
  await waitForPort(6379, 20_000).catch(() => {
    console.warn('[e2e] Redis not detected on 127.0.0.1:6379 (continuing without Redis)');
  });

  // Postgres is optional when Docker is unavailable (server falls back for word list).
  // BUT the web app auth flow requires Prisma (DB) to be reachable, so we fail fast if Postgres is missing.
  // If Docker is available, we wait longer because compose may still be starting up.
  const pgTimeout = dockerOk ? 90_000 : 10_000;
  const pgReady = await waitForPort(5432, pgTimeout)
    .then(() => true)
    .catch(() => false);

  if (!pgReady) {
    throw new Error(
      '[e2e] Postgres is required but not reachable at 127.0.0.1:5432. Start it (e.g. `docker compose up -d postgres`) or set E2E_DATABASE_URL to a reachable DB.'
    );
  }

  const serverDir = path.join(repoRoot, 'packages', 'server');
  // TCP connect does not guarantee Postgres is ready to accept queries.
  // Retry prisma db push to avoid flaky CI starts right after docker compose up.
  const attempts = dockerOk ? 45 : 10;
  for (let i = 1; i <= attempts; i++) {
    try {
      execSync('pnpm exec prisma db push --skip-generate', {
        cwd: serverDir,
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: databaseUrl },
      });
      return;
    } catch (err) {
      if (i >= attempts) throw err;
      console.warn(`[e2e] prisma db push failed (attempt ${i}/${attempts}), retrying...`);
      await sleep(2000);
    }
  }
}
