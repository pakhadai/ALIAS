import type { GameSettings, GameTask } from '@movli/shared';
import {
  Category,
  GameMode,
  decodeWordEntry,
  buildMockTranslationDeckEntries,
  resolveMockTargetLanguage,
} from '@movli/shared';

/** Index-aligned MOCK word pairs for offline / fallback translation decks. */
export function buildOfflineTranslationDeck(general: GameSettings['general']): string[] {
  const targetLang = resolveMockTargetLanguage(general.language, general.targetLanguage);
  if (!targetLang) return [];
  const categories = general.categories.filter((cat) => cat !== Category.CUSTOM);
  return buildMockTranslationDeckEntries(general.language, targetLang, categories);
}

/**
 * Build a GameTask from a raw word for offline (pass-and-play) mode.
 * Mirrors the server-side mode handler logic for client-only games.
 */
export function buildOfflineTask(
  rawWord: string,
  remainingDeck: string[],
  mode: GameMode | undefined,
  taskId: string
): GameTask {
  const m = mode ?? GameMode.CLASSIC;
  const decoded = decodeWordEntry(rawWord);

  if (m === GameMode.TRANSLATION) {
    if (decoded) {
      const task: GameTask = { id: taskId, prompt: decoded.word };
      if (decoded.hint) task.hint = decoded.hint;
      if (decoded.tabooWords?.length) task.tabooWords = decoded.tabooWords;
      return task;
    }
    const parts = rawWord.split('|');
    return {
      id: taskId,
      prompt: parts[0]?.trim() || rawWord,
      answer: parts[1]?.trim(),
    };
  }

  if (m === GameMode.QUIZ) {
    const correct = rawWord;
    const shuffled = [...remainingDeck].sort(() => Math.random() - 0.5);
    const distractors: string[] = [];
    for (const w of shuffled) {
      if (w !== correct && distractors.length < 3) distractors.push(w);
    }
    const options = [correct, ...distractors].sort(() => Math.random() - 0.5);
    return { id: taskId, prompt: correct, answer: correct, options };
  }

  if (decoded) {
    const task: GameTask = { id: taskId, prompt: decoded.word };
    if (decoded.hint) task.hint = decoded.hint;
    if (decoded.tabooWords?.length) task.tabooWords = decoded.tabooWords;
    return task;
  }

  return { id: taskId, prompt: rawWord };
}

/** Whether skip ends the explainer turn in offline hardcore mode. */
export function hardcoreSkipEndsTurn(
  mode: GameMode | undefined,
  hardcoreVariant: 'TABOO' | 'SKIP_ENDS_TURN' | 'MAX' | undefined
): boolean {
  if (mode !== GameMode.HARDCORE) return false;
  return (hardcoreVariant ?? 'SKIP_ENDS_TURN') !== 'TABOO';
}

/** Show taboo chips for hardcore TABOO / MAX variants. */
export function hardcoreShowsTaboo(
  mode: GameMode | undefined,
  hardcoreVariant: 'TABOO' | 'SKIP_ENDS_TURN' | 'MAX' | undefined
): boolean {
  if (mode !== GameMode.HARDCORE) return false;
  const v = hardcoreVariant ?? 'SKIP_ENDS_TURN';
  return v === 'TABOO' || v === 'MAX';
}
