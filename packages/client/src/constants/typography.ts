/**
 * Semantic typography tokens (TYPO-001).
 * Size/leading/tracking values live in `styles.css` (`--ui-text-*`, `@theme`).
 * Canon: docs/UI_TOKENS.md#typography-tokens
 */
export const typographyTokens = {
  heading: '1.5rem',
  body: '0.875rem',
  bodyInput: '1rem',
  label: '0.625rem',
  caption: '0.625rem',
  system: '0.75rem',
  headingLeading: '1.25',
  bodyLeading: '1.5',
  labelTracking: '0.2em',
  captionTrackingWide: '0.6em',
} as const;

/** Precomposed Tailwind class strings for each semantic role. */
export const typographyClass = {
  heading: 'text-ui-heading font-serif leading-ui-heading tracking-wide',
  body: 'text-ui-body font-sans leading-ui-body',
  bodyInput: 'text-ui-body-input font-sans',
  label: 'text-ui-label font-sans font-bold uppercase tracking-ui-label',
  caption: 'text-ui-caption font-sans',
  system: 'text-ui-system font-sans font-medium',
} as const;

/** Brand tagline, app version — 10px sans, wide tracked uppercase. */
export const brandCaptionClass = `${typographyClass.caption} uppercase tracking-ui-caption-wide`;

/** Muted micro copy (theme descriptions, secondary hints). */
export const captionMutedClass = `${typographyClass.caption} opacity-50 leading-snug`;

/** Muted uppercase section label (settings, rules modals). */
export const labelSectionClass = `${typographyClass.label} tracking-widest opacity-40`;

/** Section title with wider tracking (RulesModal, profile sections). */
export const labelSectionTitleClass = `${typographyClass.label} tracking-[0.28em] opacity-40`;

/** Form field label block. */
export const formLabelClass = `${typographyClass.label} text-ui-fg-muted tracking-wider block`;

/** Fixed top/bottom banner status (connection, PWA). */
export const systemBannerClass = `${typographyClass.system} font-bold uppercase tracking-wider`;

/** Inline status line in banners and alerts (non-uppercase). */
export const systemStatusClass = `${typographyClass.system} leading-snug`;

export type TypographyRole = keyof typeof typographyClass;
