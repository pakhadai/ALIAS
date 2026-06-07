import { useEffect } from 'react';
import { GameState } from '../types';

type UseTelegramBackButtonArgs = {
  isTelegram: boolean;
  isAuthenticated: boolean;
  gameState: GameState;
  setGameState: (state: GameState) => void;
  leaveRoom: () => void;
};

/** Wires Telegram Mini App BackButton to in-app navigation — deps-driven lifecycle. */
export function useTelegramBackButton({
  isTelegram,
  isAuthenticated,
  gameState,
  setGameState,
  leaveRoom,
}: UseTelegramBackButtonArgs): void {
  useEffect(() => {
    if (!isTelegram) return;
    const tg = window.Telegram?.WebApp;
    const back = tg?.BackButton;
    if (!back?.show || !back.hide || !back.onClick) return;

    const isMain = gameState === GameState.MENU;
    if (isMain) back.hide();
    else back.show();

    const onBack = () => {
      switch (gameState) {
        case GameState.PROFILE_SETTINGS:
          setGameState(GameState.PROFILE);
          return;
        case GameState.LOBBY_SETTINGS:
          setGameState(GameState.LOBBY);
          return;
        case GameState.PLAYER_STATS:
          setGameState(isAuthenticated ? GameState.PROFILE : GameState.MENU);
          return;
        case GameState.SETTINGS:
        case GameState.TEAMS:
        case GameState.VS_SCREEN:
        case GameState.PRE_ROUND:
        case GameState.COUNTDOWN:
        case GameState.PLAYING:
        case GameState.ROUND_SUMMARY:
        case GameState.SCOREBOARD:
        case GameState.GAME_OVER:
          leaveRoom();
          return;
        default:
          setGameState(GameState.MENU);
      }
    };

    back.onClick(onBack);
    return () => {
      back.offClick?.(onBack);
    };
  }, [gameState, isAuthenticated, isTelegram, leaveRoom, setGameState]);
}
