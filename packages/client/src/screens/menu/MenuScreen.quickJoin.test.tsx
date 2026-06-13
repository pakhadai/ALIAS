import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MenuScreen } from './MenuScreen';
import { GameState } from '../../types';

const setGameState = vi.fn();
const createNewRoom = vi.fn();
const startOfflineGame = vi.fn();
const setRoomCode = vi.fn();
const checkRoomExists = vi.fn();
const showNotification = vi.fn();

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    gameState: GameState.MENU,
    setGameState,
    settings: { general: {}, mode: {} },
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
    homeTagline: 'Говори · Вгадуй',
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
  }),
}));

vi.mock('../../hooks/useTelegramApp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useTelegramApp')>();
  return {
    ...actual,
    isTelegramMiniApp: () => false,
    hasTelegramInitData: () => false,
  };
});

describe('MenuScreen quick join', () => {
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

  it('should open quick join sheet when join button is clicked', async () => {
    const user = userEvent.setup();
    render(<MenuScreen />);

    await user.click(screen.getByTestId('menu-join-game'));

    await waitFor(() => {
      expect(screen.getByTestId('menu-quick-join-code')).toBeTruthy();
    });
  });
});
