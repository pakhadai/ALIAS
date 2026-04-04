import * as fs from 'fs';
import * as path from 'path';

export function getRepoRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

/** Load optional `packages/e2e/.env` (gitignored) so E2E_DATABASE_URL can be set without polluting shell. */
export function loadE2eEnvFile(): void {
  const envPath = path.join(__dirname, '.env');
  try {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const eq = t.indexOf('=');
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = val;
      }
    }
  } catch {
    /* no file */
  }
}

/**
 * DB URL for E2E. Prefer explicit env so we never pick a wrong `packages/server/.env` URL
 * (common when local Postgres differs from `docker compose` postgres).
 *
 * Order: E2E_DATABASE_URL → DATABASE_URL → docker-compose.yml default (alias / alias_dev).
 */
export function resolveDatabaseUrl(): string {
  if (process.env.E2E_DATABASE_URL?.trim()) {
    return process.env.E2E_DATABASE_URL.trim();
  }
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }
  return 'postgresql://alias:alias_dev@127.0.0.1:5432/alias?schema=public';
}
