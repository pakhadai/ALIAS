// Barrel: shared re-exports + client constants split for maintainability
export {
  DEFAULT_APP_THEME,
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
export { zIndex } from './zIndex';
export { typographyClass, typographyTokens } from './typography';
export type { TypographyRole } from './typography';
export { FOOTER_ISLAND_LAYOUT, footerIslandClassName } from './footerLayout';
export type { FooterIslandPreset } from './footerLayout';
export {
  SURFACE_PANEL_CLASS,
  SURFACE_CARD_CLASS,
  SURFACE_NAV_ROW_CLASS,
  SURFACE_NAV_ACCENT_BTN_CLASS,
} from './surfaceClasses';
export { screenBodyPy, sectionGap, sectionGapLg, sectionGapXl, stackGap } from './spacing';
