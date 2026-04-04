import { describe, it, expect } from 'vitest';
import { roomCreateSchema, roomJoinSchema, validatePayload, validateGameAction } from '../schemas';
import { Language, Category, SoundPreset, AppTheme } from '@alias/shared';

// ─── roomCreateSchema ────────────────────────────────────────────────────────

describe('roomCreateSchema', () => {
  it('accepts valid data', () => {
    const result = validatePayload(roomCreateSchema, {
      playerName: 'Alice',
      avatar: '🦊',
    });
    expect(result).not.toBeNull();
    expect(result!.playerName).toBe('Alice');
    expect(result!.avatar).toBe('🦊');
  });

  it('accepts optional avatarId', () => {
    const result = validatePayload(roomCreateSchema, {
      playerName: 'Alice',
      avatar: '🦊',
      avatarId: '3',
    });
    expect(result!.avatarId).toBe('3');
  });

  it('accepts null avatarId', () => {
    const result = validatePayload(roomCreateSchema, {
      playerName: 'Alice',
      avatar: '🦊',
      avatarId: null,
    });
    expect(result!.avatarId).toBeNull();
  });

  it('rejects empty playerName', () => {
    const result = validatePayload(roomCreateSchema, { playerName: '', avatar: '🦊' });
    expect(result).toBeNull();
  });

  it('rejects playerName longer than 20 chars', () => {
    const result = validatePayload(roomCreateSchema, {
      playerName: 'A'.repeat(21),
      avatar: '🦊',
    });
    expect(result).toBeNull();
  });

  it('strips HTML from playerName', () => {
    const result = validatePayload(roomCreateSchema, {
      playerName: '<b>Alice</b>',
      avatar: '🦊',
    });
    expect(result!.playerName).toBe('Alice');
  });

  it('rejects empty avatar', () => {
    const result = validatePayload(roomCreateSchema, { playerName: 'Alice', avatar: '' });
    expect(result).toBeNull();
  });

  it('rejects missing required fields', () => {
    expect(validatePayload(roomCreateSchema, {})).toBeNull();
    expect(validatePayload(roomCreateSchema, null)).toBeNull();
    expect(validatePayload(roomCreateSchema, 'string')).toBeNull();
  });
});

// ─── roomJoinSchema ──────────────────────────────────────────────────────────

describe('roomJoinSchema', () => {
  it('accepts valid 5-digit room code', () => {
    const result = validatePayload(roomJoinSchema, {
      roomCode: '12345',
      playerName: 'Bob',
      avatar: '🐺',
    });
    expect(result).not.toBeNull();
    expect(result!.roomCode).toBe('12345');
  });

  it('rejects 4-digit code', () => {
    expect(
      validatePayload(roomJoinSchema, { roomCode: '1234', playerName: 'Bob', avatar: '🐺' })
    ).toBeNull();
  });

  it('rejects 6-digit code', () => {
    expect(
      validatePayload(roomJoinSchema, { roomCode: '123456', playerName: 'Bob', avatar: '🐺' })
    ).toBeNull();
  });

  it('rejects alphabetic room code', () => {
    expect(
      validatePayload(roomJoinSchema, { roomCode: 'ABCDE', playerName: 'Bob', avatar: '🐺' })
    ).toBeNull();
  });

  it('rejects room code with spaces', () => {
    expect(
      validatePayload(roomJoinSchema, { roomCode: '12 45', playerName: 'Bob', avatar: '🐺' })
    ).toBeNull();
  });

  it('strips HTML from playerName', () => {
    const result = validatePayload(roomJoinSchema, {
      roomCode: '12345',
      playerName: '<script>Bob</script>',
      avatar: '🐺',
    });
    expect(result!.playerName).toBe('Bob');
  });
});

// ─── validateGameAction ──────────────────────────────────────────────────────

