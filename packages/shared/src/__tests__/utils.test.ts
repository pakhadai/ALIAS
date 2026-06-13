import { describe, it, expect, vi, afterEach } from 'vitest';
import { shuffleArray } from '../utils';
import { AppTheme } from '../enums';
import {
  DEFAULT_APP_THEME,
  getTeamColor,
  getTeamColorToken,
  TEAM_COLORS,
  ROOM_CODE_LENGTH,
  MAX_PLAYERS,
  DEFAULT_ROUND_TIME,
  TIME_UP_IDLE_FALLBACK_MS,
  WINNING_SCORE,
  MOCK_WORDS,
} from '../constants';
import { Language, Category } from '../enums';

describe('shuffleArray', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return a new array with the same elements', () => {
    const input = [1, 2, 3, 4, 5];
    const result = shuffleArray(input);
    expect(result).toHaveLength(input.length);
    expect(result.sort((a, b) => a - b)).toEqual(input.sort((a, b) => a - b));
  });

  it('should not mutate the original array', () => {
    const input = ['a', 'b', 'c'];
    const snapshot = [...input];
    shuffleArray(input);
    expect(input).toEqual(snapshot);
  });

  it('should return empty array for empty input', () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it('should return single-element array unchanged', () => {
    expect(shuffleArray(['solo'])).toEqual(['solo']);
  });

  it('should perform Fisher–Yates swaps when random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shuffleArray(['a', 'b', 'c'])).toEqual(['b', 'c', 'a']);
  });

  it('should swap two elements when random returns 0', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(shuffleArray(['x', 'y'])).toEqual(['y', 'x']);
  });
});

describe('getTeamColor', () => {
  it('should return the color at the given index', () => {
    expect(getTeamColor(0)).toEqual(TEAM_COLORS[0]);
    expect(getTeamColor(1)).toEqual(TEAM_COLORS[1]);
  });

  it('should wrap index with modulo TEAM_COLORS.length', () => {
    const len = TEAM_COLORS.length;
    expect(getTeamColor(len)).toEqual(TEAM_COLORS[0]);
    expect(getTeamColor(len + 2)).toEqual(TEAM_COLORS[2]);
  });

  it('should throw for negative indices (JS modulo does not wrap negatives)', () => {
    expect(() => getTeamColor(-1)).toThrow('TEAM_COLORS must not be empty');
  });

  it('should expose stable hex and optional CSS var names for all team slots', () => {
    for (let i = 0; i < TEAM_COLORS.length; i += 1) {
      const color = getTeamColor(i);
      expect(color.hex).toMatch(/^#[0-9a-f]{6}$/i);
      if (color.varName) {
        expect(color.varName).toMatch(/^--team-color-/);
      }
      expect(getTeamColorToken(i)).toBe(color.varName ?? color.hex);
    }
  });
});

describe('shared constants', () => {
  it('should define room and player limits used by lobby validation', () => {
    expect(ROOM_CODE_LENGTH).toBe(5);
    expect(MAX_PLAYERS).toBe(20);
  });

  it('should define default game scoring and round time', () => {
    expect(DEFAULT_ROUND_TIME).toBe(60);
    expect(TIME_UP_IDLE_FALLBACK_MS).toBe(30_000);
    expect(WINNING_SCORE).toBe(30);
  });

  it('should default app theme to PAPER_LUXE', () => {
    expect(DEFAULT_APP_THEME).toBe(AppTheme.PAPER_LUXE);
  });

  it('should keep TEAM_COLORS non-empty for getTeamColor', () => {
    expect(TEAM_COLORS.length).toBeGreaterThan(0);
  });

  it('should provide fallback MOCK_WORDS for each supported language', () => {
    for (const lang of [Language.UA, Language.DE, Language.EN]) {
      expect(MOCK_WORDS[lang][Category.GENERAL]?.length).toBeGreaterThan(0);
    }
  });
});
