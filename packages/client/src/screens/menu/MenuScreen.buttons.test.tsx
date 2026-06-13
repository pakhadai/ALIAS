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
const handleJoin = vi.fn().mockResolvedValue(false);
const leaveRoom = vi.fn();

let mockGameState = GameState.MENU;

vi.mock('../../context/GameContext', () => ({
  useGame: () => ({
    gameState: mockGameState,
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
    handleJoin,
    gameMode: 'ONLINE',
    leaveRoom,
  }),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({
    isAuthenticated: false,
    authState: { status: 'anonymous', userId: '', profile: null },
    profile: null,
  }),
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
    settings: 'Налаштування',
    whoAreYou: 'Хто ви?',
    namePlaceholder: "Ім'я",
    next: 'Далі',
    cancel: 'Скасувати',
    enteringRoom: 'Входимо…',
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

vi.mock('../../hooks/useTelegramApp', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useTelegramApp')>();
  return {
    ...actual,
    isTelegramMiniApp: () => false,
    hasTelegramInitData: () => false,
  };
});

vi.mock('../../utils/fullscreen', () => ({
  toggleFullscreen: vi.fn().mockResolvedValue('entered'),
  isStandaloneDisplay: () => false,
  isAppleMobile: () => false,
}));

describe('MenuScreen buttons', () => {
  beforeEach(() => {
    mockGameState = GameState.MENU;
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

  it('should show home tagline and ambient word rain on menu', () => {
    const { container } = render(<MenuScreen />);

    expect(screen.getByText('Говори · Вгадуй')).toBeInTheDocument();
    expect(container.querySelector('.home-word-rain')).not.toBeNull();
  });

  it('should navigate to profile when profile button is clicked', async () => {
    const user = userEvent.setup();
    render(<MenuScreen />);

    await user.click(screen.getByRole('button', { name: 'Profile' }));

    expect(setGameState).toHaveBeenCalledWith(GameState.PROFILE);
  });

  it('should show solid guest badge on profile icon when not authenticated', () => {
    render(<MenuScreen />);

    const badge = screen.getByTestId('menu-profile-guest-badge');
    expect(badge).toBeVisible();
    expect(badge.className).toContain('menu-profile-guest-badge');
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

    await user.click(screen.getByTestId('menu-rules-button'));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Правила' })).toBeTruthy();
    });
  });

  it('should use unified button primitives on menu CTAs', () => {
    render(<MenuScreen />);

    expect(screen.getByTestId('menu-create-game-shell')).toHaveClass('accent-footer-cta-shell');
    expect(screen.getByTestId('menu-create-game')).toHaveClass('lobby-start-btn--ready');
    expect(screen.getByTestId('menu-join-game')).toHaveClass('rounded-theme');
    expect(screen.getByTestId('menu-offline')).toHaveClass('rounded-theme');
  });

  it('should use glass icon chips in menu header', () => {
    render(<MenuScreen />);

    const headerIcons = screen.getByTestId('menu-action-icons');
    expect(headerIcons.querySelectorAll('.ui-glass-icon-btn').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByTestId('menu-profile-guest-badge')).toBeInTheDocument();
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

describe('MenuScreen EnterName overlay', () => {
  beforeEach(() => {
    mockGameState = GameState.ENTER_NAME;
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

  it('should show EnterName sheet and freeze menu chrome from assistive tech', async () => {
    render(<MenuScreen />);

    expect(screen.getByTestId('enter-name-screen')).toBeTruthy();
    expect(screen.getByTestId('enter-name')).toBeTruthy();

    const menuHeader = screen.getByTestId('menu-app-header').closest('header');
    expect(menuHeader?.getAttribute('aria-hidden')).toBe('true');

    const main = screen.getByTestId('menu-create-game').closest('main');
    expect(main?.getAttribute('aria-hidden')).toBe('true');
  });

  it('should not render menu modals while EnterName is open', () => {
    render(<MenuScreen />);

    expect(screen.queryByTestId('menu-quick-join-code')).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'Правила' })).toBeNull();
  });
});
