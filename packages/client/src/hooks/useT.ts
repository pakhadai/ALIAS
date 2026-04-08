import { useGame } from '../context/GameContext';
import { TRANSLATIONS } from '../constants';

/**
 * Returns the translation object for the current user's personal UI language.
 *
 * Use this everywhere instead of `TRANSLATIONS[settings.general.language]`.
 * `settings.general.language` is the word-deck language (room setting, synced
 * between all players). `uiLanguage` is the personal display language — each
 * player sees the UI in their own preferred language regardless of the room.
 */
export function useT() {
  const { uiLanguage } = useGame();
  return TRANSLATIONS[uiLanguage];
}
