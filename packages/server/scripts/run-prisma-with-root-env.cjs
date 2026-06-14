require('./load-root-env.cjs');

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const serverRoot = path.resolve(__dirname, '..');
const prismaCli = path.join(serverRoot, 'node_modules', 'prisma', 'build', 'index.js');
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/run-prisma-with-root-env.cjs <prisma-args...>');
  process.exit(1);
}

const result = spawnSync(process.execPath, [prismaCli, ...args], {
  stdio: 'inherit',
  env: process.env,
  cwd: serverRoot,
});

process.exit(result.status ?? 1);
