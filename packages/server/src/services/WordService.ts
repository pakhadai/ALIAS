import { Category, MOCK_WORDS } from '@alias/shared';
// Absolute minimum fallback — shown only if the DB is down AND MOCK_WORDS is empty
const EMERGENCY_WORDS = ['Яблуко', 'Банан', 'Стіл', 'Кіт', 'Вода', 'Сонце', 'Книга', 'Місяць'];
import type { GameSettings } from '@alias/shared';
import type { PrismaClient } from '@prisma/client';
import { randomInt } from 'crypto';
import { GameMode } from '@alias/shared';

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
        const rows = await this.prisma.wordTranslation.findMany({
          where: {
            language: general.language,
            concept: { pack: { id: { in: selectedPackIds } } },
          },
          select:
            settings.mode.gameMode === GameMode.QUIZ
              ? { word: true, conceptId: true, synonyms: true, antonyms: true, tabooWords: true }
              : { word: true },
        });
        if (settings.mode.gameMode === GameMode.QUIZ) {
          const quizRows = rows as unknown as {
            word: string;
            conceptId: string;
            synonyms: string[];
            antonyms: string[];
            tabooWords: string[];
          }[];
          const translationMap = await this.fetchTargetTranslations(settings, quizRows);
          const quizTypes =
            (settings.mode.gameMode === GameMode.QUIZ && settings.mode.quizTypes) ||
            ({ synonyms: true, antonyms: true, taboo: true, translation: false } as const);
          dbWords = this.buildQuizEntriesFromRows(quizRows, translationMap, quizTypes);
        } else {
          dbWords = (rows as unknown as { word: string }[]).map((r) => r.word);
        }
      } else if (dbCategories.length > 0) {
        const rows = await this.prisma.wordTranslation.findMany({
          where: {
            language: general.language,
            concept: {
              pack: {
                language: general.language,
                category: { in: dbCategories },
                isDefault: true,
              },
            },
          },
          select:
            settings.mode.gameMode === GameMode.QUIZ
              ? { word: true, conceptId: true, synonyms: true, antonyms: true, tabooWords: true }
              : { word: true },
        });
        if (settings.mode.gameMode === GameMode.QUIZ) {
          const quizRows = rows as unknown as {
            word: string;
            conceptId: string;
            synonyms: string[];
            antonyms: string[];
            tabooWords: string[];
          }[];
          const translationMap = await this.fetchTargetTranslations(settings, quizRows);
          const quizTypes =
            (settings.mode.gameMode === GameMode.QUIZ && settings.mode.quizTypes) ||
            ({ synonyms: true, antonyms: true, taboo: true, translation: false } as const);
          dbWords = this.buildQuizEntriesFromRows(quizRows, translationMap, quizTypes);
        } else {
          dbWords = (rows as unknown as { word: string }[]).map((r) => r.word);
        }
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

  private async fetchTargetTranslations(
    settings: GameSettings,
    rows: { conceptId: string }[]
  ): Promise<Map<string, string>> {
    const srcLang = settings.general.language;
    const targetLang = settings.general.targetLanguage;
    const needTranslation =
      settings.mode.gameMode === GameMode.QUIZ &&
      settings.mode.quizTypes?.translation !== false &&
      !!targetLang &&
      targetLang !== srcLang;

    const map = new Map<string, string>();
    if (!needTranslation) return map;
    if (!this.prisma) return map;

    const conceptIds = [...new Set(rows.map((r) => r.conceptId).filter(Boolean))];
    if (conceptIds.length === 0) return map;

    const targetRows = await this.prisma.wordTranslation.findMany({
      where: { conceptId: { in: conceptIds }, language: targetLang },
      select: { conceptId: true, word: true },
    });
    for (const r of targetRows) {
      if (r.conceptId && r.word) map.set(r.conceptId, r.word);
    }
    return map;
  }

  private buildQuizEntriesFromRows(
    rows: {
      word: string;
      conceptId: string;
      synonyms: string[];
      antonyms: string[];
      tabooWords: string[];
    }[],
    targetByConceptId: Map<string, string>,
    quizTypes: { synonyms: boolean; antonyms: boolean; taboo: boolean; translation: boolean }
  ): string[] {
    const buildEncoded = (payload: { kind: string; prompt: string; answer: string }) =>
      JSON.stringify({ v: 1, ...payload });

    const basicEntries: string[] = [];
    const synonymEntries: string[] = [];
    const antonymEntries: string[] = [];
    const tabooEntries: string[] = [];
    const translationEntries: string[] = [];

    for (const r of rows) {
      const word = (r.word ?? '').trim();
      if (!word) continue;

      // Always include a BASIC fallback task (word == answer) so the deck never becomes empty
      basicEntries.push(buildEncoded({ kind: 'BASIC', prompt: word, answer: word }));

      const syns = (r.synonyms ?? []).map((s) => s.trim()).filter(Boolean);
      const ants = (r.antonyms ?? []).map((s) => s.trim()).filter(Boolean);
      const taboos = (r.tabooWords ?? []).map((s) => s.trim()).filter(Boolean);

      // Keep deck size reasonable: max 2 synonym/antonym tasks per word.
      if (quizTypes.synonyms) {
        for (const s of this.shuffleArray(syns).slice(0, 2)) {
          synonymEntries.push(buildEncoded({ kind: 'SYNONYM', prompt: word, answer: s }));
        }
      }
      if (quizTypes.antonyms) {
        for (const a of this.shuffleArray(ants).slice(0, 2)) {
          antonymEntries.push(buildEncoded({ kind: 'ANTONYM', prompt: word, answer: a }));
        }
      }

      if (quizTypes.taboo && taboos.length >= 3) {
        const hints = taboos.slice(0, 6).join(', ');
        tabooEntries.push(buildEncoded({ kind: 'TABOO', prompt: hints, answer: word }));
      }

      const target = targetByConceptId.get(r.conceptId);
      if (quizTypes.translation && target) {
        translationEntries.push(
          buildEncoded({ kind: 'TRANSLATION', prompt: word, answer: target })
        );
      }
    }

    return this.shuffleArray([
      ...synonymEntries,
      ...antonymEntries,
      ...tabooEntries,
      ...translationEntries,
      ...basicEntries,
    ]);
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
