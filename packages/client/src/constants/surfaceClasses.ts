/** Frosted elevated surfaces — SSOT for menu/lobby card shells, nav rows, and panels. */

/** Elevated panel (benefits block, settings section). */
export const SURFACE_PANEL_CLASS = 'ui-glass-panel rounded-3xl';

/** List row / stat card shell — frosted inset card. */
export const SURFACE_CARD_CLASS = 'ui-glass-panel rounded-2xl';

/** Interactive nav row — full-width glass panel with tap feedback. */
export const SURFACE_NAV_ROW_CLASS =
  'ui-glass-panel rounded-2xl w-full flex items-center justify-between px-5 py-4 transition-all duration-200 ease-out active:scale-[0.98] active:bg-ui-surface-hover/50';

/** Accent CTA row — solid fill, lobby-start volume (no frosted glass). */
export const SURFACE_NAV_ACCENT_BTN_CLASS =
  'rounded-2xl w-full flex items-center justify-between px-5 py-4 transition-all duration-200 ease-out active:scale-[0.98] lobby-start-btn lobby-start-btn--plain';
