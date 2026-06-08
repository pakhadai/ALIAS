import { describe, it, expect } from 'vitest';
import { Language } from '@alias/shared';
import { canEmitOnlineGameAction, resolveRoomErrorMessage } from './roomErrorMessage';

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

  it('should fall back to server message for unknown codes', () => {
    expect(resolveRoomErrorMessage('INVALID_ACTION', 'Bad action', Language.EN)).toBe('Bad action');
  });
});
