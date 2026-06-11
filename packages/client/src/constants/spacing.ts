/**
 * SSOT vertical rhythm fragments for menu/lobby screen bodies (LAYOUT-001 Phase 6).
 * Horizontal inset stays in {@link screenLayout.ts}; these are vertical-only helpers.
 *
 * | Constant        | Tailwind      | When |
 * |-----------------|---------------|------|
 * | `screenBodyPy`  | `py-4`        | Default ScreenShell body top/bottom padding |
 * | `sectionGap`    | `space-y-5`   | Compact stacked sections (decks, word packs) |
 * | `sectionGapLg`  | `space-y-6`   | Form / sheet inner stacks |
 * | `sectionGapXl`  | `space-y-8`   | Settings pages — avatar, fields, cards |
 * | `stackGap`      | `gap-4`       | Flex column stacks (stats, paired blocks) |
 */
export const screenBodyPy = 'py-4';
export const sectionGap = 'space-y-5';
export const sectionGapLg = 'space-y-6';
export const sectionGapXl = 'space-y-8';
export const stackGap = 'gap-4';
