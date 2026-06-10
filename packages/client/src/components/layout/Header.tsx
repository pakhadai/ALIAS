/**
 * Liquid Glass header entry — thin alias over {@link GlassAppHeader} / {@link AppHeader}.
 * Prefer `fixed` for viewport-fixed chrome; default sticky stays in-flow inside {@link ScreenShell}.
 */
export {
  AppHeader,
  GlassAppHeader,
  UI_APP_HEADER_CLASS,
  UI_APP_HEADER_CHILD_ROW_CLASS,
  UI_APP_HEADER_SLOT_CLASS,
  UI_APP_HEADER_TITLE_ROW_CLASS,
  UI_GLASS_PANEL_CLASS,
  APP_HEADER_DOCUMENT_FLAG,
} from './GlassAppHeader';
export type { AppHeaderProps, GlassAppHeaderProps } from './GlassAppHeader';
