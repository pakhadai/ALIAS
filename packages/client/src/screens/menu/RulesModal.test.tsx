import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RulesModal } from './RulesModal';
import { GameMode } from '../../types';
import type { GameSettings, ThemeConfig } from '../../types';

const t = {
  close: 'Close',
  rulesTitle: 'Rules',
  helpSectionRules: 'Rules',
  helpSectionFaq: 'FAQ',
  helpSectionPrivacy: 'Privacy',
  helpSectionImpressum: 'Impressum',
  helpSectionAgb: 'Terms',
  helpRulesModesTitle: 'Modes',
  helpRulesShowAllModes: 'Show all',
  helpRulesHideModes: 'Hide',
  helpRulesQuickTitle: 'Quick',
  helpRulesQuickExpand: 'Expand quick',
  helpRulesQuickCollapse: 'Collapse quick',
  helpRulesSettingsExpand: 'Expand settings',
  helpRulesSettingsCollapse: 'Collapse settings',
  helpRulesCurrentSettingsTitle: 'Settings',
  gameModeClassic: 'Classic',
  gameModeHintClassic: 'Classic hint',
  gameModeTranslation: 'Translation',
  gameModeHintTranslation: 'Translation hint',
  gameModeQuiz: 'Quiz',
  gameModeHintQuiz: 'Quiz hint',
  gameModeHardcore: 'Hardcore',
  gameModeHintHardcore: 'Hardcore hint',
  gameModeSynonyms: 'Synonyms',
  gameModeHintSynonyms: 'Synonyms hint',
  gameModeImposter: 'Imposter',
  gameModeHintImposter: 'Imposter hint',
  infoRule1: 'Rule 1',
  infoRule2: 'Rule 2',
  infoRule3: 'Rule 3',
  infoRule4: 'Rule 4',
  infoRule5: 'Rule 5',
  infoRule6: 'Rule 6',
  pts: 'pts',
  teams: 'teams',
  roundTime: 'Round',
  scoreToWin: 'Score',
  skipPenalty: 'Skip',
  enabled: 'On',
  disabled: 'Off',
  imposterDiscussionTime: 'Discussion',
  helpFaqQ1: 'Q1',
  helpFaqA1: 'A1',
  helpFaqQ2: 'Q2',
  helpFaqA2: 'A2',
  helpFaqQ3: 'Q3',
  helpFaqA3: 'A3',
  helpFaqQ4: 'Q4',
  helpFaqA4: 'A4',
  helpPrivacyTitle: 'Privacy',
  helpPrivacyIntro: 'Intro',
  helpPrivacyP1: 'P1',
  helpPrivacyP2: 'P2',
  helpPrivacyP3: 'P3',
  helpPrivacyP4: 'P4',
  helpImpressumTitle: 'Impressum',
  helpImpressumBody: 'Body',
  helpImpressumHost: 'Site address',
  helpImpressumRepoHint: 'Hint',
  helpAgbTitle: 'Terms',
  helpAgbIntro: 'Intro',
  helpAgbP1: 'P1',
  helpAgbP2: 'P2',
  helpAgbP3: 'P3',
  helpAgbP4: 'P4',
} as ReturnType<typeof import('../../hooks/useT').useT>;

const currentTheme = {
  bg: 'bg-test',
  card: '',
  textMain: 'text-main',
  textSecondary: 'text-secondary',
  button: 'btn-theme',
  iconColor: 'icon',
  isDark: false,
} as ThemeConfig;

const settings = {
  general: { scoreToWin: 50, teamCount: 2, skipPenalty: false },
  mode: { gameMode: GameMode.CLASSIC, classicRoundTime: 60 },
} as GameSettings;

describe('RulesModal', () => {
  it('should render tall sheet with scroll body and switch tabs', async () => {
    const user = userEvent.setup();
    render(
      <RulesModal isOpen onClose={vi.fn()} t={t} currentTheme={currentTheme} settings={settings} />
    );

    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('bottom-sheet-panel--size-tall');
    expect(document.querySelector('[data-sheet-scroll]')).toBeTruthy();
    expect(document.querySelector('[data-bottom-sheet-backdrop]')?.className).toContain(
      'z-[var(--z-modal-nested)]'
    );
    expect(screen.getByRole('heading', { name: 'Rules' })).toBeTruthy();

    await user.click(screen.getByRole('tab', { name: 'FAQ' }));
    expect(screen.getByText('Q1')).toBeTruthy();
  });
});
