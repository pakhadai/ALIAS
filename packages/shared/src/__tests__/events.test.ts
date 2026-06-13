import { describe, it, expect } from 'vitest';
import { ROOM_ERROR_CODES, type RoomErrorCode } from '../events';

describe('ROOM_ERROR_CODES', () => {
  it('should match the canonical stable list (drift guard)', () => {
    expect([...ROOM_ERROR_CODES]).toEqual([
      'INVALID_PAYLOAD',
      'ROOM_CREATE_FAILED',
      'ROOM_NOT_FOUND',
      'ROOM_FULL',
      'SOCKET_CONNECT_ERROR',
      'SERVER_ROOM_ERROR',
      'INVALID_ACTION',
      'NOT_HOST',
      'NOT_EXPLAINER',
      'PLAYER_NOT_IN_ROOM',
      'RELAY_UNAVAILABLE',
      'RELAY_TIMEOUT',
      'ALREADY_IN_ROOM',
      'INVALID_STATE',
      'LOBBY_NOT_READY',
      'GAME_ALREADY_STARTED',
    ]);
  });

  it('should include cross-node relay error codes used by RoomActionRelay', () => {
    expect(ROOM_ERROR_CODES).toContain('RELAY_UNAVAILABLE');
    expect(ROOM_ERROR_CODES).toContain('RELAY_TIMEOUT');
  });

  it('should include lobby and lifecycle guard codes', () => {
    expect(ROOM_ERROR_CODES).toContain('LOBBY_NOT_READY');
    expect(ROOM_ERROR_CODES).toContain('GAME_ALREADY_STARTED');
    expect(ROOM_ERROR_CODES).toContain('PLAYER_NOT_IN_ROOM');
  });

  it('should have unique string codes', () => {
    const unique = new Set(ROOM_ERROR_CODES);
    expect(unique.size).toBe(ROOM_ERROR_CODES.length);
    for (const code of ROOM_ERROR_CODES) {
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    }
  });

  it('should allow RoomErrorCode values in room:error payloads', () => {
    const relayCodes: RoomErrorCode[] = ['RELAY_UNAVAILABLE', 'RELAY_TIMEOUT'];
    for (const code of relayCodes) {
      expect(ROOM_ERROR_CODES).toContain(code);
    }
  });
});
