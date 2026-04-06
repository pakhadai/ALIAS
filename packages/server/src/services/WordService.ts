import { Category, Language, MOCK_WORDS } from '@alias/shared';
// Absolute minimum fallback — shown only if the DB is down AND MOCK_WORDS is empty
const EMERGENCY_WORDS = ['Яблуко', 'Банан', 'Стіл', 'Кіт', 'Вода', 'Сонце', 'Книга', 'Місяць'];
import type { GameSettings } from '@alias/shared';
import type { PrismaClient } from '@prisma/client';
import { randomInt } from 'crypto';

export class WordService {
  private prisma: PrismaClient | null = null;

  setPrisma(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Build a shuffled word deck.
   * Uses settings.selectedPackIds when set (host-selected packs from their account).
   * Falls back to language+category query when no packs are selected.
   */
  async buildDeck(settings: GameSettings): Promise<string[]> {
    const { general } = settings;
    // Handle custom deck from DB (by access code)
    if (general.customDeckCode && this.prisma) {
      const deck = await this.prisma.customDeck.findUnique({
        where: { accessCode: general.customDeckCode },
        select: { words: true, status: true },
      });
      if (deck && deck.status === 'approved' && Array.isArray(deck.words)) {
        return this.shuffleArray(deck.words as string[]);
      }
    }

    // Handle custom words (always from settings, not DB)
    const customWords = general.categories
      .filter((cat) => cat === Category.CUSTOM && general.customWords)
      .flatMap(() =>
        general
          .customWords!.split(',')
          .map((w) => w.trim().replace(/<[^>]*>/g, ''))
          .filter(Boolean)
      );

    const dbCategories = general.categories.filter((cat) => cat !== Category.CUSTOM);

    let dbWords: string[] = [];

    if (this.prisma) {
      const selectedPackIds = general.selectedPackIds;
      const hasPackFilter = selectedPackIds && selectedPackIds.length > 0;

      if (hasPackFilter) {
        // Use only the host's selected packs (ignores language filter — packs already belong to correct language)
        const rows = await this.prisma.word.findMany({
          where: { pack: { id: { in: selectedPackIds } } },
          select: { text: true },
        });
        dbWords = rows.map((r: { text: string }) => r.text);
      } else if (dbCategories.length > 0) {
        // Default: only use isDefault packs (free standard content available to all)
        const rows = await this.prisma.word.findMany({
          where: {
            pack: {
              language: general.language,
              category: { in: dbCategories },
              isDefault: true,
            },
          },
          select: { text: true },
        });
        dbWords = rows.map((r: { text: string }) => r.text);
      }
    }

    // Fallback to static MOCK_WORDS if DB is empty or unavailable
    if (dbWords.length === 0 && dbCategories.length > 0) {
      dbWords = dbCategories.flatMap((cat) => MOCK_WORDS[general.language][cat] || []);
    }

    const pool = [...dbWords, ...customWords];

    // Final fallback chain: settings pool → GENERAL mock words → emergency hardcoded
    const generalFallback: string[] = MOCK_WORDS[general.language]?.[Category.GENERAL] ?? [];
    const finalPool: string[] =
      pool.length > 0 ? pool : generalFallback.length > 0 ? generalFallback : EMERGENCY_WORDS;

    return this.shuffleArray(finalPool);
  }

  async nextWord(
    deck: string[],
    settings: GameSettings,
    usedWords: string[] = []
  ): Promise<{ word: string; deck: string[]; usedWords: string[]; deckReshuffled: boolean }> {
    let currentDeck = [...deck];
    let deckReshuffled = false;
    let trackedUsed = usedWords;

    if (currentDeck.length === 0) {
      deckReshuffled = true;
      const fullDeck = await this.buildDeck(settings);
      const usedSet = new Set(usedWords);
      const remaining = fullDeck.filter((w) => !usedSet.has(w));

      if (remaining.length > 0) {
        // Still have fresh words — use them
        currentDeck = remaining;
      } else {
        // Every word in the pool has been shown — start a new cycle
        currentDeck = fullDeck.length > 0 ? fullDeck : this.shuffleArray([...EMERGENCY_WORDS]);
        trackedUsed = []; // reset tracking for the new cycle
      }
    }

    const word = currentDeck.pop() ?? '';
    return {
      word: word || EMERGENCY_WORDS[0],
      deck: currentDeck,
      usedWords: word ? [...trackedUsed, word] : trackedUsed,
      deckReshuffled,
    };
  }
}
