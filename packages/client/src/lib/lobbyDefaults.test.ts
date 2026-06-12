import { describe, it, expect } from 'vitest';
import type { GameSettings } from '../types';
import { GameMode, Language } from '../types';
import { mergeSavedLobbyDefaultsIntoSettings, toSyncableLobbySettings } from './lobbyDefaults';

const sampleSettings = {
  general: {
    language: Language.DE,
    scoreToWin: 40,
    skipPenalty: true,
    categories: ['General' as const],
    theme: 'PREMIUM_DARK' as const,
    soundEnabled: true,
    soundPreset: 'FUN' as const,
  },
  mode: { gameMode: 'CLASSIC' as const, classicRoundTime: 90 },
} as GameSettings;

const currentSettings = {
  general: {
    language: Language.UA,
    scoreToWin: 30,
    skipPenalty: true,
    categories: ['General' as const],
    theme: 'PREMIUM_DARK' as const,
    soundEnabled: true,
    soundPreset: 'FUN' as const,
  },
  mode: { gameMode: 'CLASSIC' as const, classicRoundTime: 60 },
} as GameSettings;

describe('lobbyDefaults', () => {
  it('should strip device-only general fields when syncing', () => {
    const synced = toSyncableLobbySettings(sampleSettings);
    expect(synced.general?.theme).toBeUndefined();
    expect(synced.general?.soundEnabled).toBeUndefined();
    expect(synced.general?.soundPreset).toBeUndefined();
    expect(synced.general?.scoreToWin).toBe(40);
    expect(synced.mode).toEqual(sampleSettings.mode);
  });

  it('should preserve saved word language when merging lobby defaults', () => {
    const merged = mergeSavedLobbyDefaultsIntoSettings(currentSettings, {
      general: { language: Language.DE, scoreToWin: 40 },
    } as Partial<GameSettings>);
    expect(merged.general.language).toBe(Language.DE);
    expect(merged.general.scoreToWin).toBe(40);
    expect(merged.general.theme).toBe(currentSettings.general.theme);
    expect(merged.general.soundEnabled).toBe(currentSettings.general.soundEnabled);
  });

  it('should merge mode settings from saved defaults', () => {
    const merged = mergeSavedLobbyDefaultsIntoSettings(currentSettings, {
      mode: { gameMode: GameMode.CLASSIC, classicRoundTime: 120 },
    } as Partial<GameSettings>);
    expect(merged.mode).toEqual({ gameMode: 'CLASSIC', classicRoundTime: 120 });
  });
});
