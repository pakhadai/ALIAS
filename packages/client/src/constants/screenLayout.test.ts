import { describe, it, expect } from 'vitest';
import { SCREEN_LAYOUT, type ScreenLayoutPreset } from './screenLayout';

const PRESETS = Object.keys(SCREEN_LAYOUT) as ScreenLayoutPreset[];

describe('SCREEN_LAYOUT', () => {
  it.each(PRESETS)('should define non-empty bodyClassName for preset %s', (preset) => {
    expect(SCREEN_LAYOUT[preset].bodyClassName.trim().length).toBeGreaterThan(0);
  });

  it('should keep canonical body padding in sync with header inset tokens', () => {
    const { bodyClassName, contentInsetX, contentInsetXMd, contentRail } = SCREEN_LAYOUT.canonical;
    expect(bodyClassName).toContain('max-w-2xl');
    expect(bodyClassName).toContain('px-6');
    expect(bodyClassName).toContain('md:px-8');
    expect(contentInsetX).toBe('1.5rem');
    expect(contentInsetXMd).toBe('2rem');
    expect(contentRail).toBe('canonical');
  });

  it('should map lobby full-bleed layout to px-4 inset', () => {
    expect(SCREEN_LAYOUT.fullPx4.contentInsetX).toBe('1rem');
    expect(SCREEN_LAYOUT.fullPx4.bodyClassName).toContain('px-4');
  });
});
