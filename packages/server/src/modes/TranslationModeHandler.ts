import { v4 as uuidv4 } from 'uuid';
import type { GameActionPayload, GameSettings, GameTask } from '@alias/shared';
import type { IGameModeHandler, ActionContext, ActionResult } from './IGameModeHandler';
import { reduceExplainerAction } from './explainerModeActions';

/**
 * Translation mode: words are stored as "Word|Translation" in the deck.
 * The prompt shows the word in the source language; the answer is the translation.
 * Gameplay actions are identical to Classic (explainer-driven CORRECT / SKIP).
 */
export class TranslationModeHandler implements IGameModeHandler {
  generateTask(deck: string[], _settings: GameSettings): GameTask {
    const raw = deck.pop() ?? '';
    const parts = raw.split('|');
    const prompt = parts[0]?.trim() || raw;
    const answer = parts[1]?.trim();
    return { id: uuidv4(), prompt, answer };
  }

  handleAction(
    action: GameActionPayload,
    _currentTask: GameTask,
    _context: ActionContext
  ): ActionResult {
    return reduceExplainerAction(action, { skipEndsTurn: false });
  }
}
