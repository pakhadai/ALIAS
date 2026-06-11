import { describe, it, expect } from 'vitest';
import {
  FOOTER_ISLAND_LAYOUT,
  footerIslandClassName,
  type FooterIslandPreset,
} from './footerLayout';

const PRESETS = Object.keys(FOOTER_ISLAND_LAYOUT) as FooterIslandPreset[];

describe('FOOTER_ISLAND_LAYOUT', () => {
  it.each(PRESETS)('should define non-empty class string for preset %s', (preset) => {
    expect(FOOTER_ISLAND_LAYOUT[preset].trim().length).toBeGreaterThan(0);
  });

  it('should keep narrow preset aligned with FixedBottomBar default island width', () => {
    expect(FOOTER_ISLAND_LAYOUT.narrow).toBe('max-w-sm mx-auto w-full');
  });

  it('should keep canonical preset aligned with screenLayout canonical rail', () => {
    expect(FOOTER_ISLAND_LAYOUT.canonical).toContain('max-w-2xl');
    expect(FOOTER_ISLAND_LAYOUT.canonical).toContain('mx-auto');
  });

  it('should match body fullPx6 horizontal inset on fullBleed', () => {
    expect(FOOTER_ISLAND_LAYOUT.fullBleed).toBe('w-full px-6');
  });
});

describe('footerIslandClassName', () => {
  it.each(PRESETS)('should return FOOTER_ISLAND_LAYOUT entry for %s', (preset) => {
    expect(footerIslandClassName(preset)).toBe(FOOTER_ISLAND_LAYOUT[preset]);
  });
});
