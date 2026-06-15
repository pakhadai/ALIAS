import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const clientSrc = resolve(__dirname, '..');
const stylesCss = readFileSync(resolve(clientSrc, 'styles.css'), 'utf8');

function readSrc(relativePath: string): string {
  return readFileSync(join(clientSrc, relativePath), 'utf8');
}

function countRawButtons(source: string): number {
  return (source.match(/<button\b/g) ?? []).length;
}

function toPosixPath(path: string): string {
  return path.replace(/\\/g, '/');
}

function walkTsxFiles(dir: string, skipDirs: ReadonlySet<string>): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (skipDirs.has(entry)) continue;
      results.push(...walkTsxFiles(full, skipDirs));
      continue;
    }
    if (entry.endsWith('.tsx') && !entry.endsWith('.test.tsx')) {
      results.push(full);
    }
  }
  return results;
}

/** BTN-001 migrated scope — must stay at 0 raw `<button>`. */
const ZERO_RAW_BUTTON_FILES = [
  'screens/menu/MenuScreen.tsx',
  'screens/menu/StoreScreen.tsx',
  'screens/menu/MyDecksScreen.tsx',
  'screens/menu/MyWordPacksScreen.tsx',
  'screens/menu/JoinInputScreen.tsx',
  'screens/menu/LobbySettingsScreen.tsx',
  'screens/lobby/SettingsScreen.tsx',
  'screens/lobby/LobbyScreen.tsx',
  'screens/lobby/TeamSetupScreen.tsx',
  'screens/lobby/components/TeamCard.tsx',
  'screens/lobby/components/PlayersSection.tsx',
  'screens/lobby/components/LobbyPlayModeBar.tsx',
  'components/CustomDeck/CustomDeckModal.tsx',
] as const;

/**
 * Documented raw `<button>` escapes in menu/lobby (Type 6 nav row, chips, avatar picker).
 * Canon: docs/BUTTON_UNIFICATION.md § Governance.
 */
const RAW_BUTTON_ALLOWLIST: ReadonlyArray<{ file: string; max: number; reason: string }> = [
  { file: 'screens/menu/profile/ProfileNavList.tsx', max: 6, reason: 'Type 6 nav row' },
  { file: 'screens/menu/ProfileScreen.tsx', max: 2, reason: 'Type 6 guest nav rows' },
  { file: 'screens/menu/RulesModal.tsx', max: 4, reason: 'chip tab selection' },
  { file: 'screens/menu/EnterNameSheet.tsx', max: 1, reason: 'avatar emoji picker' },
  { file: 'screens/menu/profile/ProfileStatsCards.tsx', max: 1, reason: 'stat card tap' },
  { file: 'screens/menu/profile/ProfileBenefitsList.tsx', max: 1, reason: 'benefits list row' },
  { file: 'screens/lobby/components/OnlineLobbyIntro.tsx', max: 1, reason: 'intro dismiss' },
  { file: 'screens/lobby/components/LobbyAvatarStrip.tsx', max: 3, reason: 'avatar strip chips' },
  { file: 'screens/lobby/components/UnassignedPool.tsx', max: 1, reason: 'emoji avatar chip' },
  { file: 'screens/lobby/components/LobbyRulesSummaryCard.tsx', max: 1, reason: 'rules card link' },
  {
    file: 'screens/lobby/components/AddOfflinePlayerSheet.tsx',
    max: 1,
    reason: 'avatar emoji picker',
  },
];

describe('button governance (BTN-001)', () => {
  it('should declare soft-pill SSOT classes in styles.css', () => {
    const requiredClasses = [
      '.lobby-start-btn--ready',
      '.lobby-start-btn--plain',
      '.lobby-start-btn--blocked',
      '.ui-soft-btn--neutral',
      '.ui-soft-btn--neutral-muted',
    ] as const;

    for (const cls of requiredClasses) {
      expect(stylesCss).toContain(cls);
    }
  });

  it('should keep migrated menu/lobby/store files at 0 raw `<button>`', () => {
    for (const file of ZERO_RAW_BUTTON_FILES) {
      const source = readSrc(file);
      expect(countRawButtons(source), `${file} must have 0 raw <button>`).toBe(0);
    }
  });

  it('should keep allowlisted raw `<button>` counts within documented limits', () => {
    for (const { file, max, reason } of RAW_BUTTON_ALLOWLIST) {
      const source = readSrc(file);
      const count = countRawButtons(source);
      expect(count, `${file} (${reason})`).toBeLessThanOrEqual(max);
    }
  });

  it('should require volume="cta" on screen/modal primary Button (excl. tests, admin, GameFlow)', () => {
    const scanRoots = ['screens/menu', 'screens/lobby', 'components'] as const;
    const skipDirs = new Set(['admin', 'GameFlow']);
    const violations: string[] = [];

    for (const root of scanRoots) {
      const files = walkTsxFiles(join(clientSrc, root), skipDirs);
      for (const full of files) {
        const rel = toPosixPath(full.slice(clientSrc.length + 1));
        const source = readFileSync(full, 'utf8');
        const lines = source.split('\n');

        lines.forEach((line, idx) => {
          if (!line.includes('variant="primary"')) return;
          const window = lines.slice(idx, idx + 4).join('\n');
          const hasCta =
            window.includes('volume="cta"') ||
            window.includes("volume={'cta'}") ||
            window.includes("volume={isDanger ? undefined : 'cta'}");
          if (!hasCta) {
            violations.push(`${rel}:${idx + 1}`);
          }
        });
      }
    }

    expect(violations, `primary without volume="cta": ${violations.join(', ')}`).toEqual([]);
  });
});
