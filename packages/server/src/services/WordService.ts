import { Category, Language, MOCK_WORDS } from '@alias/shared';
import type { GameSettings } from '@alias/shared';

export class WordService {
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  buildDeck(settings: GameSettings): string[] {
    const pool = settings.categories.flatMap((cat) => {
      if (cat === Category.CUSTOM && settings.customWords) {
        return settings.customWords
          .split(',')
          .map((w) => w.trim().replace(/<[^>]*>/g, ''))
          .filter(Boolean);
      }
      return MOCK_WORDS[settings.language][cat] || [];
    });

    const finalPool =
      pool.length > 0
        ? pool
        : MOCK_WORDS[settings.language][Category.GENERAL] || [];

    return this.shuffleArray(finalPool);
  }

  nextWord(deck: string[], settings: GameSettings): { word: string; deck: string[] } {
    let currentDeck = [...deck];
    if (currentDeck.length === 0) {
      currentDeck = this.buildDeck(settings);
    }
    const word = currentDeck.pop() || 'Error';
    return { word, deck: currentDeck };
  }
}
