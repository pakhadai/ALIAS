/* global process */
import { spawnSync } from 'node:child_process';

// GitHub Actions / some wrappers sometimes pass a literal "--" as the first forwarded argument.
// Playwright treats positional args as test file patterns, so "--" yields "No tests found".
const rawArgs = process.argv.slice(2);
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs;

const res = spawnSync('playwright', ['test', ...args], {
  stdio: 'inherit',
  shell: true,
});

process.exit(res.status ?? 1);
