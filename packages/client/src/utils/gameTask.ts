import type { GameTask } from '@alias/shared';
import { GameMode } from '@alias/shared';

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
  if (m === GameMode.TRANSLATION) {
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
  return { id: taskId, prompt: rawWord };
}
