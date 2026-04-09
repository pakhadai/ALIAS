import { describe, expect, test, beforeEach } from 'vitest';
import {
  initialState,
  restoreSession,
  SESSION_KEY,
  PREFS_KEY,
  SAVABLE_STATES,
  gameReducer,
} from './gameReducer';
import { GameState, Language, AppTheme, SoundPreset } from '../types';

describe('gameReducer', () => {
  test('SET_STATE shallow-merges payload', () => {
    const next = gameReducer(initialState, { type: 'SET_STATE', payload: { roomCode: '12345' } });
    expect(next.roomCode).toBe('12345');
    expect(next.gameState).toBe(GameState.MENU);
  });

  test('SHOW_NOTIF sets notification', () => {
    const next = gameReducer(initialState, {
      type: 'SHOW_NOTIF',
      payload: { message: 'm', type: 'info' },
    });
    expect(next.notification).toEqual({ message: 'm', type: 'info' });
  });
});

describe('restoreSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('always restores preferences (theme/sound/uiLanguage)', () => {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        uiLanguage: Language.DE,
        general: { theme: AppTheme.FOREST, soundEnabled: false, soundPreset: SoundPreset.MINIMAL },
      })
    );

    const restored = restoreSession(initialState);
    expect(restored.uiLanguage).toBe(Language.DE);
    expect(restored.settings.general.theme).toBe(AppTheme.FOREST);
    expect(restored.settings.general.soundEnabled).toBe(false);
    expect(restored.settings.general.soundPreset).toBe(SoundPreset.MINIMAL);
  });

  test('does not restore session when SESSION_KEY is missing', () => {
    const restored = restoreSession(initialState);
    expect(restored.isHost).toBe(false);
    expect(restored.roomCode).toBe('');
  });

  test('maps PLAYING/COUNTDOWN to PRE_ROUND on restore (safe restore)', () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        isHost: true,
        roomCode: '12345',
        myPlayerId: 'p1',
        gameState: GameState.PLAYING,
        settings: { general: { language: Language.UA }, mode: {} },
        players: [],
        teams: [],
      })
    );

    const restored = restoreSession(initialState);
    expect(restored.isHost).toBe(true);
    expect(restored.roomCode).toBe('12345');
    expect(restored.gameState).toBe(GameState.PRE_ROUND);
    expect(SAVABLE_STATES.has(restored.gameState)).toBe(true);
  });
});
