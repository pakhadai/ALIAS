import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';
import { SESSION_KEY } from './gameReducer';
import { GameState, AppTheme, Language, GameMode, SoundPreset } from '../types';
import type { GameSyncState } from '@movli/shared';
import { TIME_UP_IDLE_FALLBACK_MS } from '@movli/shared';

type SocketHandlers = {
  onStateSync: (sync: GameSyncState) => void;
  onImposterSecret: (payload: { isImposter: boolean; word: string | null }) => void;
  onPlayerJoined: (player: unknown) => void;
  onPlayerLeft: (id: string) => void;
  onKicked: () => void;
  onError: (err: { code: string; message: string }) => void;
  onNotification: (message: string, type: 'info' | 'error' | 'success') => void;
  onRejoined: (roomCode: string, playerId: string) => void;
};

let socketHandlers: SocketHandlers | null = null;
const sendGameAction = vi.fn();
const createRoom = vi.fn();
const leaveRoom = vi.fn(() => {
  mockSocketApi.roomCode = '';
  mockSocketApi.myPlayerId = '';
});

const mockSocketApi = {
  isConnected: false,
  isReconnecting: false,
  roomCode: '',
  myPlayerId: '',
};

vi.mock('../hooks/useSocketConnection', () => ({
  useSocketConnection: (handlers: SocketHandlers) => {
    socketHandlers = handlers;
    return {
      connect: vi.fn(),
      createRoom,
      joinRoom: vi.fn(),
      leaveRoom,
      sendGameAction,
      checkRoomExists: vi.fn(),
      get isConnected() {
        return mockSocketApi.isConnected;
      },
      get isReconnecting() {
        return mockSocketApi.isReconnecting;
      },
      get roomCode() {
        return mockSocketApi.roomCode;
      },
      get myPlayerId() {
        return mockSocketApi.myPlayerId;
      },
    };
  },
}));

vi.mock('../hooks/useAudio', () => ({
  useAudio: () => ({ play: vi.fn() }),
}));

vi.mock('./AuthContext', () => ({
  useAuthContext: () => ({
    isAuthenticated: false,
    authState: { status: 'idle' as const },
    userId: '',
    profile: null,
    refreshProfile: vi.fn(),
    loginWithGoogle: vi.fn(),
    loginWithTelegram: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../hooks/useTelegramLobbyDeepLink', () => ({
  useTelegramLobbyDeepLink: vi.fn(),
}));

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    fetchLobbySettings: vi.fn().mockResolvedValue(null),
    fetchDeckByCode: vi.fn(),
  };
});

function Probe() {
  const game = useGame();
  return (
    <div>
      <span data-testid="game-state">{game.gameState}</span>
      <span data-testid="room-code">{game.roomCode}</span>
      <span data-testid="player-count">{game.players.length}</span>
      <span data-testid="is-host">{String(game.isHost)}</span>
      <span data-testid="theme">{game.settings.general.theme}</span>
      <span data-testid="imposter-secret">{game.imposterSecret?.word ?? 'none'}</span>
      <button type="button" onClick={() => game.setGameState(GameState.SETTINGS)}>
        open-settings
      </button>
      <button type="button" onClick={() => game.startOfflineGame()}>
        start-offline
      </button>
      <button type="button" onClick={() => game.handleCorrect()}>
        correct
      </button>
      <span data-testid="score-to-win">{game.settings.general.scoreToWin}</span>
      <span data-testid="game-mode">{game.gameMode}</span>
      <button
        type="button"
        onClick={() =>
          game.setSettings((prev) => ({
            ...prev,
            general: { ...prev.general, scoreToWin: 99 },
          }))
        }
      >
        bump-score
      </button>
      <button type="button" onClick={() => game.leaveRoom({ resetGameMode: false })}>
        leave-offline
      </button>
      <button
        type="button"
        onClick={() => {
          game.setGameState(GameState.PLAYING);
        }}
      >
        set-playing
      </button>
      <button type="button" onClick={() => game.setTimeLeft(0)}>
        expire-timer
      </button>
      <button
        type="button"
        onClick={() => {
          void game.handleJoin('offline-id', 'Host', '🐶', null, 'OFFLINE');
        }}
      >
        offline-join
      </button>
    </div>
  );
}

