import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GameMode, GameState } from '../../types';
import { SettingsScreen } from './SettingsScreen';

const sendAction = vi.fn();
const setGameState = vi.fn();
const showNotification = vi.fn();
const fetchStore = vi.fn();

let mockIsHost = true;
let mockGameState = GameState.SETTINGS;

const baseSettings = {
  general: {
    language: 'UA',
    teamCount: 2,
    teamMode: 'TEAMS' as const,
    categories: ['GENERAL'],
    scoreToWin: 30,
    skipPenalty: false,
  },
  mode: {
    gameMode: GameMode.CLASSIC,
    classicRoundTime: 60,
  },
};

const theme = {
  bg: 'bg-test',
  card: 'bg-card',
  textMain: 'text-main',
  textSecondary: 'text-secondary',
  textAccent: 'text-accent',
  button: 'btn',
  iconColor: 'icon',
  isDark: true,
};

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    settings: baseSettings,
    currentTheme: theme,
    setGameState,
    isHost: mockIsHost,
    sendAction,
    showNotification,
    gameState: mockGameState,
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({ isAuthenticated: true }),
}));

vi.mock('../../services/api', () => ({
  fetchStore: (...args: unknown[]) => fetchStore(...args),
}));

vi.mock('../../utils/haptics', () => ({
  HAPTIC: { nav: 10 },
  vibrate: vi.fn(),
}));

vi.mock('../../components/CustomDeck/CustomDeckModal', () => ({
  CustomDeckModal: () => null,
}));

const mockT = {
  settings: 'Settings',
  save: 'Save',
  settingsSavedSuccess: 'Settings saved',
  backToLobby: 'Back to lobby',
  gameMode: 'Mode',
  content: 'Dictionary',
  rulesTitle: 'Rules',
  gameModeClassic: 'Classic',
  gameModeTranslation: 'Translation',
  gameModeSynonyms: 'Synonyms',
  gameModeQuiz: 'Quiz',
  gameModeHardcore: 'Hardcore',
  gameModeImposter: 'Imposter',
  gameModeHintClassic: 'Classic hint',
  gameModeHintTranslation: 'Translation hint',
  gameModeHintSynonyms: 'Synonyms hint',
  gameModeHintQuiz: 'Quiz hint',
  gameModeHintHardcore: 'Hardcore hint',
  gameModeHintImposter: 'Imposter hint',
  categories: 'Categories',
  customWords: 'Custom words',
  rules: 'Rules',
  lobbyRulesIntro: 'Adjust rules for this game.',
  lobbyRulesSectionBasics: 'Basics',
  lobbyRulesSectionExtras: 'Extras',
  roundTime: 'Round time',
  scoreToWin: 'Score to win',
  enabled: 'On',
  disabled: 'Off',
  cat_general: 'General',
  close: 'Close',
};

vi.mock('../../hooks/useT', () => ({
  useT: () => mockT,
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsHost = true;
    mockGameState = GameState.SETTINGS;
    fetchStore.mockResolvedValue({ wordPacks: [], themes: [], soundPacks: [] });
  });

  it('should render settings title and save footer for host', async () => {
    render(<SettingsScreen />);

    expect(screen.getByText('Settings')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    expect(saveBtn).toBeInTheDocument();
    expect(saveBtn).toHaveClass('lobby-start-btn', 'lobby-start-btn--plain');
    await waitFor(() => expect(fetchStore).toHaveBeenCalledOnce());
  });

  it('should render header title with ScreenTitle heading typography', async () => {
    render(<SettingsScreen />);

    const heading = await screen.findByRole('heading', { level: 2, name: 'Settings' });
    await waitFor(() => expect(fetchStore).toHaveBeenCalledOnce());

    expect(heading.className).toContain('text-ui-heading');
    expect(heading.className).toContain('font-serif');
    expect(heading.className).not.toMatch(/tracking-\[0\.4em\]/);
  });

  it('should dispatch UPDATE_SETTINGS when host selects a game mode', async () => {
    const user = userEvent.setup();
    render(<SettingsScreen />);

    await user.click(screen.getByRole('button', { name: /Quiz/i }));

    expect(sendAction).toHaveBeenCalledWith({
      action: 'UPDATE_SETTINGS',
      data: { mode: { gameMode: GameMode.QUIZ } },
    });
  });

  it('should not dispatch UPDATE_SETTINGS when guest selects a game mode', async () => {
    mockIsHost = false;
    const user = userEvent.setup();
    render(<SettingsScreen />);

    await user.click(screen.getByRole('button', { name: /Quiz/i }));

    expect(sendAction).not.toHaveBeenCalled();
  });

  it('should keep category controls read-only for guest on content tab', async () => {
    mockIsHost = false;
    const user = userEvent.setup();
    render(<SettingsScreen />);

    await user.click(screen.getByRole('tab', { name: 'Dictionary' }));

    const categoryButtons = screen.getAllByRole('button', { name: 'General' });
    expect(categoryButtons.length).toBeGreaterThan(0);
    for (const button of categoryButtons) {
      expect(button).toBeDisabled();
    }
  });

  it('should return to lobby when host taps save', async () => {
    const user = userEvent.setup();
    render(<SettingsScreen />);

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(showNotification).toHaveBeenCalledWith('Settings saved', 'success');
    expect(setGameState).toHaveBeenCalledWith(GameState.LOBBY);
  });
});
