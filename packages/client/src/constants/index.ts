// Barrel: shared re-exports + client constants split for maintainability
export {
  DEFAULT_ROUND_TIME,
  WINNING_SCORE,
  ROOM_CODE_LENGTH,
  MAX_PLAYERS,
  TEAM_COLORS,
  MOCK_WORDS,
} from '@alias/shared';

export const ACTION_DEBOUNCE_MS = 250;

import { AppTheme } from '../types';
export const UI_THEME_IDS = (Object.values(AppTheme) as AppTheme[]).filter(
  (id) => id !== AppTheme.PREMIUM_LIGHT
);

export type { TranslationValue } from './translations';
export { TRANSLATIONS } from './translations';
export { TEAM_NAMES } from './team-names';
export { THEME_CONFIG } from './themes';
