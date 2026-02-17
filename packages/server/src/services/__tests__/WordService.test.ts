import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WordService } from '../WordService';
import {
  Language, Category, SoundPreset, AppTheme, MOCK_WORDS,
} from '@alias/shared';
import type { GameSettings } from '@alias/shared';

const baseSettings: GameSettings = {
  language: Language.UA,
  roundTime: 60,
  scoreToWin: 30,
  skipPenalty: true,
  categories: [Category.GENERAL],
  soundEnabled: true,
  soundPreset: SoundPreset.FUN,
  teamCount: 2,
  theme: AppTheme.PREMIUM_DARK,
};

// ─── buildDeck — MOCK_WORDS fallback (no prisma) ────────────────────────────

describe('buildDeck (no Prisma)', () => {
  let service: WordService;
  beforeEach(() => { service = new WordService(); });

  it('returns words from MOCK_WORDS for UA GENERAL', async () => {
    const deck = await service.buildDeck(baseSettings);
    const expected = MOCK_WORDS[Language.UA][Category.GENERAL]!;
    expect(deck).toHaveLength(expected.length);
    expect(new Set(deck)).toEqual(new Set(expected));
  });

  it('returns words for EN FOOD', async () => {
    const settings: GameSettings = { ...baseSettings, language: Language.EN, categories: [Category.FOOD] };
    const deck = await service.buildDeck(settings);
    const expected = MOCK_WORDS[Language.EN][Category.FOOD]!;
    expect(new Set(deck)).toEqual(new Set(expected));
  });

  it('combines multiple categories', async () => {
    const settings: GameSettings = { ...baseSettings, categories: [Category.GENERAL, Category.FOOD] };
    const deck = await service.buildDeck(settings);
    const genWords = MOCK_WORDS[Language.UA][Category.GENERAL]!;
    const foodWords = MOCK_WORDS[Language.UA][Category.FOOD]!;
    expect(deck).toHaveLength(genWords.length + foodWords.length);
  });

  it('shuffles the deck (not in original order)', async () => {
    // Run multiple times — probability of being sorted is negligible
    let atLeastOnceShuffled = false;
    const expected = MOCK_WORDS[Language.UA][Category.GENERAL]!;
    for (let i = 0; i < 10; i++) {
      const deck = await service.buildDeck(baseSettings);
      if (JSON.stringify(deck) !== JSON.stringify(expected)) {
        atLeastOnceShuffled = true;
        break;
      }
    }
    expect(atLeastOnceShuffled).toBe(true);
  });

  it('does not modify the original MOCK_WORDS array', async () => {
    const original = [...MOCK_WORDS[Language.UA][Category.GENERAL]!];
    await service.buildDeck(baseSettings);
    expect(MOCK_WORDS[Language.UA][Category.GENERAL]).toEqual(original);
  });

  it('handles CUSTOM category with customWords', async () => {
    const settings: GameSettings = {
      ...baseSettings,
      categories: [Category.CUSTOM],
      customWords: 'Apple, Banana, Cherry',
    };
    const deck = await service.buildDeck(settings);
    expect(deck).toHaveLength(3);
    expect(deck).toContain('Apple');
    expect(deck).toContain('Banana');
    expect(deck).toContain('Cherry');
  });

  it('strips HTML from custom words', async () => {
    const settings: GameSettings = {
      ...baseSettings,
      categories: [Category.CUSTOM],
      customWords: '<b>Apple</b>, Banana',
    };
    const deck = await service.buildDeck(settings);
    expect(deck).toContain('Apple');
    expect(deck).not.toContain('<b>Apple</b>');
  });

  it('filters empty custom word entries', async () => {
    const settings: GameSettings = {
      ...baseSettings,
      categories: [Category.CUSTOM],
      customWords: 'Apple,,  , Banana',
    };
    const deck = await service.buildDeck(settings);
    expect(deck).toHaveLength(2);
  });

  it('mixes CUSTOM and normal categories', async () => {
    const settings: GameSettings = {
      ...baseSettings,
      categories: [Category.GENERAL, Category.CUSTOM],
      customWords: 'MyWord',
    };
    const deck = await service.buildDeck(settings);
    expect(deck).toContain('MyWord');
    const genWords = MOCK_WORDS[Language.UA][Category.GENERAL]!;
    genWords.forEach(w => expect(deck).toContain(w));
  });

  it('falls back to GENERAL when no words found', async () => {
    // category with no data in MOCK_WORDS for any language
    const settings: GameSettings = {
      ...baseSettings,
      categories: [Category.CUSTOM],
      customWords: '', // empty → empty pool
    };
    const deck = await service.buildDeck(settings);
    // Should fallback to GENERAL words
    const genWords = MOCK_WORDS[Language.UA][Category.GENERAL]!;
    expect(deck.some(w => genWords.includes(w))).toBe(true);
  });
});

