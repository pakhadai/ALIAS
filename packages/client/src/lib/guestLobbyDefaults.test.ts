import { describe, it, expect, beforeEach } from 'vitest';
import type { GameSettings } from '../types';
import {
  GUEST_LOBBY_DEFAULTS_KEY,
  clearGuestLobbyDefaults,
  loadGuestLobbyDefaults,
  saveGuestLobbyDefaults,
  toSyncableLobbySettings,
} from './guestLobbyDefaults';

const sampleSettings = {
  general: {
    language: 'UA' as const,
    scoreToWin: 40,
    skipPenalty: true,
    categories: ['General' as const],
    theme: 'PREMIUM_DARK' as const,
    soundEnabled: true,
    soundPreset: 'FUN' as const,
  },
  mode: { gameMode: 'CLASSIC' as const, classicRoundTime: 90 },
} as GameSettings;

describe('guestLobbyDefaults', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should strip device-only general fields when saving', () => {
    saveGuestLobbyDefaults(sampleSettings);
    const raw = localStorage.getItem(GUEST_LOBBY_DEFAULTS_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as Partial<GameSettings>;
    expect(parsed.general?.theme).toBeUndefined();
    expect(parsed.general?.soundEnabled).toBeUndefined();
    expect(parsed.general?.soundPreset).toBeUndefined();
    expect(parsed.general?.scoreToWin).toBe(40);
  });

  it('should load and clear guest lobby defaults', () => {
    saveGuestLobbyDefaults(sampleSettings);
    expect(loadGuestLobbyDefaults()?.general?.scoreToWin).toBe(40);
    clearGuestLobbyDefaults();
    expect(loadGuestLobbyDefaults()).toBeNull();
  });

  it('toSyncableLobbySettings returns general and mode only', () => {
    const synced = toSyncableLobbySettings(sampleSettings);
    expect(synced.general?.scoreToWin).toBe(40);
    expect(synced.mode).toEqual(sampleSettings.mode);
    expect(synced.general?.theme).toBeUndefined();
  });
});
