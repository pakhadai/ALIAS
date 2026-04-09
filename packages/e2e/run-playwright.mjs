/* global process */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Actions / some wrappers sometimes pass a literal "--" as the first forwarded argument.
// Playwright treats positional args as test file patterns, so "--" yields "No tests found".
const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;

// Do NOT use shell: true — a single argv token like "--project=Mobile Chrome" would be joined
// into a shell command and split again, breaking project names with spaces.
// Run the CLI with `node …/cli.js` (works on Windows without shell / .cmd quirks).
const cliJs = path.join(__dirname, 'node_modules', '@playwright', 'test', 'cli.js');

const res = spawnSync(process.execPath, [cliJs, 'test', ...args], {
  stdio: 'inherit',
  cwd: __dirname,
  env: process.env,
});

process.exit(res.status ?? 1);
