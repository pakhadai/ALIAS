import { Category, MOCK_WORDS, shuffleArray, encodeWordEntry } from '@movli/shared';
// Absolute minimum fallback — shown only if the DB is down AND MOCK_WORDS is empty
const EMERGENCY_WORDS = ['Яблуко', 'Банан', 'Стіл', 'Кіт', 'Вода', 'Сонце', 'Книга', 'Місяць'];
import type { GameSettings } from '@movli/shared';
import type { PrismaClient } from '@prisma/client';
import { GameMode } from '@movli/shared';

type WordRow = {
  word: string;
  hint?: string | null;
  tabooWords?: string[];
  conceptId?: string;
  synonyms?: string[];
  antonyms?: string[];
};

type CrossLangSourceRow = {
  conceptId: string;
  conceptKey: string | null;
  packCategory: string;
  packSlug: string;
};

const CONCEPT_SELECT = {
  conceptKey: true,
  pack: { select: { category: true, slug: true } },
} as const;

export class WordService {
  private prisma: PrismaClient | null = null;

  setPrisma(prisma: PrismaClient) {
    this.prisma = prisma;
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
        return shuffleArray(deck.words as string[]);
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
      const isQuizMode = settings.mode.gameMode === GameMode.QUIZ;
      const isTranslationMode = settings.mode.gameMode === GameMode.TRANSLATION;

      const rowSelect = isQuizMode
        ? {
            word: true,
            conceptId: true,
            synonyms: true,
            antonyms: true,
            tabooWords: true,
            concept: { select: CONCEPT_SELECT },
          }
        : isTranslationMode
          ? { word: true, conceptId: true, concept: { select: CONCEPT_SELECT } }
          : { word: true, hint: true, tabooWords: true };

      if (hasPackFilter) {
        const rows = await this.prisma.wordTranslation.findMany({
          where: {
            language: general.language,
            concept: { pack: { id: { in: selectedPackIds } } },
          },
          select: rowSelect,
        });
        dbWords = await this.buildDbWordsFromRows(settings, rows as WordRow[]);
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
          select: rowSelect,
        });
        dbWords = await this.buildDbWordsFromRows(settings, rows as WordRow[]);
      }
    }

    // Fallback to static MOCK_WORDS if DB is empty or unavailable
    if (dbWords.length === 0 && dbCategories.length > 0) {
      if (settings.mode.gameMode === GameMode.TRANSLATION) {
        dbWords = this.buildMockTranslationDeck(settings, dbCategories);
      }
      if (dbWords.length === 0) {
        dbWords = dbCategories.flatMap((cat) => MOCK_WORDS[general.language][cat] || []);
      }
    }

    const pool = [...dbWords, ...customWords];

    // Final fallback chain: settings pool → GENERAL mock words → emergency hardcoded
    const generalFallback: string[] = MOCK_WORDS[general.language]?.[Category.GENERAL] ?? [];
    const finalPool: string[] =
      pool.length > 0 ? pool : generalFallback.length > 0 ? generalFallback : EMERGENCY_WORDS;

    return shuffleArray(finalPool);
  }

  private async buildDbWordsFromRows(settings: GameSettings, rows: WordRow[]): Promise<string[]> {
    if (settings.mode.gameMode === GameMode.QUIZ) {
      const quizRows = rows as {
        word: string;
        conceptId: string;
        synonyms: string[];
        antonyms: string[];
        tabooWords: string[];
        concept?: {
          conceptKey: string | null;
          pack: { category: string; slug: string } | null;
        } | null;
      }[];
      const crossLangRows = this.toCrossLangRows(quizRows);
      const translationMap = await this.fetchTargetTranslations(settings, crossLangRows);
      const quizTypes =
        settings.mode.quizTypes ||
        ({ synonyms: true, antonyms: true, taboo: true, translation: false } as const);
      return this.buildQuizEntriesFromRows(quizRows, translationMap, quizTypes);
    }

    if (settings.mode.gameMode === GameMode.TRANSLATION) {
      const crossLangRows = this.toCrossLangRows(rows);
      const sourceWordsByConceptId = new Map<string, string>();
      for (const row of rows) {
        if (row.conceptId && row.word?.trim()) {
          sourceWordsByConceptId.set(row.conceptId, row.word.trim());
        }
      }
      const translationMap = await this.fetchTargetTranslations(settings, crossLangRows);
      return this.buildTranslationEntriesFromRows(
        crossLangRows,
        translationMap,
        sourceWordsByConceptId
      );
    }

    return this.buildClassicEntriesFromRows(rows);
  }

  private toCrossLangRows(
    rows: Array<
      WordRow & {
        concept?: {
          conceptKey: string | null;
          pack: { category: string; slug: string } | null;
        } | null;
      }
    >
  ): CrossLangSourceRow[] {
    return rows
      .map((row) => {
        const conceptId = row.conceptId?.trim();
        const pack = row.concept?.pack;
        if (!conceptId || !pack?.category || !pack.slug) return null;
        return {
          conceptId,
          conceptKey: row.concept?.conceptKey ?? null,
          packCategory: pack.category,
          packSlug: pack.slug,
        };
      })
      .filter((row): row is CrossLangSourceRow => row !== null);
  }

  private deriveTargetPackSlug(sourceSlug: string, targetLang: string): string {
    const idx = sourceSlug.indexOf('-');
    const suffix = idx >= 0 ? sourceSlug.slice(idx + 1) : sourceSlug;
    return `${targetLang.toLowerCase()}-${suffix}`;
  }

  private buildMockTranslationDeck(settings: GameSettings, categories: Category[]): string[] {
    const srcLang = settings.general.language;
    const targetLang = settings.general.targetLanguage;
    if (!targetLang || targetLang === srcLang) return [];

    const entries: string[] = [];
    for (const cat of categories) {
      const srcList = MOCK_WORDS[srcLang]?.[cat] ?? [];
      const tgtList = MOCK_WORDS[targetLang]?.[cat] ?? [];
      const count = Math.min(srcList.length, tgtList.length);
      for (let i = 0; i < count; i++) {
        const source = srcList[i]?.trim();
        const target = tgtList[i]?.trim();
        if (source && target) entries.push(`${source}|${target}`);
      }
    }
    return entries;
  }

  private async fetchTargetTranslations(
    settings: GameSettings,
    rows: CrossLangSourceRow[]
  ): Promise<Map<string, string>> {
    const srcLang = settings.general.language;
    const targetLang = settings.general.targetLanguage;
    const needTranslation =
      !!targetLang &&
      targetLang !== srcLang &&
      (settings.mode.gameMode === GameMode.TRANSLATION ||
        (settings.mode.gameMode === GameMode.QUIZ &&
          settings.mode.quizTypes?.translation !== false));

    const map = new Map<string, string>();
    if (!needTranslation) return map;
    if (!this.prisma) return map;
    if (rows.length === 0) return map;

    const byCategory = new Map<string, CrossLangSourceRow[]>();
    for (const row of rows) {
      const bucket = byCategory.get(row.packCategory) ?? [];
      bucket.push(row);
      byCategory.set(row.packCategory, bucket);
    }

    const prisma = this.prisma;

    for (const [packCategory, categoryRows] of byCategory) {
      const withKey = categoryRows.filter((row) => row.conceptKey);
      if (withKey.length > 0) {
        const conceptKeys = [
          ...new Set(withKey.map((row) => row.conceptKey).filter((key): key is string => !!key)),
        ];
        const targetSlugs = [
          ...new Set(withKey.map((row) => this.deriveTargetPackSlug(row.packSlug, targetLang))),
        ];
        const targetRows = await prisma.wordTranslation.findMany({
          where: {
            language: targetLang,
            concept: {
              conceptKey: { in: conceptKeys },
              pack: {
                language: targetLang,
                category: packCategory,
                slug: targetSlugs.length === 1 ? targetSlugs[0] : { in: targetSlugs },
              },
            },
          },
          select: {
            word: true,
            concept: { select: { conceptKey: true, pack: { select: { slug: true } } } },
          },
        });

        const targetByKeyAndSlug = new Map<string, string>();
        for (const targetRow of targetRows) {
          const key = targetRow.concept.conceptKey;
          const slug = targetRow.concept.pack?.slug;
          if (!key || !slug || !targetRow.word) continue;
          targetByKeyAndSlug.set(`${slug}:${key}`, targetRow.word);
        }

        for (const row of withKey) {
          const targetSlug = this.deriveTargetPackSlug(row.packSlug, targetLang);
          const target = targetByKeyAndSlug.get(`${targetSlug}:${row.conceptKey}`);
          if (target) map.set(row.conceptId, target);
        }
      }

      const withoutKey = categoryRows.filter((row) => !row.conceptKey);
      if (withoutKey.length === 0) continue;

      const sourceOrdered: { conceptId: string }[] = await prisma.wordTranslation.findMany({
        where: {
          language: srcLang,
          concept: { pack: { language: srcLang, category: packCategory } },
        },
        select: { conceptId: true },
        orderBy: { concept: { createdAt: 'asc' } },
      });
      const targetOrdered: { word: string }[] = await prisma.wordTranslation.findMany({
        where: {
          language: targetLang,
          concept: { pack: { language: targetLang, category: packCategory } },
        },
        select: { word: true },
        orderBy: { concept: { createdAt: 'asc' } },
      });

      const sourceIndexByConceptId = new Map<string, number>(
        sourceOrdered.map((entry, index) => [entry.conceptId, index])
      );
      for (const row of withoutKey) {
        const index = sourceIndexByConceptId.get(row.conceptId);
        if (index === undefined) continue;
        const target = targetOrdered[index]?.word?.trim();
        if (target) map.set(row.conceptId, target);
      }
    }

    return map;
  }

  private buildTranslationEntriesFromRows(
    rows: CrossLangSourceRow[],
    targetByConceptId: Map<string, string>,
    sourceWordsByConceptId: Map<string, string>
  ): string[] {
    const entries: string[] = [];
    for (const row of rows) {
      const word = sourceWordsByConceptId.get(row.conceptId)?.trim();
      if (!word) continue;
      const target = targetByConceptId.get(row.conceptId)?.trim();
      if (!target) continue;
      entries.push(`${word}|${target}`);
    }
    return entries;
  }

  private buildClassicEntriesFromRows(rows: WordRow[]): string[] {
    return rows
      .map((r) => {
        const word = (r.word ?? '').trim();
        if (!word) return '';
        const hint = r.hint?.trim() || undefined;
        const taboos = (r.tabooWords ?? []).map((s) => s.trim()).filter(Boolean);
        if (!hint && taboos.length === 0) return word;
        return encodeWordEntry({ word, hint, tabooWords: taboos });
      })
      .filter(Boolean);
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
        for (const s of shuffleArray(syns).slice(0, 2)) {
          synonymEntries.push(buildEncoded({ kind: 'SYNONYM', prompt: word, answer: s }));
        }
      }
      if (quizTypes.antonyms) {
        for (const a of shuffleArray(ants).slice(0, 2)) {
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

    return shuffleArray([
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
        currentDeck = fullDeck.length > 0 ? fullDeck : shuffleArray([...EMERGENCY_WORDS]);
        trackedUsed = []; // reset tracking for the new cycle
      }
    }

    const word = currentDeck.pop() ?? '';
    const emergencyWord = EMERGENCY_WORDS[0] ?? 'MOVLI';
    return {
      word: word || emergencyWord,
      deck: currentDeck,
      usedWords: word ? [...trackedUsed, word] : trackedUsed,
      deckReshuffled,
    };
  }
}
