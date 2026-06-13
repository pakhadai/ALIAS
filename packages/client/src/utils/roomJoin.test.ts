import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  TELEGRAM_LOBBY_START_PREFIX,
  attemptRoomJoin,
  buildRoomJoinUrl,
  buildTelegramLobbyInviteUrl,
  isValidRoomCode,
  parseTelegramLobbyRoomCode,
  roomJoinEnterNamePayload,
} from './roomJoin';
import { GameState } from '../types';

describe('roomJoin', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/play');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isValidRoomCode', () => {
    it('accepts a 5-digit code', () => {
      expect(isValidRoomCode('12345')).toBe(true);
    });

    it('rejects wrong length or non-digits', () => {
      expect(isValidRoomCode('1234')).toBe(false);
      expect(isValidRoomCode('123456')).toBe(false);
      expect(isValidRoomCode('12a45')).toBe(false);
    });
  });

  describe('parseTelegramLobbyRoomCode', () => {
    it('extracts room code from lobby_ prefix', () => {
      expect(parseTelegramLobbyRoomCode(`${TELEGRAM_LOBBY_START_PREFIX}54321`)).toBe('54321');
    });

    it('returns null for invalid or unrelated params', () => {
      expect(parseTelegramLobbyRoomCode(`${TELEGRAM_LOBBY_START_PREFIX}abc`)).toBeNull();
      expect(parseTelegramLobbyRoomCode('deck_ABCD')).toBeNull();
    });
  });

  describe('buildRoomJoinUrl', () => {
    it('builds a clean ?room= URL on current origin', () => {
      expect(buildRoomJoinUrl('99999')).toBe(`${window.location.origin}/play?room=99999`);
    });
  });

  describe('buildTelegramLobbyInviteUrl', () => {
    it('sets startapp on a standard t.me app link', () => {
      expect(buildTelegramLobbyInviteUrl('https://t.me/movli_bot/app', '11111')).toBe(
        'https://t.me/movli_bot/app?startapp=lobby_11111'
      );
    });

    it('falls back for non-URL app links', () => {
      expect(buildTelegramLobbyInviteUrl('t.me/movli_bot/app', '22222')).toBe(
        't.me/movli_bot/app?startapp=lobby_22222'
      );
    });
  });

  describe('attemptRoomJoin', () => {
    it('joins when the room exists', async () => {
      const checkRoomExists = vi.fn().mockResolvedValue(true);
      const onJoin = vi.fn();

      await expect(attemptRoomJoin('12345', { checkRoomExists, onJoin })).resolves.toBe('success');

      expect(checkRoomExists).toHaveBeenCalledWith('12345');
      expect(onJoin).toHaveBeenCalledWith('12345');
    });

    it('returns not_found when the room is missing', async () => {
      const checkRoomExists = vi.fn().mockResolvedValue(false);
      const onJoin = vi.fn();

      await expect(attemptRoomJoin('12345', { checkRoomExists, onJoin })).resolves.toBe(
        'not_found'
      );

      expect(onJoin).not.toHaveBeenCalled();
    });

    it('returns invalid_code without calling the server', async () => {
      const checkRoomExists = vi.fn();
      const onJoin = vi.fn();

      await expect(attemptRoomJoin('bad', { checkRoomExists, onJoin })).resolves.toBe(
        'invalid_code'
      );

      expect(checkRoomExists).not.toHaveBeenCalled();
      expect(onJoin).not.toHaveBeenCalled();
    });

    it('returns error when existence check throws', async () => {
      const checkRoomExists = vi.fn().mockRejectedValue(new Error('network'));
      const onJoin = vi.fn();

      await expect(attemptRoomJoin('12345', { checkRoomExists, onJoin })).resolves.toBe('error');

      expect(onJoin).not.toHaveBeenCalled();
    });
  });

  it('roomJoinEnterNamePayload targets ENTER_NAME', () => {
    expect(roomJoinEnterNamePayload('12345')).toEqual({
      roomCode: '12345',
      gameState: GameState.ENTER_NAME,
    });
  });
});
