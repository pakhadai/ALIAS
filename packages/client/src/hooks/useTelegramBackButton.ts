import { useEffect } from 'react';
import { GameState } from '../types';

type UseTelegramBackButtonArgs = {
  isTelegram: boolean;
  isAuthenticated: boolean;
  gameState: GameState;
  gameMode: 'ONLINE' | 'OFFLINE';
  roomCode: string | null;
  setGameState: (state: GameState) => void;
  leaveRoom: (opts?: { resetGameMode?: boolean }) => void;
};

/** Screens where native BackButton is hidden — see `docs/TMA_LAYOUT.md#header-matrix-gamestate`. */
export const TELEGRAM_BACK_HIDDEN_STATES: ReadonlySet<GameState> = new Set([
  GameState.MENU,
  GameState.ENTER_NAME,
]);

export type TelegramBackAction =
  | { type: 'setGameState'; state: GameState }
  | { type: 'leaveRoom'; opts?: { resetGameMode?: boolean } };

type TelegramBackContext = {
  isAuthenticated: boolean;
  roomCode: string | null;
  gameMode: 'ONLINE' | 'OFFLINE';
};

/**
 * Resolves TMA BackButton target from Header matrix (`TMA_LAYOUT.md`).
 * Returns `null` when BackButton should be hidden (main screens).
 */
export function resolveTelegramBackAction(
  gameState: GameState,
  ctx: TelegramBackContext
): TelegramBackAction | null {
  if (TELEGRAM_BACK_HIDDEN_STATES.has(gameState)) return null;

  switch (gameState) {
    case GameState.PROFILE_SETTINGS:
      return { type: 'setGameState', state: GameState.PROFILE };
    case GameState.LOBBY_SETTINGS:
      return {
        type: 'setGameState',
        state: ctx.roomCode ? GameState.LOBBY : GameState.MENU,
      };
    case GameState.PLAYER_STATS:
      return {
        type: 'setGameState',
        state: ctx.isAuthenticated ? GameState.PROFILE : GameState.MENU,
      };
    case GameState.SETTINGS:
    case GameState.TEAMS:
      return { type: 'setGameState', state: GameState.LOBBY };
    case GameState.LOBBY:
      return {
        type: 'leaveRoom',
        opts: ctx.gameMode === 'OFFLINE' ? { resetGameMode: false } : undefined,
      };
    case GameState.VS_SCREEN:
    case GameState.PRE_ROUND:
    case GameState.COUNTDOWN:
    case GameState.PLAYING:
    case GameState.ROUND_SUMMARY:
    case GameState.SCOREBOARD:
    case GameState.GAME_OVER:
      return { type: 'leaveRoom' };
    case GameState.PROFILE:
    case GameState.MY_WORD_PACKS:
    case GameState.MY_DECKS:
    case GameState.RULES:
    case GameState.JOIN_INPUT:
    case GameState.STORE:
    default:
      return { type: 'setGameState', state: GameState.MENU };
  }
}

/** Wires Telegram Mini App BackButton to in-app navigation — deps-driven lifecycle. */
export function useTelegramBackButton({
  isTelegram,
  isAuthenticated,
  gameState,
  gameMode,
  roomCode,
  setGameState,
  leaveRoom,
}: UseTelegramBackButtonArgs): void {
  useEffect(() => {
    if (!isTelegram) return;
    const tg = window.Telegram?.WebApp;
    const back = tg?.BackButton;
    if (!back?.show || !back.hide || !back.onClick) return;

    const action = resolveTelegramBackAction(gameState, {
      isAuthenticated,
      roomCode,
      gameMode,
    });

    if (!action) back.hide();
    else back.show();

    const onBack = () => {
      const resolved = resolveTelegramBackAction(gameState, {
        isAuthenticated,
        roomCode,
        gameMode,
      });
      if (!resolved) return;
      if (resolved.type === 'setGameState') setGameState(resolved.state);
      else leaveRoom(resolved.opts);
    };

    back.onClick(onBack);
    return () => {
      back.offClick?.(onBack);
    };
  }, [gameMode, gameState, isAuthenticated, isTelegram, leaveRoom, roomCode, setGameState]);
}
