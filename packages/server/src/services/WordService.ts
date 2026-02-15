import { Category, Language, MOCK_WORDS } from '@alias/shared';
import type { GameSettings } from '@alias/shared';
import type { PrismaClient } from '@prisma/client';

export class WordService {
  private prisma: PrismaClient | null = null;

  setPrisma(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  async buildDeck(settings: GameSettings): Promise<string[]> {
    // Handle custom deck from DB (by access code)
    if (settings.customDeckCode && this.prisma) {
      const deck = await this.prisma.customDeck.findUnique({
        where: { accessCode: settings.customDeckCode },
        select: { words: true, status: true },
      });
      if (deck && deck.status === 'approved' && Array.isArray(deck.words)) {
        return this.shuffleArray(deck.words as string[]);
      }
    }

    // Handle custom words (always from settings, not DB)
    const customWords = settings.categories
      .filter((cat) => cat === Category.CUSTOM && settings.customWords)
      .flatMap(() =>
        settings.customWords!
          .split(',')
          .map((w) => w.trim().replace(/<[^>]*>/g, ''))
          .filter(Boolean),
      );

    const dbCategories = settings.categories.filter((cat) => cat !== Category.CUSTOM);

    let dbWords: string[] = [];

    if (dbCategories.length > 0 && this.prisma) {
      // Query words from WordPacks (new schema)
      const rows = await this.prisma.word.findMany({
        where: {
          pack: {
            language: settings.language,
            category: { in: dbCategories },
          },
        },
        select: { text: true },
      });
      dbWords = rows.map((r) => r.text);
    }

    // Fallback to static MOCK_WORDS if DB is empty or unavailable
    if (dbWords.length === 0 && dbCategories.length > 0) {
      dbWords = dbCategories.flatMap(
        (cat) => MOCK_WORDS[settings.language][cat] || [],
      );
    }

    const pool = [...dbWords, ...customWords];

    // Final fallback
    const finalPool =
      pool.length > 0
        ? pool
        : MOCK_WORDS[settings.language][Category.GENERAL] || [];

    return this.shuffleArray(finalPool);
  }

  async nextWord(
    deck: string[],
    settings: GameSettings,
  ): Promise<{ word: string; deck: string[] }> {
    let currentDeck = [...deck];
    if (currentDeck.length === 0) {
      currentDeck = await this.buildDeck(settings);
    }
    const word = currentDeck.pop() || 'Error';
    return { word, deck: currentDeck };
  }
}