// ─── buildDeck — with Prisma mock ───────────────────────────────────────────

describe('buildDeck (with Prisma)', () => {
  let service: WordService;

  beforeEach(() => {
    service = new WordService();
  });

  it('uses DB words when available via isDefault filter', async () => {
    const mockPrisma = {
      word: {
        findMany: vi.fn().mockResolvedValue([
          { text: 'DBWord1' },
          { text: 'DBWord2' },
        ]),
      },
      customDeck: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    service.setPrisma(mockPrisma);
    const deck = await service.buildDeck(baseSettings);
    expect(deck).toContain('DBWord1');
    expect(deck).toContain('DBWord2');
    expect(mockPrisma.word.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          pack: expect.objectContaining({ isDefault: true }),
        }),
      }),
    );
  });

  it('falls back to MOCK_WORDS when DB returns empty', async () => {
    const mockPrisma = {
      word: { findMany: vi.fn().mockResolvedValue([]) },
      customDeck: { findUnique: vi.fn().mockResolvedValue(null) },
    } as any;

    service.setPrisma(mockPrisma);
    const deck = await service.buildDeck(baseSettings);
    const expected = MOCK_WORDS[Language.UA][Category.GENERAL]!;
    expect(new Set(deck)).toEqual(new Set(expected));
  });

  it('uses selectedPackIds when provided (ignores isDefault filter)', async () => {
    const mockPrisma = {
      word: { findMany: vi.fn().mockResolvedValue([{ text: 'PackWord' }]) },
      customDeck: { findUnique: vi.fn().mockResolvedValue(null) },
    } as any;

    service.setPrisma(mockPrisma);
    const settings: GameSettings = {
      ...baseSettings,
      selectedPackIds: ['pack-uuid-1'],
    };
    const deck = await service.buildDeck(settings);
    expect(deck).toContain('PackWord');
    expect(mockPrisma.word.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pack: { id: { in: ['pack-uuid-1'] } } },
      }),
    );
  });

  it('uses customDeckCode when it exists and is approved', async () => {
    const mockPrisma = {
      customDeck: {
        findUnique: vi.fn().mockResolvedValue({
          words: ['Secret1', 'Secret2'],
          status: 'approved',
        }),
      },
      word: { findMany: vi.fn() },
    } as any;

    service.setPrisma(mockPrisma);
    const settings: GameSettings = { ...baseSettings, customDeckCode: 'CORP123' };
    const deck = await service.buildDeck(settings);
    expect(deck).toContain('Secret1');
    expect(deck).toContain('Secret2');
    expect(mockPrisma.word.findMany).not.toHaveBeenCalled();
  });

  it('ignores customDeck when status is not approved', async () => {
    const mockPrisma = {
      customDeck: {
        findUnique: vi.fn().mockResolvedValue({ words: ['X'], status: 'pending' }),
      },
      word: { findMany: vi.fn().mockResolvedValue([{ text: 'DBWord' }]) },
    } as any;

    service.setPrisma(mockPrisma);
    const settings: GameSettings = { ...baseSettings, customDeckCode: 'CODE1' };
    const deck = await service.buildDeck(settings);
    expect(deck).not.toContain('X');
    expect(deck).toContain('DBWord');
  });
});

// ─── nextWord ────────────────────────────────────────────────────────────────

describe('nextWord', () => {
  let service: WordService;
  beforeEach(() => { service = new WordService(); });

  it('pops word from existing deck', async () => {
    const { word, deck } = await service.nextWord(['Apple', 'Banana', 'Cherry'], baseSettings);
    expect(word).toBe('Cherry');
    expect(deck).toEqual(['Apple', 'Banana']);
  });

  it('rebuilds deck when empty and returns first word', async () => {
    const { word, deck } = await service.nextWord([], baseSettings);
    const allWords = MOCK_WORDS[Language.UA][Category.GENERAL]!;
    expect(allWords).toContain(word);
    // deck should have N-1 words
    expect(deck.length).toBe(allWords.length - 1);
  });

  it('falls back to emergency words when buildDeck returns empty', async () => {
    vi.spyOn(service, 'buildDeck').mockResolvedValue([]);
    const { word, deckReshuffled } = await service.nextWord([], baseSettings);
    // Should never return the old 'Error' string — use hardcoded emergency fallback instead
    expect(word).not.toBe('Error');
    expect(word.length).toBeGreaterThan(0);
    expect(deckReshuffled).toBe(true);
  });

  it('does not mutate the input deck', async () => {
    const original = ['Apple', 'Banana'];
    const input = [...original];
    await service.nextWord(input, baseSettings);
    expect(input).toEqual(original);
  });
});
