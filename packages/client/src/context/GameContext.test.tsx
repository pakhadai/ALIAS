import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { GameProvider, useGame } from './GameContext';
import { GameState, AppTheme, Language, GameMode, SoundPreset } from '../types';
import type { GameSyncState } from '@alias/shared';

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

vi.mock('../hooks/useSocketConnection', () => ({
  useSocketConnection: (handlers: SocketHandlers) => {
    socketHandlers = handlers;
    return {
      connect: vi.fn(),
      createRoom: vi.fn(),
      joinRoom: vi.fn(),
      leaveRoom: vi.fn(),
      sendGameAction,
      checkRoomExists: vi.fn(),
      roomCode: '12345',
      myPlayerId: 'p-host',
    };
  },
}));

vi.mock('../hooks/useAudio', () => ({
  useAudio: () => ({ play: vi.fn() }),
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
    localStorage.clear();
  });

  it('should apply full game:state-sync payload from socket handler', async () => {
    render(
      <GameProvider>
        <Probe />
      </GameProvider>
    );

    await act(async () => {
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
      'alias_preferences',
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

  it('should auto-finish offline overtime via TIME_UP after 5s idle', async () => {
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
        vi.advanceTimersByTime(5000);
      });

      expect(screen.getByTestId('game-state').textContent).toBe(GameState.ROUND_SUMMARY);
    } finally {
      vi.useRealTimers();
    }
  });
});
