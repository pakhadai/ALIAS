require('./load-root-env.cjs');

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const serverRoot = path.resolve(__dirname, '..');
const tsxCli = path.join(serverRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

const result = spawnSync(process.execPath, [tsxCli, 'prisma/seed.ts'], {
  stdio: 'inherit',
  env: process.env,
  cwd: serverRoot,
});

process.exit(result.status ?? 1);
