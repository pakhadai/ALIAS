import { describe, it, expect } from 'vitest';
import { areLobbySettingsEqual } from './lobbySettingsCompare';
import { AppTheme, SoundPreset } from '../../types';
import type { GameSettings } from '../../types';

const baseSettings = (): GameSettings =>
  ({
    general: {
      language: 'UA',
      scoreToWin: 30,
      skipPenalty: true,
      categories: ['General'],
      theme: AppTheme.PREMIUM_DARK,
      soundEnabled: true,
      soundPreset: SoundPreset.FUN,
    },
    mode: { gameMode: 'CLASSIC', classicRoundTime: 60 },
  }) as unknown as GameSettings;

describe('areLobbySettingsEqual', () => {
  it('should ignore device-only general prefs', () => {
    const a = baseSettings();
    const b = baseSettings();
    b.general.theme = AppTheme.FOREST;
    b.general.soundEnabled = false;
    expect(areLobbySettingsEqual(a, b)).toBe(true);
  });

  it('should detect synced field changes', () => {
    const a = baseSettings();
    const b = baseSettings();
    b.general.scoreToWin = 50;
    expect(areLobbySettingsEqual(a, b)).toBe(false);
  });
});
