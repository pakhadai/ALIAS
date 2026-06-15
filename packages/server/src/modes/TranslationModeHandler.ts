import { v4 as uuidv4 } from 'uuid';
import {
  translationTaskFromDeckEntry,
  type GameActionPayload,
  type GameSettings,
  type GameTask,
} from '@movli/shared';
import type {
  IGameModeHandler,
  ActionContext,
  ActionResult,
  GenerateTaskOptions,
} from './IGameModeHandler';
import { reduceExplainerAction } from './explainerModeActions';

/**
 * Translation mode: words are stored as "Word|Translation" in the deck.
 * The prompt shows the word in the source language; the answer is the translation.
 * Gameplay actions are identical to Classic (explainer-driven CORRECT / SKIP).
 */
export class TranslationModeHandler implements IGameModeHandler {
  generateTask(deck: string[], _settings: GameSettings, _options?: GenerateTaskOptions): GameTask {
    const raw = deck.pop() ?? '';
    return translationTaskFromDeckEntry(raw, uuidv4());
  }

  handleAction(
    action: GameActionPayload,
    _currentTask: GameTask,
    _context: ActionContext
  ): ActionResult {
    return reduceExplainerAction(action, { skipEndsTurn: false });
  }
}
