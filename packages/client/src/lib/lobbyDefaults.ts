import type { GameSettings } from '../types';

/** Syncable lobby fields only — excludes device-only general prefs (theme, sound). */
export function toSyncableLobbySettings(settings: GameSettings): Partial<GameSettings> {
  const {
    theme: _theme,
    soundEnabled: _soundEnabled,
    soundPreset: _soundPreset,
    ...syncedGeneral
  } = settings.general ?? {};
  return {
    general: syncedGeneral as GameSettings['general'],
    mode: settings.mode,
  };
}

/** Merge saved partial lobby defaults onto current settings (keeps device-only prefs). */
export function mergeSavedLobbyDefaultsIntoSettings(
  current: GameSettings,
  saved: Partial<GameSettings>
): GameSettings {
  return {
    ...current,
    ...(saved.general
      ? {
          general: {
            ...current.general,
            ...saved.general,
            theme: current.general.theme,
            soundEnabled: current.general.soundEnabled,
            soundPreset: current.general.soundPreset,
          },
        }
      : {}),
    ...(saved.mode ? { mode: saved.mode as GameSettings['mode'] } : {}),
  };
}
