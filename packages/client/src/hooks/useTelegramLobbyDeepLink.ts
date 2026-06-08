import { useEffect, useRef } from 'react';
import type { Language } from '@alias/shared';
import { GameState } from '../types';
import { ROOM_CODE_LENGTH } from '../constants';
import { getUiStrings } from './useT';

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
    if (!startParam.startsWith('lobby_')) return;

    const roomCode = startParam.slice('lobby_'.length).trim();
    consumedStartParamRef.current = startParam;

    const t = getUiStrings(uiLanguage);

    if (roomCode.length !== ROOM_CODE_LENGTH || !/^\d+$/.test(roomCode)) {
      showNotification(t.tgDeepLinkInvalidCode, 'error');
      return;
    }

    void (async () => {
      try {
        const exists = await checkRoomExists(roomCode);
        if (!exists) {
          showNotification(t.tgDeepLinkRoomNotFound.replace('{0}', roomCode), 'error');
          return;
        }
        setRoomCode(roomCode);
        setGameState(GameState.ENTER_NAME);
      } catch {
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