function baseSync(overrides: Partial<GameSyncState> = {}): GameSyncState {
  return {
    roomCode: '12345',
    gameState: GameState.LOBBY,
    settings: {
      general: {
        language: Language.UA,
        scoreToWin: 30,
        skipPenalty: true,
        categories: [],
        soundEnabled: true,
        soundPreset: SoundPreset.FUN,
        teamMode: 'TEAMS',
        teamCount: 2,
        theme: AppTheme.CYBERPUNK,
      },
      mode: { gameMode: GameMode.CLASSIC, classicRoundTime: 60 },
    },
    players: [
      {
        id: 'p-host',
        name: 'Host',
        avatar: '🎮',
        isHost: true,
        stats: { explained: 0, guessed: 0 },
      },
      {
        id: 'p-guest',
        name: 'Guest',
        avatar: '🎲',
        isHost: false,
        stats: { explained: 0, guessed: 0 },
      },
    ],
    teams: [],
    teamsLocked: false,
    currentTeamIndex: 0,
    currentWord: '',
    currentTask: null,
    currentRoundStats: { correct: 0, skipped: 0, words: [], teamId: '', explainerName: '' },
    timeLeft: 0,
    isPaused: false,
    roundsPlayed: 0,
    usedWords: [],
    wordDeck: [],
    ...overrides,
  };
}

