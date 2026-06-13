import { ROOM_CODE_LENGTH } from '../constants';
import { PLAYER_ID_KEY, ROOM_CODE_KEY } from '../services/api';
import { GameState } from '../types';

const STORED_PLAYER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StoredRejoinSession = { roomCode: string; playerId: string };

/** Valid persisted `room:rejoin` keys from localStorage (optional room filter). */
export function getStoredRejoinSession(targetRoomCode?: string): StoredRejoinSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const roomCode = localStorage.getItem(ROOM_CODE_KEY);
    const playerId = localStorage.getItem(PLAYER_ID_KEY);
    if (!roomCode || !playerId) return null;
    if (!isValidRoomCode(roomCode) || !STORED_PLAYER_UUID_RE.test(playerId)) return null;
    if (targetRoomCode != null && roomCode !== targetRoomCode) return null;
    return { roomCode, playerId };
  } catch {
    return null;
  }
}

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

/**
 * Normalizes BotFather Mini App base URL to `https://t.me/<bot>?startapp=…`.
 * Legacy env values like `https://t.me/aliasmaster_bot/app` map to the main app link.
 */
export function normalizeTelegramAppLink(appLink: string): string {
  const trimmed = appLink.trim();
  if (!trimmed) return trimmed;

  try {
    const u = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (u.hostname === 't.me' || u.hostname === 'telegram.me') {
      const segments = u.pathname.split('/').filter(Boolean);
      if (segments.length === 2 && segments[1] === 'app') {
        u.pathname = `/${segments[0]}`;
      }
    }
    u.search = '';
    u.hash = '';
    return u.toString().replace(/\/$/, '');
  } catch {
    return trimmed.replace(/\/app\/?(?=[?#]|$)/, '');
  }
}

/** Telegram Mini App invite URL (`startapp=lobby_<roomCode>`). */
export function buildTelegramLobbyInviteUrl(appLink: string, roomCode: string): string {
  const base = normalizeTelegramAppLink(appLink);
  try {
    const u = new URL(base.startsWith('http') ? base : `https://${base}`);
    u.searchParams.set('startapp', `${TELEGRAM_LOBBY_START_PREFIX}${roomCode}`);
    return u.toString();
  } catch {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}startapp=${TELEGRAM_LOBBY_START_PREFIX}${roomCode}`;
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
