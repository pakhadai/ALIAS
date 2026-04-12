import { v4 as uuidv4 } from 'uuid';
import type { GameActionPayload, GameSettings, GameTask } from '@alias/shared';
import type { IGameModeHandler, ActionContext, ActionResult } from './IGameModeHandler';
import { reduceExplainerAction } from './explainerModeActions';

/** Like classic, but skipping a word ends the explainer's turn (round summary). */
export class HardcoreModeHandler implements IGameModeHandler {
  generateTask(deck: string[], _settings: GameSettings): GameTask {
    const word = deck.pop() ?? '';
    return { id: uuidv4(), prompt: word };
  }

  handleAction(
    action: GameActionPayload,
    _currentTask: GameTask,
    _context: ActionContext
  ): ActionResult {
    return reduceExplainerAction(action, { skipEndsTurn: true });
  }
}
