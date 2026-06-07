import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuScreen } from './MenuScreen';
import { GameState } from '../../types';

const setGameState = vi.fn();
const createNewRoom = vi.fn().mockResolvedValue(undefined);
const startOfflineGame = vi.fn();
const setRoomCode = vi.fn();
const checkRoomExists = vi.fn().mockResolvedValue(true);
const showNotification = vi.fn();

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    gameState: GameState.MENU,
    setGameState,
    settings: { general: {}, mode: { gameMode: 'CLASSIC' } },
    setSettings: vi.fn(),
    currentTheme: {
      bg: 'bg-test',
      card: '',
      textMain: 'text-main',
      textSecondary: 'text-secondary',
      button: 'btn',
      iconColor: 'icon',
      isDark: true,
    },
    createNewRoom,
    startOfflineGame,
    connectionError: null,
    setRoomCode,
    checkRoomExists,
    showNotification,
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({ isAuthenticated: false }),
}));

vi.mock('../../hooks/useT', () => ({
  useT: () => ({
    joinGame: 'Приєднатися',
    createGame: 'Створити гру',
    menuOrDivider: 'або',
    playOffline: 'Офлайн режим',
    enterCode: 'Введіть код',
    enter: 'Увійти',
    close: 'Закрити',
    rulesTitle: 'Правила',
    roomNotFound: 'Кімната {0} не знайдена',
    fullscreenUnavailableTitle: 'Fullscreen',
    fullscreenUnavailableBody: 'Unavailable',
    settings: 'Налаштування',
    helpSectionRules: 'Правила',
    helpSectionFaq: 'FAQ',
    helpSectionPrivacy: 'Privacy',
    helpSectionImpressum: 'Impressum',
    helpSectionAgb: 'AGB',
    helpRulesModesTitle: 'Modes',
    gameModeClassic: 'Classic',
    gameModeHintClassic: 'Hint',
    gameModeTranslation: 'Translation',
    gameModeHintTranslation: 'Hint',
    gameModeQuiz: 'Quiz',
    gameModeHintQuiz: 'Hint',
    gameModeHardcore: 'Hardcore',
    gameModeHintHardcore: 'Hint',
    gameModeSynonyms: 'Synonyms',
    gameModeHintSynonyms: 'Hint',
    gameModeImposter: 'Imposter',
    gameModeHintImposter: 'Hint',
    pts: 'pts',
    teams: 'teams',
    cat_general: 'General',
    language: 'Language',
  }),
}));

vi.mock('../../hooks/useTelegramApp', () => ({
  isTelegramMiniApp: () => false,
}));

vi.mock('../../utils/fullscreen', () => ({
  toggleFullscreen: vi.fn().mockResolvedValue('entered'),
  isStandaloneDisplay: () => false,
  isAppleMobile: () => false,
}));

describe('MenuScreen buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('should navigate to profile when profile button is clicked', async () => {
    const user = userEvent.setup();
    render(<MenuScreen />);

    await user.click(screen.getByRole('button', { name: 'Profile' }));

    expect(setGameState).toHaveBeenCalledWith(GameState.PROFILE);
  });

  it('should open app settings when settings button is clicked', async () => {
    const user = userEvent.setup();
    render(<MenuScreen />);

    await user.click(screen.getByRole('button', { name: 'Settings' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Налаштування' })).toBeTruthy();
    });
  });

  it('should open rules modal when rules button is clicked', async () => {
    const user = userEvent.setup();
    render(<MenuScreen />);

    await user.click(screen.getByRole('button', { name: 'Правила' }));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Правила' })).toBeTruthy();
    });
  });

  it('should call createNewRoom when create game button is clicked', async () => {
    const user = userEvent.setup();
    render(<MenuScreen />);

    await user.click(screen.getByTestId('menu-create-game'));

    await waitFor(() => {
      expect(createNewRoom).toHaveBeenCalledTimes(1);
    });
  });

  it('should open quick join sheet when join button is clicked', async () => {
    const user = userEvent.setup();
    render(<MenuScreen />);

    await user.click(screen.getByTestId('menu-join-game'));

    await waitFor(() => {
      expect(screen.getByTestId('menu-quick-join-code')).toBeTruthy();
    });
  });

  it('should call startOfflineGame when offline button is clicked', async () => {
    const user = userEvent.setup();
    render(<MenuScreen />);

    await user.click(screen.getByTestId('menu-offline'));

    expect(startOfflineGame).toHaveBeenCalledTimes(1);
  });

  it('should submit quick join when code is valid', async () => {
    const user = userEvent.setup();
    render(<MenuScreen />);

    await user.click(screen.getByTestId('menu-join-game'));
    await user.type(screen.getByTestId('menu-quick-join-code'), '12345');
    await user.click(screen.getByTestId('menu-quick-join-submit'));

    await waitFor(() => {
      expect(checkRoomExists).toHaveBeenCalledWith('12345');
      expect(setRoomCode).toHaveBeenCalledWith('12345');
      expect(setGameState).toHaveBeenCalledWith(GameState.ENTER_NAME);
    });
  });
});
