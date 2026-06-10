import { Language } from '../../types';

export const LOBBY_LANG_FLAG: Record<Language, string> = {
  [Language.UA]: '🇺🇦',
  [Language.DE]: '🇩🇪',
  [Language.EN]: '🇬🇧',
};

export const LOBBY_LANGUAGES = [Language.UA, Language.DE, Language.EN] as const;
