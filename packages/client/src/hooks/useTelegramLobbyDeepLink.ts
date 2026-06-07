import { useEffect, useRef } from 'react';
import { GameState } from '../types';
import { ROOM_CODE_LENGTH } from '../constants';

type UseTelegramLobbyDeepLinkArgs = {
  isAuthenticated: boolean;
  startParam: string | null;
  gameState: GameState;
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

    if (roomCode.length !== ROOM_CODE_LENGTH || !/^\d+$/.test(roomCode)) {
      showNotification('Некоректний код кімнати в запрошенні', 'error');
      return;
    }

    void (async () => {
      try {
        const exists = await checkRoomExists(roomCode);
        if (!exists) {
          showNotification(`Кімната ${roomCode} не знайдена`, 'error');
          return;
        }
        setRoomCode(roomCode);
        setGameState(GameState.ENTER_NAME);
      } catch {
        showNotification('Не вдалося приєднатись за запрошенням', 'error');
      }
    })();
  }, [
    checkRoomExists,
    gameState,
    isAuthenticated,
    setGameState,
    setRoomCode,
    showNotification,
    startParam,
  ]);
}
