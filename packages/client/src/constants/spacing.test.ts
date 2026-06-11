import { describe, it, expect } from 'vitest';
import { screenBodyPy, sectionGap, sectionGapLg, sectionGapXl, stackGap } from './spacing';

const SPACING_CONSTANTS = {
  screenBodyPy,
  sectionGap,
  sectionGapLg,
  sectionGapXl,
  stackGap,
} as const;

describe('spacing constants', () => {
  it.each(Object.entries(SPACING_CONSTANTS))(
    'should define non-empty Tailwind fragment for %s',
    (_name, value) => {
      expect(value.trim().length).toBeGreaterThan(0);
    }
  );

  it('should keep screenBodyPy aligned with canonical settings screens', () => {
    expect(screenBodyPy).toBe('py-4');
  });

  it('should keep sectionGap for compact list screens', () => {
    expect(sectionGap).toBe('space-y-5');
  });

  it('should keep stackGap for flex column rhythm', () => {
    expect(stackGap).toBe('gap-4');
  });
});
