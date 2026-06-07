import { describe, expect, it } from 'vitest';
import {
  computeVisualViewportBottomInset,
  keyboardAvoidingBottomPadding,
} from './useVisualViewportBottomInset';

describe('computeVisualViewportBottomInset', () => {
  it('should return 0 when visual viewport fills the layout height', () => {
    expect(computeVisualViewportBottomInset({ height: 800, offsetTop: 0 }, 800)).toBe(0);
  });

  it('should return keyboard height when visual viewport shrinks from below', () => {
    expect(computeVisualViewportBottomInset({ height: 500, offsetTop: 0 }, 800)).toBe(300);
  });

  it('should account for visual viewport offsetTop (iOS pan)', () => {
    expect(computeVisualViewportBottomInset({ height: 500, offsetTop: 40 }, 800)).toBe(260);
  });

  it('should never return negative values', () => {
    expect(computeVisualViewportBottomInset({ height: 900, offsetTop: 0 }, 800)).toBe(0);
  });
});

describe('keyboardAvoidingBottomPadding', () => {
  it('should return undefined when keyboard is closed', () => {
    expect(keyboardAvoidingBottomPadding(0)).toBeUndefined();
    expect(keyboardAvoidingBottomPadding(-1)).toBeUndefined();
  });

  it('should lift the sheet by keyboard height when keyboard is open', () => {
    expect(keyboardAvoidingBottomPadding(280)).toEqual({
      paddingBottom: '280px',
    });
  });
});
