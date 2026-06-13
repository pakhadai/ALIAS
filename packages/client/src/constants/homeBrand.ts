import { Language } from '@movli/shared';

import { TRANSLATIONS } from './translations';

/** Public URL for the MOVLI wordmark (synced from logo/logo-swg.svg). */
export const HOME_LOGO_SRC = '/logo.svg';

/** Fallback tagline when UI language context is unavailable (boot loading). */
export const DEFAULT_HOME_TAGLINE = TRANSLATIONS[Language.EN].homeTagline;

/** Multilingual ambient words — home screen background only. */
export const HOME_WORD_RAIN_WORDS = [
  'слово',
  'мова',
  'Wort',
  'word',
  'казати',
  'raten',
  'скажи',
  'guess',
  'вгадай',
  'говори',
  'say',
  'sprechen',
  'taboo',
  'movli',
] as const;

export type HomeWordRainItem = {
  text: string;
  leftPercent: number;
  durationSec: number;
  delaySec: number;
};

export function buildHomeWordRainItems(): HomeWordRainItem[] {
  return HOME_WORD_RAIN_WORDS.map((text, index) => ({
    text,
    leftPercent: 3 + index * 6.5,
    durationSec: 15 + (index % 7) * 2,
    delaySec: -index * 1.9 - 1,
  }));
}
