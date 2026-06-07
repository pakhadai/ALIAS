#!/usr/bin/env node
/**
 * Session-end reminder: if there are uncommitted changes under packages/ or docs/
 * and no docs/daily/YYYY-MM-DD.md for today (Europe/Kyiv), print a one-line hint.
 * Non-blocking; does not fail the hook chain.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function todayKyiv() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function repoRoot() {
  return path.resolve(__dirname, '../..');
}

function hasRelevantChanges(root) {
  try {
    const out = execSync('git status --porcelain', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return out.split('\n').some((line) => {
      const p = line.slice(3).trim();
      return p.startsWith('packages/') || p.startsWith('docs/');
    });
  } catch {
    return false;
  }
}

function main() {
  const root = repoRoot();
  const dailyPath = path.join(root, 'docs', 'daily', `${todayKyiv()}.md`);
  if (fs.existsSync(dailyPath)) return;
  if (!hasRelevantChanges(root)) return;
  console.error(
    `[alias-steward] Нагадування: є зміни в packages/ або docs/, але немає ${path.relative(root, dailyPath)}. Допиши денний журнал або виклич @alias-steward.`,
  );
}

main();