describe('GameProvider', () => {
  beforeEach(() => {
    socketHandlers = null;
    sendGameAction.mockReset();
    createRoom.mockReset();
    mockSocketApi.isConnected = false;
    mockSocketApi.isReconnecting = false;
    mockSocketApi.roomCode = '';
    mockSocketApi.myPlayerId = 'p-host';
    leaveRoom.mockClear();
    localStorage.clear();
  });

  it('should apply full game:state-sync payload from socket handler', async () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    await act(async () => {
      socketHandlers?.onRejoined('12345', 'p-host');
      socketHandlers?.onStateSync(
        baseSync({ gameState: GameState.PLAYING, currentWord: 'TestWord', timeLeft: 42 })
      );
    });

    expect(screen.getByTestId('game-state').textContent).toBe(GameState.PLAYING);
    expect(screen.getByTestId('room-code').textContent).toBe('12345');
    expect(screen.getByTestId('player-count').textContent).toBe('2');
    expect(screen.getByTestId('is-host').textContent).toBe('true');
  });

  it('should set --ui-bg, --ui-accent, and --ui-fg when theme changes', async () => {
    function ThemeCssProbe() {
      const game = useGame();
      return (
        <button
          type="button"
          onClick={() =>
            game.setSettings((prev) => ({
              ...prev,
              general: { ...prev.general, theme: AppTheme.FOREST },
            }))
          }
        >
          switch-forest
        </button>
      );
    }

    render(
      <GameProvider>
        <ThemeCssProbe />
      </GameProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--ui-bg')).toBe('#E2E3DB');
    expect(root.style.getPropertyValue('--ui-accent')).toBe('#EE4239');
    expect(root.style.getPropertyValue('--ui-fg')).toBe('#272828');

    await act(async () => {
      screen.getByText('switch-forest').click();
    });

    expect(root.style.getPropertyValue('--ui-bg')).toBe('#FAFCFF');
    expect(root.style.getPropertyValue('--ui-accent')).toBe('#6366F1');
    expect(root.style.getPropertyValue('--ui-fg')).toBe('#0F172A');
  });

  it('should preserve local theme when server sync includes different theme', async () => {
    localStorage.setItem(
      'movli_preferences',
      JSON.stringify({ general: { theme: AppTheme.FOREST } })
    );

    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    expect(screen.getByTestId('theme').textContent).toBe(AppTheme.FOREST);

    await act(async () => {
      socketHandlers?.onStateSync(baseSync());
    });

    expect(screen.getByTestId('theme').textContent).toBe(AppTheme.FOREST);
  });

  it('should keep client navigation on SETTINGS when server sends LOBBY sync', async () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    await act(async () => {
      screen.getByText('open-settings').click();
    });
    expect(screen.getByTestId('game-state').textContent).toBe(GameState.SETTINGS);

    await act(async () => {
      socketHandlers?.onStateSync(baseSync({ gameState: GameState.LOBBY }));
    });

    expect(screen.getByTestId('game-state').textContent).toBe(GameState.SETTINGS);
    expect(screen.getByTestId('player-count').textContent).toBe('2');
  });

  it('should dispatch imposter secret from socket callback', async () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    await act(async () => {
      socketHandlers?.onImposterSecret({ isImposter: false, word: 'TabooWord' });
    });

    expect(screen.getByTestId('imposter-secret').textContent).toBe('TabooWord');
  });

  it('should route handleCorrect to offline reducer when gameMode is OFFLINE', async () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    await act(async () => {
      screen.getByText('start-offline').click();
    });

    await act(async () => {
      screen.getByText('correct').click();
    });

    expect(sendGameAction).not.toHaveBeenCalled();
  });

  it('should join offline lobby via handleJoin without createRoom', async () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    await act(async () => {
      screen.getByText('start-offline').click();
    });

    await act(async () => {
      screen.getByText('offline-join').click();
      await Promise.resolve();
    });

    expect(createRoom).not.toHaveBeenCalled();
    expect(screen.getByTestId('game-state').textContent).toBe(GameState.LOBBY);
    expect(screen.getByTestId('player-count').textContent).toBe('1');
  });

  it('should not send UPDATE_SETTINGS when online room socket is not ready', async () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    await act(async () => {
      socketHandlers?.onRejoined('12345', 'p-host');
      socketHandlers?.onStateSync(baseSync());
    });
    expect(screen.getByTestId('score-to-win').textContent).toBe('30');

    mockSocketApi.isConnected = false;

    await act(async () => {
      screen.getByText('bump-score').click();
    });

    expect(sendGameAction).not.toHaveBeenCalled();
    expect(screen.getByTestId('score-to-win').textContent).toBe('30');
  });

  it('should rollback settings on room:error after host optimistic setSettings', async () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    await act(async () => {
      socketHandlers?.onRejoined('12345', 'p-host');
      socketHandlers?.onStateSync(baseSync());
    });
    expect(screen.getByTestId('score-to-win').textContent).toBe('30');

    mockSocketApi.isConnected = true;

    await act(async () => {
      screen.getByText('bump-score').click();
    });
    expect(screen.getByTestId('score-to-win').textContent).toBe('99');
    expect(sendGameAction).toHaveBeenCalled();

    await act(async () => {
      socketHandlers?.onError({ code: 'NOT_ALLOWED', message: 'denied' });
    });
    expect(screen.getByTestId('score-to-win').textContent).toBe('30');
  });

  it('should show localized message for PLAYER_NOT_IN_ROOM room:error without active room', async () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    await act(async () => {
      socketHandlers?.onError({ code: 'PLAYER_NOT_IN_ROOM', message: 'Join a room first' });
    });

    expect(screen.getByText(/кімнат/i)).toBeTruthy();
    expect(screen.getByTestId('game-state').textContent).toBe(GameState.MENU);
    expect(screen.getByTestId('room-code').textContent).toBe('');
  });

  it('should eject restored online lobby to MENU when rejoin fails (ROOM_NOT_FOUND)', async () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        gameState: GameState.LOBBY,
        gameMode: 'ONLINE',
        roomCode: '12345',
        isHost: true,
        myPlayerId: '11111111-1111-1111-8111-111111111111',
        players: [{ id: '11111111-1111-1111-8111-111111111111', name: 'Host', avatar: '🎮' }],
        teams: [],
        settings: {
          general: { language: Language.UA, scoreToWin: 30, categories: [] },
          mode: { gameMode: GameMode.CLASSIC, classicRoundTime: 60 },
        },
      })
    );

    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    expect(screen.getByTestId('game-state').textContent).toBe(GameState.LOBBY);
    expect(screen.getByTestId('room-code').textContent).toBe('12345');

    await act(async () => {
      socketHandlers?.onError({ code: 'ROOM_NOT_FOUND', message: 'Room not found' });
    });

    expect(screen.getByTestId('game-state').textContent).toBe(GameState.MENU);
    expect(screen.getByTestId('room-code').textContent).toBe('');
    expect(screen.getByTestId('player-count').textContent).toBe('0');
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(leaveRoom).toHaveBeenCalled();
    expect(screen.getByText(/Сесію в лобі/i)).toBeTruthy();
  });

  it('should preserve OFFLINE gameMode when leaveRoom resetGameMode is false', async () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    await act(async () => {
      screen.getByText('start-offline').click();
    });
    await act(async () => {
      screen.getByText('offline-join').click();
      await Promise.resolve();
    });
    expect(screen.getByTestId('game-mode').textContent).toBe('OFFLINE');

    await act(async () => {
      screen.getByText('leave-offline').click();
    });
    expect(screen.getByTestId('game-state').textContent).toBe(GameState.MENU);
    expect(screen.getByTestId('game-mode').textContent).toBe('OFFLINE');
  });

  it('should auto-finish offline overtime via TIME_UP after idle fallback', async () => {
    vi.useFakeTimers();

    try {
      render(
        <GameProvider>
          <Probe />
        </GameProvider>
      );

      await act(async () => {
        screen.getByText('start-offline').click();
      });
      await act(async () => {
        screen.getByText('set-playing').click();
      });
      await act(async () => {
        screen.getByText('expire-timer').click();
      });
      expect(screen.getByTestId('game-state').textContent).toBe(GameState.PLAYING);

      await act(async () => {
        vi.advanceTimersByTime(TIME_UP_IDLE_FALLBACK_MS);
      });

      expect(screen.getByTestId('game-state').textContent).toBe(GameState.ROUND_SUMMARY);
    } finally {
      vi.useRealTimers();
    }
  });
});
