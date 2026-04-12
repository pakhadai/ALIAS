import type { GameActionPayload } from '@alias/shared';
import type { ActionResult } from './IGameModeHandler';

/**
 * Shared explainer-driven flow (Classic, Translation, Synonyms, Hardcore).
 * Hardcore sets `skipEndsTurn` so SKIP ends the round instead of drawing the next word.
 */
export function reduceExplainerAction(
  action: GameActionPayload,
  options: { skipEndsTurn: boolean }
): ActionResult {
  const { skipEndsTurn } = options;
  switch (action.action) {
    case 'CORRECT':
      return { isCorrect: true, points: 1, nextWord: true, endTurn: false };
    case 'SKIP':
      return {
        isCorrect: false,
        points: 0,
        nextWord: !skipEndsTurn,
        endTurn: skipEndsTurn,
      };
    default:
      return { isCorrect: false, points: 0, nextWord: false, endTurn: false };
  }
}
