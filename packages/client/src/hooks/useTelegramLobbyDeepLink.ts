import { useEffect, useRef } from 'react';
import type { Language } from '@alias/shared';
import { GameState } from '../types';
import { getUiStrings } from './useT';
import {
  TELEGRAM_LOBBY_START_PREFIX,
  attemptRoomJoin,
  parseTelegramLobbyRoomCode,
} from '../utils/roomJoin';

type UseTelegramLobbyDeepLinkArgs = {
  isAuthenticated: boolean;
  startParam: string | null;
  gameState: GameState;
  uiLanguage: Language;
  setGameState: (state: GameState) => void;
  setRoomCode: (code: string) => void;
  checkRoomExists: (code: string) => Promise<boolean>;
  showNotification: (message: string, type: 'info' | 'error' | 'success') => void;
};

/** Consumes Telegram `start_param` lobby invite after auth — deps-driven, not mount-only. */
export function useTelegramLobbyDeepLink({
  isAuthenticated,
  startParam,
  gameState,
  uiLanguage,
  setGameState,
  setRoomCode,
  checkRoomExists,
  showNotification,
}: UseTelegramLobbyDeepLinkArgs): void {
  const consumedStartParamRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!startParam) return;
    if (consumedStartParamRef.current === startParam) return;
    if (gameState !== GameState.MENU) return;
    if (!startParam.startsWith(TELEGRAM_LOBBY_START_PREFIX)) return;

    consumedStartParamRef.current = startParam;
    const t = getUiStrings(uiLanguage);
    const roomCode = parseTelegramLobbyRoomCode(startParam);

    if (!roomCode) {
      showNotification(t.tgDeepLinkInvalidCode, 'error');
      return;
    }

    void (async () => {
      const result = await attemptRoomJoin(roomCode, {
        checkRoomExists,
        onJoin: (code) => {
          setRoomCode(code);
          setGameState(GameState.ENTER_NAME);
        },
      });

      if (result === 'not_found') {
        showNotification(t.tgDeepLinkRoomNotFound.replace('{0}', roomCode), 'error');
      } else if (result === 'error') {
        showNotification(t.tgDeepLinkJoinFailed, 'error');
      }
    })();
  }, [
    checkRoomExists,
    gameState,
    isAuthenticated,
    uiLanguage,
    setGameState,
    setRoomCode,
    showNotification,
    startParam,
  ]);
}
