import { describe, expect, it } from 'vitest';
import {
  computeKeyboardLiftPx,
  computeVisualViewportBottomInset,
  KEYBOARD_LIFT_CSS_VAR,
  KEYBOARD_SHEET_OVERLAP_PX,
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

describe('computeKeyboardLiftPx', () => {
  it('should return 0 when keyboard is closed', () => {
    expect(computeKeyboardLiftPx(0)).toBe(0);
    expect(computeKeyboardLiftPx(-1)).toBe(0);
  });

  it('should add overlap buffer when keyboard is open', () => {
    expect(computeKeyboardLiftPx(280)).toBe(280 + KEYBOARD_SHEET_OVERLAP_PX);
  });
});

describe('keyboardAvoidingBottomPadding', () => {
  it('should set --sheet-keyboard-lift to 0px when keyboard is closed', () => {
    expect(keyboardAvoidingBottomPadding(0)).toEqual({
      [KEYBOARD_LIFT_CSS_VAR]: '0px',
    });
  });

  it('should set --sheet-keyboard-lift with overlap when keyboard is open', () => {
    expect(keyboardAvoidingBottomPadding(280)).toEqual({
      [KEYBOARD_LIFT_CSS_VAR]: `${280 + KEYBOARD_SHEET_OVERLAP_PX}px`,
    });
  });
});
