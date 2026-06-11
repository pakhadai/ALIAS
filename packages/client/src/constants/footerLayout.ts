/**
 * SSOT width presets for {@link FixedBottomBar} `island` mode `contentClassName`.
 * Default non-island footer stays `max-w-sm` on {@link FixedBottomBar} — do not change here.
 *
 * | Preset     | When |
 * |------------|------|
 * | `narrow`   | Single primary CTA (lobby start, profile logout) |
 * | `canonical`| Save bar, store trust strip, settings host footer |
 * | `fullBleed`| Full-width CTA row aligned with body `fullPx6` (`MyDecksScreen`, `ScoreboardScreen`, `TeamSetupScreen`) |
 */
export type FooterIslandPreset = 'narrow' | 'canonical' | 'fullBleed';

export const FOOTER_ISLAND_LAYOUT: Record<FooterIslandPreset, string> = {
  narrow: 'max-w-sm mx-auto w-full',
  canonical: 'max-w-2xl mx-auto w-full',
  fullBleed: 'w-full px-6',
};

export function footerIslandClassName(preset: FooterIslandPreset): string {
  return FOOTER_ISLAND_LAYOUT[preset];
}
