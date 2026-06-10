import { afterEach, describe, it, expect } from 'vitest';
import { applyGlassTheme } from './glassTheme';

describe('applyGlassTheme', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('should set data-theme to dark for dark color scheme', () => {
    applyGlassTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('should set data-theme to light for light color scheme', () => {
    applyGlassTheme('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('should remove data-theme when color scheme is unknown', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    applyGlassTheme(null);
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});
