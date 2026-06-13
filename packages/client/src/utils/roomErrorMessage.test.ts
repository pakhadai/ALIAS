import { describe, it, expect } from 'vitest';
import { Language } from '@movli/shared';
import {
  canEmitOnlineGameAction,
  isSessionEndedRoomError,
  resolveRoomErrorMessage,
  shouldEjectToMenuOnSessionEnd,
} from './roomErrorMessage';

describe('canEmitOnlineGameAction', () => {
  const readySocket = {
    isConnected: true,
    isReconnecting: false,
    roomCode: '12345',
  };

  it('should return false when app room code is empty', () => {
    expect(canEmitOnlineGameAction('', readySocket)).toBe(false);
  });

  it('should return false when socket is disconnected', () => {
    expect(canEmitOnlineGameAction('12345', { ...readySocket, isConnected: false })).toBe(false);
  });

  it('should return false while reconnecting', () => {
    expect(canEmitOnlineGameAction('12345', { ...readySocket, isReconnecting: true })).toBe(false);
  });

  it('should return true when connected and room code is set', () => {
    expect(canEmitOnlineGameAction('12345', readySocket)).toBe(true);
  });
});

describe('resolveRoomErrorMessage', () => {
  it('should map PLAYER_NOT_IN_ROOM to localized string', () => {
    const msg = resolveRoomErrorMessage('PLAYER_NOT_IN_ROOM', 'Join a room first', Language.UA);
    expect(msg).not.toBe('Join a room first');
    expect(msg).toContain('кімнат');
  });

  it('should map ROOM_NOT_FOUND to sessionEnded copy', () => {
    const msg = resolveRoomErrorMessage('ROOM_NOT_FOUND', 'Room not found', Language.UA);
    expect(msg).toContain('Сесію');
  });

  it('should fall back to server message for unknown codes', () => {
    expect(resolveRoomErrorMessage('INVALID_ACTION', 'Bad action', Language.EN)).toBe('Bad action');
  });
});

describe('session end helpers', () => {
  it('should treat ROOM_NOT_FOUND and PLAYER_NOT_IN_ROOM as session ended', () => {
    expect(isSessionEndedRoomError('ROOM_NOT_FOUND')).toBe(true);
    expect(isSessionEndedRoomError('PLAYER_NOT_IN_ROOM')).toBe(true);
    expect(isSessionEndedRoomError('ROOM_FULL')).toBe(false);
  });

  it('should eject only for online mode with a room code', () => {
    expect(shouldEjectToMenuOnSessionEnd('ONLINE', '12345')).toBe(true);
    expect(shouldEjectToMenuOnSessionEnd('ONLINE', '')).toBe(false);
    expect(shouldEjectToMenuOnSessionEnd('OFFLINE', '12345')).toBe(false);
  });
});
