import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  resolveTelegramBackAction,
  TELEGRAM_BACK_HIDDEN_STATES,
  useTelegramBackButton,
} from './useTelegramBackButton';
import { GameState } from '../types';

describe('resolveTelegramBackAction', () => {
  const ctx = {
    isAuthenticated: true,
    roomCode: '12345' as string | null,
    gameMode: 'ONLINE' as const,
  };

  it('should hide back on main screens per header matrix', () => {
    for (const state of TELEGRAM_BACK_HIDDEN_STATES) {
      expect(resolveTelegramBackAction(state, ctx)).toBeNull();
    }
  });

  it('should navigate profile stack screens to MENU', () => {
    for (const state of [
      GameState.PROFILE,
      GameState.MY_WORD_PACKS,
      GameState.MY_DECKS,
      GameState.RULES,
      GameState.JOIN_INPUT,
      GameState.STORE,
    ]) {
      expect(resolveTelegramBackAction(state, ctx)).toEqual({
        type: 'setGameState',
        state: GameState.MENU,
      });
    }
  });

  it('should navigate PROFILE_SETTINGS to PROFILE', () => {
    expect(resolveTelegramBackAction(GameState.PROFILE_SETTINGS, ctx)).toEqual({
      type: 'setGameState',
      state: GameState.PROFILE,
    });
  });

  it('should navigate LOBBY_SETTINGS to LOBBY when roomCode present', () => {
    expect(resolveTelegramBackAction(GameState.LOBBY_SETTINGS, ctx)).toEqual({
      type: 'setGameState',
      state: GameState.LOBBY,
    });
  });

  it('should navigate LOBBY_SETTINGS to MENU when roomCode absent', () => {
    expect(resolveTelegramBackAction(GameState.LOBBY_SETTINGS, { ...ctx, roomCode: null })).toEqual(
      {
        type: 'setGameState',
        state: GameState.MENU,
      }
    );
  });

  it('should navigate PLAYER_STATS to PROFILE when authenticated', () => {
    expect(resolveTelegramBackAction(GameState.PLAYER_STATS, ctx)).toEqual({
      type: 'setGameState',
      state: GameState.PROFILE,
    });
  });

  it('should navigate PLAYER_STATS to MENU when guest', () => {
    expect(
      resolveTelegramBackAction(GameState.PLAYER_STATS, { ...ctx, isAuthenticated: false })
    ).toEqual({
      type: 'setGameState',
      state: GameState.MENU,
    });
  });

  it('should navigate lobby-adjacent settings to LOBBY', () => {
    for (const state of [GameState.SETTINGS, GameState.TEAMS]) {
      expect(resolveTelegramBackAction(state, ctx)).toEqual({
        type: 'setGameState',
        state: GameState.LOBBY,
      });
    }
  });

  it('should leave room from LOBBY and in-game states', () => {
    for (const state of [
      GameState.LOBBY,
      GameState.VS_SCREEN,
      GameState.PRE_ROUND,
      GameState.COUNTDOWN,
      GameState.PLAYING,
      GameState.ROUND_SUMMARY,
      GameState.SCOREBOARD,
      GameState.GAME_OVER,
    ]) {
      expect(resolveTelegramBackAction(state, ctx)).toEqual({ type: 'leaveRoom' });
    }
  });

  it('should leave offline lobby without resetting gameMode', () => {
    expect(resolveTelegramBackAction(GameState.LOBBY, { ...ctx, gameMode: 'OFFLINE' })).toEqual({
      type: 'leaveRoom',
      opts: { resetGameMode: false },
    });
  });
});

describe('useTelegramBackButton', () => {
  const onClickHandlers: Array<() => void> = [];
  const mockBackButton = {
    show: vi.fn(),
    hide: vi.fn(),
    onClick: vi.fn((handler: () => void) => {
      onClickHandlers.push(handler);
    }),
    offClick: vi.fn(),
  };

  beforeEach(() => {
    onClickHandlers.length = 0;
    vi.clearAllMocks();
    Object.defineProperty(window, 'Telegram', {
      configurable: true,
      writable: true,
      value: { WebApp: { BackButton: mockBackButton } },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'Telegram', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  function triggerBack() {
    const handler = onClickHandlers[onClickHandlers.length - 1];
    if (!handler) throw new Error('No back handler registered');
    handler();
  }

  function renderBackHook(
    gameState: GameState,
    roomCode: string | null = '12345',
    gameMode: 'ONLINE' | 'OFFLINE' = 'ONLINE'
  ) {
    const setGameState = vi.fn();
    const leaveRoom = vi.fn();
    renderHook(() =>
      useTelegramBackButton({
        isTelegram: true,
        isAuthenticated: true,
        gameState,
        gameMode,
        roomCode,
        setGameState,
        leaveRoom,
      })
    );
    return { setGameState, leaveRoom };
  }

  it('should hide BackButton on MENU and ENTER_NAME', () => {
    renderBackHook(GameState.MENU);
    expect(mockBackButton.hide).toHaveBeenCalled();
    expect(mockBackButton.show).not.toHaveBeenCalled();

    vi.clearAllMocks();
    renderBackHook(GameState.ENTER_NAME);
    expect(mockBackButton.hide).toHaveBeenCalled();
    expect(mockBackButton.show).not.toHaveBeenCalled();
  });

  it('should show BackButton on navigable screens', () => {
    renderBackHook(GameState.PROFILE);
    expect(mockBackButton.show).toHaveBeenCalled();
    expect(mockBackButton.hide).not.toHaveBeenCalled();
  });

  it('should navigate SETTINGS to LOBBY without leaveRoom', () => {
    const { setGameState, leaveRoom } = renderBackHook(GameState.SETTINGS);
    triggerBack();
    expect(setGameState).toHaveBeenCalledWith(GameState.LOBBY);
    expect(leaveRoom).not.toHaveBeenCalled();
  });

  it('should navigate TEAMS to LOBBY without leaveRoom', () => {
    const { setGameState, leaveRoom } = renderBackHook(GameState.TEAMS);
    triggerBack();
    expect(setGameState).toHaveBeenCalledWith(GameState.LOBBY);
    expect(leaveRoom).not.toHaveBeenCalled();
  });

  it('should leave room on LOBBY back', () => {
    const { setGameState, leaveRoom } = renderBackHook(GameState.LOBBY);
    triggerBack();
    expect(leaveRoom).toHaveBeenCalledWith(undefined);
    expect(setGameState).not.toHaveBeenCalled();
  });

  it('should leave offline lobby without resetting gameMode', () => {
    const { leaveRoom } = renderBackHook(GameState.LOBBY, '12345', 'OFFLINE');
    triggerBack();
    expect(leaveRoom).toHaveBeenCalledWith({ resetGameMode: false });
  });

  it('should leave room on PLAYING back', () => {
    const { setGameState, leaveRoom } = renderBackHook(GameState.PLAYING);
    triggerBack();
    expect(leaveRoom).toHaveBeenCalled();
    expect(setGameState).not.toHaveBeenCalled();
  });

  it('should navigate LOBBY_SETTINGS to MENU when roomCode is absent', () => {
    const { setGameState, leaveRoom } = renderBackHook(GameState.LOBBY_SETTINGS, null);
    triggerBack();
    expect(setGameState).toHaveBeenCalledWith(GameState.MENU);
    expect(leaveRoom).not.toHaveBeenCalled();
  });
});
