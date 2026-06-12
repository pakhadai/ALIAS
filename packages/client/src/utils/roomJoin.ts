import { ROOM_CODE_LENGTH } from '../constants';
import { GameState } from '../types';

/** Telegram Mini App invite prefix (`startapp=lobby_<code>`). */
export const TELEGRAM_LOBBY_START_PREFIX = 'lobby_';

const ROOM_CODE_RE = /^\d+$/;

export function isValidRoomCode(code: string): boolean {
  return code.length === ROOM_CODE_LENGTH && ROOM_CODE_RE.test(code);
}

/** Parses `lobby_<roomCode>` from Telegram `start_param` / `startapp`. */
export function parseTelegramLobbyRoomCode(startParam: string): string | null {
  if (!startParam.startsWith(TELEGRAM_LOBBY_START_PREFIX)) return null;
  const roomCode = startParam.slice(TELEGRAM_LOBBY_START_PREFIX.length).trim();
  return isValidRoomCode(roomCode) ? roomCode : null;
}

/** PWA / web share URL that opens the app with `?room=` for quick join. */
export function buildRoomJoinUrl(roomCode: string): string {
  const u = new URL(window.location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('room', roomCode);
  return u.toString();
}

/** Telegram Mini App invite URL (`startapp=lobby_<roomCode>`). */
export function buildTelegramLobbyInviteUrl(appLink: string, roomCode: string): string {
  try {
    const u = new URL(appLink);
    u.searchParams.set('startapp', `${TELEGRAM_LOBBY_START_PREFIX}${roomCode}`);
    return u.toString();
  } catch {
    const sep = appLink.includes('?') ? '&' : '?';
    return `${appLink}${sep}startapp=${TELEGRAM_LOBBY_START_PREFIX}${roomCode}`;
  }
}

export type AttemptRoomJoinResult = 'success' | 'invalid_code' | 'not_found' | 'error';

export type AttemptRoomJoinDeps = {
  checkRoomExists: (code: string) => Promise<boolean>;
  onJoin: (roomCode: string) => void;
};

/** Validates room code, checks existence, then navigates to enter-name flow. */
export async function attemptRoomJoin(
  roomCode: string,
  { checkRoomExists, onJoin }: AttemptRoomJoinDeps
): Promise<AttemptRoomJoinResult> {
  if (!isValidRoomCode(roomCode)) return 'invalid_code';
  try {
    const exists = await checkRoomExists(roomCode);
    if (!exists) return 'not_found';
    onJoin(roomCode);
    return 'success';
  } catch {
    return 'error';
  }
}

/** Convenience for callers that dispatch GameContext state directly. */
export function roomJoinEnterNamePayload(roomCode: string): {
  roomCode: string;
  gameState: GameState.ENTER_NAME;
} {
  return { roomCode, gameState: GameState.ENTER_NAME };
}
