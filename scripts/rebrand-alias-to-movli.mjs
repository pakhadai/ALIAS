#!/usr/bin/env node
/**
 * Rebrand ALIAS → MOVLI across the monorepo.
 * Excludes: node_modules, lockfiles, build artifacts, ECC install state, binary assets.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  '.turbo',
  'coverage',
  'agent-transcripts',
  'playwright-report',
  'test-results',
]);

const SKIP_FILES = new Set([
  'pnpm-lock.yaml',
  'rebrand-alias-to-movli.mjs',
  'ecc-install-state.json',
]);

const TEXT_EXT = new Set([
  '.ts', '.tsx', '.js', '.mjs', '.cjs', '.json', '.md', '.mdc', '.yml', '.yaml',
  '.html', '.css', '.conf', '.example', '.toml', '.svg', '.txt', '.sh',
]);

/** Skip vite/vitest path-alias blocks and session-aliases API */
function shouldSkipContentReplace(filePath, content) {
  const base = path.basename(filePath);
  if (base === 'session-aliases.js' || base === 'session-aliases.d.ts') return true;
  if (base === 'install-manifests.js' && content.includes('LEGACY_LANGUAGE_ALIAS')) return true;
  return false;
}

const REPLACEMENTS = [
  ['AliasLogoMark', 'MovliLogoMark'],
  ['alias-master-monorepo', 'movli-master-monorepo'],
  ['Alias Master', 'MOVLI Master'],
  ['@alias/', '@movli/'],
  ['alias-steward', 'movli-steward'],
  ['alias-master', 'movli-master'],
  ['alias-project', 'movli-project'],
  ['alias:imposter:', 'movli:imposter:'],
  ['alias:room:writer:', 'movli:room:writer:'],
  ['alias:room:', 'movli:room:'],
  ['alias:socket:', 'movli:socket:'],
  ['alias:rpc:to:', 'movli:rpc:to:'],
  ['alias:auth-changed', 'movli:auth-changed'],
  ['postgresql://alias:alias_dev', 'postgresql://movli:movli_dev'],
  ['/5432/alias?', '/5432/movli?'],
  ['/5432/alias', '/5432/movli'],
  ['github.com/pakhadai/ALIAS', 'github.com/pakhadai/MOVLI'],
  ['$HOME/apps/ALIAS', '$HOME/apps/MOVLI'],
  ['~/apps/ALIAS', '~/apps/MOVLI'],
  ['apps/ALIAS', 'apps/MOVLI'],
  ['VPS_COMPOSE_PROJECT`** — наприклад **`alias`', 'VPS_COMPOSE_PROJECT`** — наприклад **`movli`'],
  ['docker compose -p alias', 'docker compose -p movli'],
  ["'alias'", "'movli'"], // homeBrand word rain only in specific context - applied globally may break session-aliases - handled by skip
  ['ALIAS', 'MOVLI'],
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function applyReplacements(content, filePath) {
  if (shouldSkipContentReplace(filePath, content)) return { content, changed: false };

  let next = content;
  let changed = false;

  // Vite/vitest resolve.alias — only replace display name, not `alias: {`
  const base = path.basename(filePath);
  const isViteConfig = base === 'vite.config.ts' || base === 'vitest.config.ts';

  for (const [from, to] of REPLACEMENTS) {
    if (from === "'alias'" && !filePath.includes('homeBrand.ts')) continue;
    if (isViteConfig && from.startsWith('alias:')) continue;
    if (next.includes(from)) {
      next = next.split(from).join(to);
      changed = true;
    }
  }

  return { content: next, changed };
}

const touched = [];
const skipped = [];

for (const file of walk(ROOT)) {
  const rel = path.relative(ROOT, file);
  const ext = path.extname(file).toLowerCase();
  if (!TEXT_EXT.has(ext)) continue;
  if (SKIP_FILES.has(path.basename(file))) {
    skipped.push(rel);
    continue;
  }
  if (rel.includes(`${path.sep}node_modules${path.sep}`)) continue;

  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (raw.includes('\0')) continue;

  const { content, changed } = applyReplacements(raw, file);
  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    touched.push(rel);
  }
}

console.log(JSON.stringify({ touched: touched.length, files: touched.sort(), skipped }, null, 2));
