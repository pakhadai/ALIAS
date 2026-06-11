import { describe, it, expect } from 'vitest';
import {
  SURFACE_PANEL_CLASS,
  SURFACE_CARD_CLASS,
  SURFACE_NAV_ROW_CLASS,
  SURFACE_NAV_ACCENT_BTN_CLASS,
} from './surfaceClasses';

describe('surfaceClasses', () => {
  it('should keep panel class as elevated glass shell', () => {
    expect(SURFACE_PANEL_CLASS).toBe('ui-glass-panel rounded-3xl');
    expect(SURFACE_PANEL_CLASS).toContain('ui-glass-panel');
    expect(SURFACE_PANEL_CLASS).toContain('rounded-3xl');
  });

  it('should keep card class as compact glass shell', () => {
    expect(SURFACE_CARD_CLASS).toBe('ui-glass-panel rounded-2xl');
    expect(SURFACE_CARD_CLASS).toContain('ui-glass-panel');
    expect(SURFACE_CARD_CLASS).toContain('rounded-2xl');
  });

  it('should keep nav row class as interactive glass row', () => {
    expect(SURFACE_NAV_ROW_CLASS).toContain('ui-glass-panel');
    expect(SURFACE_NAV_ROW_CLASS).toContain('rounded-2xl');
    expect(SURFACE_NAV_ROW_CLASS).toContain('active:scale-[0.98]');
  });

  it('should keep nav accent btn as solid lobby-start row', () => {
    expect(SURFACE_NAV_ACCENT_BTN_CLASS).toContain('rounded-2xl');
    expect(SURFACE_NAV_ACCENT_BTN_CLASS).toContain('lobby-start-btn--plain');
    expect(SURFACE_NAV_ACCENT_BTN_CLASS).not.toContain('ui-glass-panel');
  });
});
