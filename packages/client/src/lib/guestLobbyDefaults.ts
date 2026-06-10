import type { GameSettings, Language } from '../types';

export const GUEST_LOBBY_DEFAULTS_KEY = 'alias_guest_lobby_defaults_v1';

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

export function loadGuestLobbyDefaults(): Partial<GameSettings> | null {
  if (typeof localStorage === 'undefined') return null;
  let raw: string | null;
  try {
    raw = localStorage.getItem(GUEST_LOBBY_DEFAULTS_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    if (typeof parsed !== 'object' || parsed == null) return null;
    return parsed;
  } catch {
    localStorage.removeItem(GUEST_LOBBY_DEFAULTS_KEY);
    return null;
  }
}

export function saveGuestLobbyDefaults(settings: GameSettings): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(
      GUEST_LOBBY_DEFAULTS_KEY,
      JSON.stringify(toSyncableLobbySettings(settings))
    );
    return true;
  } catch {
    return false;
  }
}

export function clearGuestLobbyDefaults(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(GUEST_LOBBY_DEFAULTS_KEY);
  } catch {
    /* ignore */
  }
}

/** Merge saved partial lobby defaults onto current settings (keeps device-only prefs). */
export function mergeSavedLobbyDefaultsIntoSettings(
  current: GameSettings,
  saved: Partial<GameSettings>,
  uiLanguage: Language
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
            language: uiLanguage,
          },
        }
      : {}),
    ...(saved.mode ? { mode: saved.mode as GameSettings['mode'] } : {}),
  };
}
