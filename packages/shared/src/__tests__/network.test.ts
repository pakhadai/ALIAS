import { describe, it, expect } from 'vitest';
import type { NetworkActionType, NetworkMessage } from '../network';

const LEGACY_NETWORK_ACTION_TYPES: NetworkActionType[] = [
  'JOIN_REQUEST',
  'SYNC_STATE',
  'GAME_ACTION',
  'KICK_PLAYER',
  'KICKED',
];

describe('NetworkMessage (legacy envelope)', () => {
  it('should accept all legacy NetworkActionType values with arbitrary payload', () => {
    for (const type of LEGACY_NETWORK_ACTION_TYPES) {
      const message: NetworkMessage = { type, payload: { sample: true } };
      expect(message.type).toBe(type);
      expect(message.payload).toEqual({ sample: true });
    }
  });

  it('should preserve typed GAME_ACTION payload shape', () => {
    const message: NetworkMessage = {
      type: 'GAME_ACTION',
      payload: { action: 'CORRECT', data: {} },
    };
    expect(message.type).toBe('GAME_ACTION');
    expect(message.payload).toEqual({ action: 'CORRECT', data: {} });
  });

  it('should allow null and primitive payloads', () => {
    const messages: NetworkMessage[] = [
      { type: 'SYNC_STATE', payload: null },
      { type: 'KICKED', payload: 'player-1' },
      { type: 'JOIN_REQUEST', payload: 42 },
    ];
    expect(messages).toHaveLength(3);
  });

  it('should keep the legacy action type union stable', () => {
    expect(LEGACY_NETWORK_ACTION_TYPES).toEqual([
      'JOIN_REQUEST',
      'SYNC_STATE',
      'GAME_ACTION',
      'KICK_PLAYER',
      'KICKED',
    ]);
  });
});
