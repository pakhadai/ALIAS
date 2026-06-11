/**
 * Profile screen surface class aliases.
 * @deprecated Prefer `packages/client/src/constants/surfaceClasses.ts` for SSOT.
 */
import { SURFACE_CARD_CLASS } from '../../../constants/surfaceClasses';

export {
  SURFACE_PANEL_CLASS as PROFILE_PANEL_CLASS,
  SURFACE_NAV_ROW_CLASS as PROFILE_NAV_BTN_CLASS,
  SURFACE_NAV_ACCENT_BTN_CLASS as PROFILE_NAV_ACCENT_BTN_CLASS,
} from '../../../constants/surfaceClasses';

export const PROFILE_STAT_CARD_CLASS = `${SURFACE_CARD_CLASS} flex flex-col items-center justify-center px-2 py-3.5 min-h-[72px]`;

export const PROFILE_LIST_CLASS = 'ui-profile-list';

export const PROFILE_PANEL_HEADER_CLASS = 'ui-profile-panel-header px-5 py-3.5 text-center';