describe('validateGameAction', () => {
  it('accepts CORRECT action (no data)', () => {
    const result = validateGameAction({ action: 'CORRECT' });
    expect(result).toEqual({ action: 'CORRECT' });
  });

  it('accepts SKIP action', () => {
    expect(validateGameAction({ action: 'SKIP' })).toEqual({ action: 'SKIP' });
  });

  it('accepts all valid no-data actions', () => {
    const noDataActions = [
      'CORRECT',
      'SKIP',
      'START_GAME',
      'START_DUEL',
      'START_ROUND',
      'START_PLAYING',
      'NEXT_ROUND',
      'RESET_GAME',
      'REMATCH',
      'GENERATE_TEAMS',
      'PAUSE_GAME',
      'TIME_UP',
      'CONFIRM_ROUND',
    ];
    noDataActions.forEach((action) => {
      const result = validateGameAction({ action });
      expect(result).not.toBeNull();
      expect(result!.action).toBe(action);
    });
  });

  it('rejects unknown action', () => {
    expect(validateGameAction({ action: 'UNKNOWN_ACTION' })).toBeNull();
  });

  it('rejects non-object input', () => {
    expect(validateGameAction(null)).toBeNull();
    expect(validateGameAction('CORRECT')).toBeNull();
    expect(validateGameAction(42)).toBeNull();
    expect(validateGameAction(undefined)).toBeNull();
  });

  it('rejects missing action field', () => {
    expect(validateGameAction({ data: {} })).toBeNull();
  });

  // UPDATE_SETTINGS
  describe('UPDATE_SETTINGS', () => {
    it('accepts valid partial settings', () => {
      const result = validateGameAction({
        action: 'UPDATE_SETTINGS',
        data: { roundTime: 90, language: Language.EN },
      });
      expect(result).not.toBeNull();
      expect(result!.action).toBe('UPDATE_SETTINGS');
      if (result!.action === 'UPDATE_SETTINGS') {
        expect(result.data.roundTime).toBe(90);
        expect(result.data.language).toBe(Language.EN);
      }
    });

    it('accepts empty settings object (all optional)', () => {
      const result = validateGameAction({ action: 'UPDATE_SETTINGS', data: {} });
      expect(result).not.toBeNull();
    });

    it('rejects roundTime below minimum', () => {
      expect(validateGameAction({ action: 'UPDATE_SETTINGS', data: { roundTime: 5 } })).toBeNull();
    });

    it('rejects roundTime above maximum', () => {
      expect(
        validateGameAction({ action: 'UPDATE_SETTINGS', data: { roundTime: 301 } })
      ).toBeNull();
    });

    it('rejects scoreToWin below minimum', () => {
      expect(validateGameAction({ action: 'UPDATE_SETTINGS', data: { scoreToWin: 4 } })).toBeNull();
    });

    it('rejects scoreToWin above maximum', () => {
      expect(
        validateGameAction({ action: 'UPDATE_SETTINGS', data: { scoreToWin: 101 } })
      ).toBeNull();
    });

    it('rejects invalid language enum', () => {
      expect(
        validateGameAction({ action: 'UPDATE_SETTINGS', data: { language: 'FR' } })
      ).toBeNull();
    });

    it('rejects invalid theme enum', () => {
      expect(validateGameAction({ action: 'UPDATE_SETTINGS', data: { theme: 'NEON' } })).toBeNull();
    });

    it('rejects invalid category enum', () => {
      expect(
        validateGameAction({ action: 'UPDATE_SETTINGS', data: { categories: ['INVALID'] } })
      ).toBeNull();
    });

    it('rejects empty categories array', () => {
      expect(
        validateGameAction({ action: 'UPDATE_SETTINGS', data: { categories: [] } })
      ).toBeNull();
    });

    it('accepts valid categories array', () => {
      const result = validateGameAction({
        action: 'UPDATE_SETTINGS',
        data: { categories: [Category.GENERAL, Category.FOOD] },
      });
      expect(result?.action).toBe('UPDATE_SETTINGS');
      if (result?.action === 'UPDATE_SETTINGS') {
        expect(result.data.categories).toEqual([Category.GENERAL, Category.FOOD]);
      }
    });

    it('accepts customDeckCode', () => {
      const result = validateGameAction({
        action: 'UPDATE_SETTINGS',
        data: { customDeckCode: 'CORP123' },
      });
      expect(result?.action).toBe('UPDATE_SETTINGS');
      if (result?.action === 'UPDATE_SETTINGS') {
        expect(result.data.customDeckCode).toBe('CORP123');
      }
    });

    it('accepts selectedPackIds as UUID array', () => {
      const result = validateGameAction({
        action: 'UPDATE_SETTINGS',
        data: { selectedPackIds: ['550e8400-e29b-41d4-a716-446655440000'] },
      });
      expect(result?.action).toBe('UPDATE_SETTINGS');
      if (result?.action === 'UPDATE_SETTINGS') {
        expect(result.data.selectedPackIds).toHaveLength(1);
      }
    });

    it('rejects selectedPackIds with non-UUID strings', () => {
      expect(
        validateGameAction({
          action: 'UPDATE_SETTINGS',
          data: { selectedPackIds: ['not-a-uuid'] },
        })
      ).toBeNull();
    });

    it('rejects customWords exceeding 5000 chars', () => {
      expect(
        validateGameAction({
          action: 'UPDATE_SETTINGS',
          data: { customWords: 'x'.repeat(5001) },
        })
      ).toBeNull();
    });

    it('accepts customWords up to 5000 chars', () => {
      const result = validateGameAction({
        action: 'UPDATE_SETTINGS',
        data: { customWords: 'x'.repeat(5000) },
      });
      expect(result).not.toBeNull();
    });

    it('accepts teamCount in valid range', () => {
      expect(
        validateGameAction({ action: 'UPDATE_SETTINGS', data: { teamCount: 2 } })
      ).not.toBeNull();
      expect(
        validateGameAction({ action: 'UPDATE_SETTINGS', data: { teamCount: 8 } })
      ).not.toBeNull();
    });

    it('rejects teamCount below minimum', () => {
      expect(validateGameAction({ action: 'UPDATE_SETTINGS', data: { teamCount: 1 } })).toBeNull();
    });

    it('rejects teamCount above maximum', () => {
      expect(validateGameAction({ action: 'UPDATE_SETTINGS', data: { teamCount: 9 } })).toBeNull();
    });

    it('rejects non-integer roundTime', () => {
      expect(
        validateGameAction({ action: 'UPDATE_SETTINGS', data: { roundTime: 60.5 } })
      ).toBeNull();
    });
  });

  // KICK_PLAYER
  describe('KICK_PLAYER', () => {
    it('accepts valid player id string', () => {
      const result = validateGameAction({ action: 'KICK_PLAYER', data: 'player-uuid-123' });
      expect(result?.action).toBe('KICK_PLAYER');
      if (result?.action === 'KICK_PLAYER') {
        expect(result.data).toBe('player-uuid-123');
      }
    });

    it('rejects empty string', () => {
      expect(validateGameAction({ action: 'KICK_PLAYER', data: '' })).toBeNull();
    });

    it('rejects non-string data', () => {
      expect(validateGameAction({ action: 'KICK_PLAYER', data: 123 })).toBeNull();
      expect(validateGameAction({ action: 'KICK_PLAYER', data: null })).toBeNull();
    });

    it('rejects string longer than 100 chars', () => {
      expect(validateGameAction({ action: 'KICK_PLAYER', data: 'x'.repeat(101) })).toBeNull();
    });
  });
});

// ─── validatePayload ─────────────────────────────────────────────────────────

describe('validatePayload', () => {
  it('returns parsed value on success', () => {
    const result = validatePayload(roomCreateSchema, { playerName: 'Alice', avatar: '🦊' });
    expect(result).not.toBeNull();
    expect(result!.playerName).toBe('Alice');
  });

  it('returns null on validation failure', () => {
    expect(validatePayload(roomCreateSchema, { playerName: '' })).toBeNull();
  });

  it('returns null for null input', () => {
    expect(validatePayload(roomCreateSchema, null)).toBeNull();
  });
});
