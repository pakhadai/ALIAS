import { Language } from '@movli/shared';
import { useGameState } from '../context/GameContext';
import { TRANSLATIONS } from '../constants';

/** Canonical UI strings — EN keys as superset, plus dynamic optional keys. */
export type TranslationStrings = {
  [K in keyof (typeof TRANSLATIONS)[Language.EN]]: string;
} & Record<string, string>;

/**
 * Returns the translation object for the current user's personal UI language.
 *
 * Use this everywhere instead of `TRANSLATIONS[settings.general.language]`.
 * `settings.general.language` is the word-deck language (room setting, synced
 * between all players). `uiLanguage` is the personal display language — each
 * player sees the UI in their own preferred language regardless of the room.
 */
export function useT(): TranslationStrings {
  const { uiLanguage } = useGameState();
  return getUiStrings(uiLanguage);
}

export function getUiStrings(lang: Language): TranslationStrings {
  const table = TRANSLATIONS[lang] ?? TRANSLATIONS[Language.UA];
  return { ...TRANSLATIONS[Language.EN], ...table } as TranslationStrings;
}
