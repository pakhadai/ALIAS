import type { RoomErrorCode } from '@alias/shared';
import { Language } from '@alias/shared';
import { getUiStrings } from '../hooks/useT';

export type OnlineSocketReadiness = {
  isConnected: boolean;
  isReconnecting: boolean;
  roomCode: string;
};

/** True when the client may emit `game:action` to the online room. */
export function canEmitOnlineGameAction(
  appRoomCode: string,
  socket: OnlineSocketReadiness
): boolean {
  if (!appRoomCode.trim()) return false;
  if (!socket.isConnected) return false;
  if (socket.isReconnecting) return false;
  return true;
}

const ROOM_ERROR_I18N_KEYS: Partial<Record<RoomErrorCode, keyof ReturnType<typeof getUiStrings>>> =
  {
    PLAYER_NOT_IN_ROOM: 'playerNotInRoom',
    SOCKET_CONNECT_ERROR: 'connectionFailed',
  };

/** User-facing copy for `room:error` — prefers i18n over raw server English. */
export function resolveRoomErrorMessage(
  code: RoomErrorCode,
  fallbackMessage: string,
  uiLanguage: Language
): string {
  const t = getUiStrings(uiLanguage);
  const key = ROOM_ERROR_I18N_KEYS[code];
  if (key && t[key]) {
    return t[key];
  }
  return fallbackMessage;
}
