import type { GameSettings } from '../../types';

/** Comparable lobby fields — excludes device-only prefs (theme, sound). */
export function toComparableLobbySettings(settings: GameSettings): string {
  const general = settings.general ?? ({} as GameSettings['general']);
  const {
    theme: _theme,
    soundEnabled: _soundEnabled,
    soundPreset: _soundPreset,
    ...syncedGeneral
  } = general;
  return JSON.stringify({
    general: syncedGeneral,
    mode: settings.mode,
  });
}

export function areLobbySettingsEqual(a: GameSettings, b: GameSettings): boolean {
  return toComparableLobbySettings(a) === toComparableLobbySettings(b);
}
