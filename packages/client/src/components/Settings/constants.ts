import { Language } from '../../types';

export const LOBBY_LANG_FLAG: Record<Language, string> = {
  [Language.UA]: '🇺🇦',
  [Language.DE]: '🇩🇪',
  [Language.EN]: '🇬🇧',
};

export const LOBBY_LANGUAGES = [Language.UA, Language.DE, Language.EN] as const;

/** First lobby language different from the deck/source language. */
export function pickDefaultTargetLanguage(source: Language): Language {
  const fallback = LOBBY_LANGUAGES.find((lang) => lang !== source);
  return fallback ?? Language.EN;
}

export function targetLanguagesForSource(source: Language): Language[] {
  return LOBBY_LANGUAGES.filter((lang) => lang !== source);
}
