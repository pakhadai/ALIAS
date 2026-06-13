import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LobbyRulesSummaryCard, rulesTimeRow } from './LobbyRulesSummaryCard';
import { GameMode } from '../../../types';
import type { GameSettings, ThemeConfig } from '../../../types';
import type { TranslationStrings } from '../../../hooks/useT';
import { Category, Language, AppTheme, SoundPreset } from '@movli/shared';

const theme = {
  bg: 'bg-test',
  card: '',
  textMain: 'text-main',
  textSecondary: 'text-secondary',
  button: 'btn',
  iconColor: 'icon',
  isDark: true,
} as ThemeConfig;

const baseSettings: GameSettings = {
  general: {
    language: Language.UA,
    teamCount: 2,
    teamMode: 'TEAMS',
    categories: [Category.GENERAL],
    scoreToWin: 30,
    skipPenalty: false,
    soundEnabled: true,
    soundPreset: SoundPreset.MINIMAL,
    theme: AppTheme.PAPER_LUXE,
  },
  mode: {
    gameMode: GameMode.CLASSIC,
    classicRoundTime: 60,
  },
};

const t = {
  pts: 'оч.',
  gameMode: 'Режим гри',
  roundTime: 'Час',
  scoreToWin: 'Перемога при',
  categories: 'Категорії',
  lobbyRulesSummaryTitle: 'Правила гри',
  rules: 'Правила',
  tapToEdit: 'Натисніть для зміни',
  customDeckChip: 'Custom: {0}',
  imposterDiscussionTime: 'Обговорення',
  min: 'хв',
} as unknown as TranslationStrings;

const quizModeSettings: GameSettings['mode'] = {
  gameMode: GameMode.QUIZ,
  classicRoundTime: 60,
  quizRoundTime: 120,
  quizQuestionTime: 15,
  quizTimerMode: 'PER_TASK',
  quizTypes: { synonyms: true, antonyms: true, taboo: true, translation: true },
  quizWrongPenaltyEnabled: false,
};

const defaultProps = {
  theme,
  t,
  settings: baseSettings,
  modeLabel: 'Класика',
  categoriesPreview: 'Загальне',
  isHost: true,
  onOpenSettings: vi.fn(),
};

describe('LobbyRulesSummaryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render rules summary rows for host as tappable button', () => {
    render(<LobbyRulesSummaryCard {...defaultProps} />);

    expect(screen.getByTestId('lobby-settings-chips').tagName).toBe('BUTTON');
    expect(screen.getByText('Правила гри')).toBeTruthy();
    expect(screen.getByText('Класика')).toBeTruthy();
    expect(screen.getByText('60s')).toBeTruthy();
    expect(screen.getByText('30 оч.')).toBeTruthy();
    expect(screen.getByText('Загальне')).toBeTruthy();
  });

  it('should render read-only card for guest', () => {
    render(<LobbyRulesSummaryCard {...defaultProps} isHost={false} onOpenSettings={undefined} />);

    expect(screen.getByTestId('lobby-settings-chips').tagName).toBe('DIV');
  });

  it('should call onOpenSettings when host taps card', async () => {
    const user = userEvent.setup();
    const onOpenSettings = vi.fn();

    render(<LobbyRulesSummaryCard {...defaultProps} onOpenSettings={onOpenSettings} />);
    await user.click(screen.getByTestId('lobby-settings-chips'));

    expect(onOpenSettings).toHaveBeenCalledOnce();
  });

  it('should show custom deck chip when custom deck is configured', () => {
    render(
      <LobbyRulesSummaryCard
        {...defaultProps}
        settings={{
          ...baseSettings,
          general: {
            ...baseSettings.general,
            customDeckCode: 'DECK1',
            customDeckName: 'My deck',
          },
        }}
      />
    );

    expect(screen.getByText('Custom: My deck')).toBeTruthy();
  });
});

describe('rulesTimeRow', () => {
  it('should use classic round time for CLASSIC mode', () => {
    expect(rulesTimeRow(baseSettings, t)).toEqual({ label: 'Час', value: '60s' });
  });

  it('should use quiz question time when quiz timer mode is PER_TASK', () => {
    const settings: GameSettings = {
      ...baseSettings,
      mode: quizModeSettings,
    };
    expect(rulesTimeRow(settings, t)).toEqual({ label: 'Час', value: '15s' });
  });

  it('should use imposter discussion minutes for IMPOSTER mode', () => {
    const settings: GameSettings = {
      ...baseSettings,
      mode: { gameMode: GameMode.IMPOSTER, imposterDiscussionTime: 180 },
    };
    expect(rulesTimeRow(settings, t)).toEqual({ label: 'Обговорення', value: '3 хв' });
  });
});
